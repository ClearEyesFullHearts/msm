const {
  describe, expect, test, afterEach,
} = require('@jest/globals');

const config = require('config');
const userLoader = require('./data/loadUser');
const Action = require('../src/controller/actions/messages');
const Encryption = require('../src/lib/encryption');

describe('Message Action tests', () => {
  afterEach(() => {
    // restore the spy created with spyOn
    jest.restoreAllMocks();
  });
  describe('.getInbox', () => {
    test('Returns the headers', async () => {
      const user = {
        id: 1,
      };
      const dbChallenge = {
        iv: 'blala',
        passphrase: 'blala',
        token: 'blala',
        _id: 'blala',
      };
      const mockDB = {
        messages: {
          getUserMessages: (userId) => {
            expect(userId).toBe(user.id);
            const mails = [
              { id: 3, header: dbChallenge },
              { id: 2, header: dbChallenge },
              { id: 1, header: dbChallenge },
              { id: 0, header: dbChallenge },
            ];
            return Promise.resolve(mails);
          },
        },
      };

      const results = await Action.getInbox(mockDB, user);
      const {
        _id,
        ...challenge
      } = dbChallenge;
      expect(results).toEqual([
        { id: 3, challenge },
        { id: 2, challenge },
        { id: 1, challenge },
        { id: 0, challenge },
      ]);
    });
    test('No messages returns empty array', async () => {
      const user = {
        id: 1,
      };
      const mockDB = {
        messages: {
          getUserMessages: (userId) => {
            expect(userId).toBe(user.id);
            return Promise.resolve(null);
          },
        },
      };

      const results = await Action.getInbox(mockDB, user);
      expect(results).toEqual([]);
    });
  });
  describe('.writeMessage', () => {
    test('Correct data writes a message', async () => {
      const msgSender = userLoader(1);
      const msgTarget = userLoader(2);
      const {
        username: at,
      } = msgTarget;
      const msg = {
        to: at,
        title: Buffer.from('small charabia').toString('base64'),
        content: Buffer.from('big charabia').toString('base64'),
      };
      const spyEncryptHybrid = jest.spyOn(Encryption, 'hybrid');
      let saveMessage = false;
      const mockDB = {
        users: {
          findByName: (target) => {
            expect(target).toBe(at);
            return Promise.resolve(msgTarget);
          },
        },
        messages: {
          getNew: () => ({
            save() {
              expect(this.userId).toBe(2);
              expect(this.hasBeenRead).toBeFalsy();
              expect(this.header).toEqual(expect.objectContaining({
                token: expect.any(String),
                passphrase: expect.any(String),
                iv: expect.any(String),
              }));
              expect(this.full).toEqual(expect.objectContaining({
                token: expect.any(String),
                passphrase: expect.any(String),
                iv: expect.any(String),
              }));
              saveMessage = true;
              return Promise.resolve();
            },
          }),
        },
      };

      await Action.writeMessage(mockDB, msg, msgSender);
      expect(saveMessage).toBeTruthy();

      expect(spyEncryptHybrid).toHaveBeenCalledTimes(2);
      const [
        [headTxt],
        [fullTxt],
      ] = spyEncryptHybrid.mock.calls;
      const headObj = JSON.parse(headTxt);
      const fullObj = JSON.parse(fullTxt);

      expect(headObj).toEqual({
        from: `@${msgSender.username}`,
        sentAt: expect.any(Number),
        title: msg.title,
      });
      expect(fullObj).toEqual({
        from: `@${msgSender.username}`,
        sentAt: expect.any(Number),
        title: msg.title,
        content: msg.content,
      });
    });
    test('Inactive sender throws', async () => {
      const msgSender = userLoader(1);
      const msg = {
        to: 'user2',
        title: Buffer.from('small charabia').toString('base64'),
        content: Buffer.from('big charabia').toString('base64'),
      };
      const spyEncryptHybrid = jest.spyOn(Encryption, 'hybrid');

      msgSender.lastActivity = -msgSender.lastActivity;
      let saveMessage = false;
      const mockDB = {
        users: {
          findByName: () => Promise.resolve({ id: 2, key: 'blabla', lastActivity: 1 }),
        },
        messages: {
          getNew: () => ({
            save() {
              saveMessage = true;
              return Promise.resolve();
            },
          }),
        },
      };

      expect(Action.writeMessage(mockDB, msg, msgSender)).rejects.toThrow('Sender account is not activated (open the welcoming email)');
      expect(spyEncryptHybrid).not.toHaveBeenCalled();
      expect(saveMessage).toBeFalsy();
    });
    test('Inactive target throws', async () => {
      const msgSender = userLoader(1);
      const msg = {
        to: 'user2',
        title: Buffer.from('small charabia').toString('base64'),
        content: Buffer.from('big charabia').toString('base64'),
      };
      const spyEncryptHybrid = jest.spyOn(Encryption, 'hybrid');
      let saveMessage = false;

      const mockDB = {
        users: {
          findByName: () => Promise.resolve({ id: 2, key: 'blabla', lastActivity: -1 }),
        },
        messages: {
          getNew: () => ({
            save() {
              saveMessage = true;
              return Promise.resolve();
            },
          }),
        },
      };

      expect(Action.writeMessage(mockDB, msg, msgSender)).rejects.toThrow('target @ not found');
      expect(spyEncryptHybrid).not.toHaveBeenCalled();
      expect(saveMessage).toBeFalsy();
    });
    test('Unknown target throws', async () => {
      const msgSender = userLoader(1);
      const msg = {
        to: 'user2',
        title: Buffer.from('small charabia').toString('base64'),
        content: Buffer.from('big charabia').toString('base64'),
      };
      const spyEncryptHybrid = jest.spyOn(Encryption, 'hybrid');
      let saveMessage = false;

      const mockDB = {
        users: {
          findByName: () => Promise.resolve(null),
        },
        messages: {
          getNew: () => ({
            save() {
              saveMessage = true;
              return Promise.resolve();
            },
          }),
        },
      };

      expect(Action.writeMessage(mockDB, msg, msgSender)).rejects.toThrow('target @ not found');
      expect(spyEncryptHybrid).not.toHaveBeenCalled();
      expect(saveMessage).toBeFalsy();
    });
    test('Overcome inactive target limitation', async () => {
      const msgSender = userLoader(1);
      const msgTarget = userLoader(2);
      const {
        username: at,
      } = msgTarget;
      const msg = {
        to: at,
        title: Buffer.from('small charabia').toString('base64'),
        content: Buffer.from('big charabia').toString('base64'),
      };
      const spyEncryptHybrid = jest.spyOn(Encryption, 'hybrid');
      let saveMessage = false;

      const mockDB = {
        users: {
          findByName: (target) => {
            expect(target).toBe(at);

            msgTarget.lastActivity = -msgTarget.lastActivity;
            return Promise.resolve(msgTarget);
          },
        },
        messages: {
          getNew: () => ({
            save() {
              expect(this.userId).toBe(2);
              expect(this.hasBeenRead).toBeFalsy();
              expect(this.header).toEqual(expect.objectContaining({
                token: expect.any(String),
                passphrase: expect.any(String),
                iv: expect.any(String),
              }));
              expect(this.full).toEqual(expect.objectContaining({
                token: expect.any(String),
                passphrase: expect.any(String),
                iv: expect.any(String),
              }));
              saveMessage = true;
              return Promise.resolve();
            },
          }),
        },
      };

      await Action.writeMessage(mockDB, msg, msgSender, false);

      expect(spyEncryptHybrid).toHaveBeenCalledTimes(2);
      expect(saveMessage).toBeTruthy();
    });
  });
  describe('.getMessage', () => {
    test('Correct data returns a message', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;
      let userSaved = false;
      let msgSaved = false;

      const mockDB = {
        users: {
          findByID: (reader) => {
            expect(reader).toBe(user.id);
            return Promise.resolve({
              lastActivity: 2,
              save() {
                expect(this.lastActivity).toBe(Math.floor(Date.now() / (15 * 60000)) * (15 * 60000));
                userSaved = true;
                return Promise.resolve();
              },
            });
          },
        },
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve({
              id: 1,
              userId: 1,
              hasBeenRead: false,
              header: 'wrong',
              full: {
                token: 'right',
                passphrase: 'ok',
                iv: 'fine',
                _id: 'wrong',
              },
              save() {
                expect(this.hasBeenRead).toBeTruthy();
                msgSaved = true;
                return Promise.resolve();
              },
            });
          },
        },
      };

      const { id, challenge } = await Action.getMessage(mockDB, msgId, user);
      expect(id).toBe(msgId);
      expect(challenge).toEqual({
        token: 'right',
        passphrase: 'ok',
        iv: 'fine',
      });
      expect(userSaved).toBeTruthy();
      expect(msgSaved).toBeTruthy();
    });
    test('Message unknown throws', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;

      const mockDB = {
        users: {
          findByID: (reader) => {
            expect(reader).toBe(user.id);
            return Promise.resolve({
              lastActivity: 2,
              save() {
                return Promise.resolve();
              },
            });
          },
        },
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve(null);
          },
        },
      };

      expect(Action.getMessage(mockDB, msgId, user)).rejects.toThrow('Message not found');
    });
    test('Message from another user throws', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;

      const mockDB = {
        users: {
          findByID: (reader) => {
            expect(reader).toBe(user.id);
            return Promise.resolve({
              lastActivity: 2,
              save() {
                return Promise.resolve();
              },
            });
          },
        },
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve({
              id: 1,
              userId: 2,
              hasBeenRead: false,
              header: 'wrong',
              full: 'right',
              save() {
                return Promise.resolve();
              },
            });
          },
        },
      };
      expect(Action.getMessage(mockDB, msgId, user)).rejects.toThrow('You cannot access this message');
    });
    test('Unknown user throws', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;

      const mockDB = {
        users: {
          findByID: (reader) => {
            expect(reader).toBe(user.id);
            return Promise.resolve(null);
          },
        },
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve(null);
          },
        },
      };

      expect(Action.getMessage(mockDB, msgId, user)).rejects.toThrow('User not found');
    });
  });
  describe('.removeMessage', () => {
    test('Correct data deletes a message', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;
      let msgDeleted = false;

      const mockDB = {
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve({ id: msgId, userId: user.id });
          },
          deleteID: (id) => {
            expect(id).toBe(msgId);
            msgDeleted = true;
            return Promise.resolve(null);
          },
        },
      };
      await Action.removeMessage(mockDB, msgId, user);
      expect(msgDeleted).toBeTruthy();
    });
    test('Message unknown pass', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;
      let msgDeleted = false;

      const mockDB = {
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve(null);
          },
          deleteID: (id) => {
            expect(id).toBe(msgId);
            msgDeleted = true;
            return Promise.resolve(null);
          },
        },
      };
      await Action.removeMessage(mockDB, msgId, user);
      expect(msgDeleted).toBeFalsy();
    });
    test('Message from another user throws', async () => {
      const user = {
        id: 1,
      };
      const msgId = 1;
      let msgDeleted = false;

      const mockDB = {
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            return Promise.resolve({ id: msgId, userId: 2 });
          },
          deleteID: (id) => {
            expect(id).toBe(msgId);
            msgDeleted = true;
            return Promise.resolve(null);
          },
        },
      };
      expect(Action.removeMessage(mockDB, msgId, user)).rejects.toThrow('You cannot access this message');
      expect(msgDeleted).toBeFalsy();
    });
  });
  describe('.autoMessageRemoval', () => {
    test('Read message is removed after interval set in config', async () => {
      const start = Date.now();
      const msgId = 1;
      let msgDeleted = false;

      const mockDB = {
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            const timer = Date.now() - start;
            expect(timer).toBeGreaterThanOrEqual(config.get('timer.removal.message'));
            return Promise.resolve({ id: msgId });
          },
          deleteID: (id) => {
            expect(id).toBe(msgId);
            msgDeleted = true;
            return Promise.resolve(null);
          },
        },
      };
      await Action.autoMessageRemoval(mockDB, msgId);
      expect(msgDeleted).toBeTruthy();
    });
    test('Unknwon message pass', async () => {
      const start = Date.now();
      const msgId = 1;
      let msgDeleted = false;

      const mockDB = {
        messages: {
          findByID: (id) => {
            expect(id).toBe(msgId);
            const timer = Date.now() - start;
            expect(timer).toBeGreaterThanOrEqual(config.get('timer.removal.message'));
            return Promise.resolve(null);
          },
          deleteID: (id) => {
            expect(id).toBe(msgId);
            msgDeleted = true;
            return Promise.resolve(null);
          },
        },
      };
      await Action.autoMessageRemoval(mockDB, msgId);
      expect(msgDeleted).toBeFalsy();
    });
  });
});
