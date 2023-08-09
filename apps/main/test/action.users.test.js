const {
  describe, expect, test,
} = require('@jest/globals');

const config = require('config');
const userLoader = require('./data/loadUser');
const Action = require('../src/controller/actions/users');
const Encryption = require('../src/lib/encryption');

describe('User Action tests', () => {
  describe('.createUser', () => {
    test('Correct data creates a user', () => {
      const {
        username: at,
        key,
        signature,
        hash,
        searchTerms,
        size,
      } = userLoader(1);

      const mockDB = {
        users: {
          findByName: (userAt) => {
            expect(userAt).toBe(at);
            return Promise.resolve(null);
          },
          getNew: () => ({
            save() {
              expect(this.username).toBe(at);
              expect(this.key).toBe(key);
              expect(this.signature).toBe(signature);
              expect(this.hash).toBe(hash);
              expect(this.searchTerms).toStrictEqual(searchTerms);
              expect(this.size).toBe(size);
              expect(this.lastActivity).toBeLessThan(0);

              this.id = 1;
              mockDB.users.findByName = (userAt) => {
                expect(userAt).toBe(at);
                return Promise.resolve(this);
              };
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {
              expect(this.userId).toBe(1);
            },
          }),
        },
        freezer: {
          findByName: (userAt) => {
            expect(userAt).toBe(at);
            return Promise.resolve(null);
          },
        },
      };

      Action.createUser(mockDB, {
        at, key, signature, hash,
      });
    });
    test('Bad username format throws', () => {
      const {
        key,
        signature,
        hash,
      } = userLoader(1);
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve(null)),
          getNew: () => ({
            save() {
              mockDB.users.findByName = () => (Promise.resolve(this));
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {},
          }),
        },
        freezer: {
          findByName: () => (Promise.resolve(null)),
        },
      };
      expect(Action.createUser(mockDB, {
        at: '@rep sup', key, signature, hash,
      })).rejects.toThrow('@ name should not have any special character');
    });
    test('Invalid key format throws', () => {
      const {
        username: at,
        signature,
        hash,
      } = userLoader(1);
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve(null)),
          getNew: () => ({
            save() {
              mockDB.users.findByName = () => (Promise.resolve(this));
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {},
          }),
        },
        freezer: {
          findByName: () => (Promise.resolve(null)),
        },
      };
      expect(Action.createUser(mockDB, {
        at, signature, key: 'badkey', hash,
      })).rejects.toThrow('Wrong public key format');
    });
    test('Invalid signature format throws', () => {
      const {
        username: at,
        key,
        hash,
      } = userLoader(1);
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve(null)),
          getNew: () => ({
            save() {
              mockDB.users.findByName = () => (Promise.resolve(this));
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {},
          }),
        },
        freezer: {
          findByName: () => (Promise.resolve(null)),
        },
      };
      expect(Action.createUser(mockDB, {
        at,
        key,
        signature: 'badkey',
        hash,
      })).rejects.toThrow('Wrong public key format');
    });
    test('User already exists throws', () => {
      const {
        username: at,
        key,
        signature,
        hash,
      } = userLoader(1);
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve({ id: 1 })),
          getNew: () => ({
            save() {
              mockDB.users.findByName = () => (Promise.resolve(this));
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {},
          }),
        },
        freezer: {
          findByName: () => (Promise.resolve(null)),
        },
      };
      expect(Action.createUser(mockDB, {
        at, key, signature, hash,
      })).rejects.toThrow('@ name already taken');
    });
    test('Username is frozen throws', () => {
      const {
        username: at,
        key,
        signature,
        hash,
      } = userLoader(1);
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve(null)),
          getNew: () => ({
            save() {
              mockDB.users.findByName = () => (Promise.resolve(this));
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {},
          }),
        },
        freezer: {
          findByName: () => (Promise.resolve({ username: at })),
        },
      };
      expect(Action.createUser(mockDB, {
        at, key, signature, hash,
      })).rejects.toThrow('@ name already taken');
    });
    test('Invalid signed hash throws', () => {
      const {
        username: at,
        key,
        signature,
      } = userLoader(1);

      const mockDB = {
        users: {
          findByName: (userAt) => {
            expect(userAt).toBe(at);
            return Promise.resolve(null);
          },
        },
        freezer: {
          findByName: (userAt) => {
            expect(userAt).toBe(at);
            return Promise.resolve(null);
          },
        },
      };

      expect(Action.createUser(mockDB, {
        at, key, signature, hash: Buffer.from('bad key').toString('base64'),
      })).rejects.toThrow('Wrong hash format');
    });
    test('First message failure throws and cancel user creation', () => {
      const {
        username: at,
        key,
        signature,
        hash,
        searchTerms,
        size,
      } = userLoader(1);

      const mockDB = {
        users: {
          findByName: (userAt) => {
            expect(userAt).toBe(at);
            return Promise.resolve(null);
          },
          getNew: () => ({
            save() {
              expect(this.username).toBe(at);
              expect(this.key).toBe(key);
              expect(this.signature).toBe(signature);
              expect(this.hash).toBe(hash);
              expect(this.searchTerms).toStrictEqual(searchTerms);
              expect(this.size).toBe(size);
              expect(this.lastActivity).toBeLessThan(0);

              this.id = 1;
              mockDB.users.findByName = (userAt) => {
                expect(userAt).toBe(at);
                return Promise.resolve(this);
              };
            },
          }),
        },
        messages: {
          getNew: () => ({
            save() {
              throw new Error('Encryption error');
            },
          }),
        },
        freezer: {
          findByName: (userAt) => {
            expect(userAt).toBe(at);
            return Promise.resolve(null);
          },
        },
        clearUserAccount: ({ userId, username }, freeze) => {
          expect(userId).toBe(1);
          expect(username).toBe(at);
          expect(freeze).toBeFalsy();
        },
      };

      expect(Action.createUser(mockDB, {
        at, key, signature, hash,
      })).rejects.toThrow('Encryption issue');
    });
  });
  describe('.getCredentials', () => {
    test('Correct data returns encrypted credentials', async () => {
      const time = Date.now();
      const spyEncryptHybrid = jest.spyOn(Encryption, 'hybrid');
      const user = userLoader(1);
      const { username: at } = user;
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve(user)),
        },
      };

      const {
        token, passphrase, iv, vault,
      } = await Action.getCredentials(mockDB, { at });
      expect(spyEncryptHybrid).toHaveBeenCalled();
      const [[authTxt, pk]] = spyEncryptHybrid.mock.calls;

      const {
        connection,
        config: authConfig,
        user: authUser,
        token: jwtToken,
        contacts,
      } = JSON.parse(authTxt);

      expect(connection).toBeGreaterThanOrEqual(time);
      expect(authConfig).toEqual({
        sessionTime: config.get('timer.removal.session'),
        pollingTime: config.get('timer.interval.poll'),
      });
      expect(authUser).toEqual({
        id: user.id,
        username: at,
      });
      expect(jwtToken).toHaveLength(259);
      const tokenParts = jwtToken.split('.');
      expect(tokenParts).toHaveLength(3);
      expect(pk).toBe(user.key);

      expect(contacts.passphrase).toHaveLength(684);
      expect(Buffer.from(contacts.passphrase, 'base64').toString('base64')).toBe(contacts.passphrase);
      expect(contacts.iv).toHaveLength(24);
      expect(Buffer.from(contacts.iv, 'base64').toString('base64')).toBe(contacts.iv);
      expect(contacts.token).toHaveLength(624);
      expect(Buffer.from(contacts.token, 'base64').toString('base64')).toBe(contacts.token);

      expect(vault.passphrase).toBeUndefined();
      expect(vault.iv).toHaveLength(24);
      expect(Buffer.from(vault.iv, 'base64').toString('base64')).toBe(vault.iv);
      expect(vault.token).toHaveLength(5552);
      expect(Buffer.from(vault.token, 'base64').toString('base64')).toBe(vault.token);

      expect(passphrase).toHaveLength(684);
      expect(Buffer.from(passphrase, 'base64').toString('base64')).toBe(passphrase);
      expect(iv).toHaveLength(24);
      expect(Buffer.from(iv, 'base64').toString('base64')).toBe(iv);
      expect(token).toHaveLength(2376);
      expect(Buffer.from(token, 'base64').toString('base64')).toBe(token);
    });
    test('Unknown user throws', async () => {
      const { username: at } = userLoader(1);
      const mockDB = {
        users: {
          findByName: () => (Promise.resolve(null)),
        },
      };
      expect(Action.getCredentials(mockDB, { at })).rejects.toThrow('Unknown user');
    });
  });
  describe('.getUsers', () => {
    test('Search return results', async () => {
      const mockDB = {
        users: {
          searchUsername: (search) => {
            expect(search.toUpperCase()).toBe(search);
            return Promise.resolve([
              {
                username: 'user1', key: 'blablabla', id: 1, signature: 'blablabla', vault: 'wrong',
              },
              {
                username: 'user2', key: 'blablabla', id: 2, signature: 'blablabla', vault: 'wrong',
              },
              {
                username: 'user3', key: 'blablabla', id: 3, signature: 'blablabla', vault: 'wrong',
              },
              {
                username: 'user4', key: 'blablabla', id: 4, signature: 'blablabla', vault: 'wrong',
              },
            ]);
          },
        },
      };
      const results = await Action.getUsers(mockDB, { search: 'use' });
      expect(results).toHaveLength(4);
      const [user1, user2, user3, user4] = results;
      expect(user1).toEqual({
        at: 'user1', id: 1, key: 'blablabla', signature: 'blablabla',
      });
      expect(user2).toEqual({
        at: 'user2', id: 2, key: 'blablabla', signature: 'blablabla',
      });
      expect(user3).toEqual({
        at: 'user3', id: 3, key: 'blablabla', signature: 'blablabla',
      });
      expect(user4).toEqual({
        at: 'user4', id: 4, key: 'blablabla', signature: 'blablabla',
      });
    });
    test('Search return no result', async () => {
      const mockDB = {
        users: {
          searchUsername: (search) => {
            expect(search.toUpperCase()).toBe(search);
            return Promise.resolve([]);
          },
        },
      };
      const results = await Action.getUsers(mockDB, { search: 'use' });
      expect(results).toHaveLength(0);
    });
  });
  describe('.getUserById', () => {
    test('Correct id returns user', async () => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({
              id: userId, username: 'bar', key: 'blabla', signature: 'blabla', vault: 'blabla',
            });
          },
        },
      };

      const result = await Action.getUserById(mockDB, userId);
      expect(result).toEqual({
        id: userId, at: 'bar', key: 'blabla', signature: 'blabla',
      });
    });
    test('Unknwon user throws', async () => {
      const mockDB = {
        users: {
          findByID: () => Promise.resolve(null),
        },
      };

      expect(Action.getUserById(mockDB, 1)).rejects.toThrow('@ unknown');
    });
  });
  describe('.getUserByName', () => {
    test('Correct name returns user', async () => {
      const name = 'user1';
      const mockDB = {
        users: {
          findByName: (at) => {
            expect(at).toBe(name);
            return Promise.resolve({
              id: 1, username: at, key: 'blabla', signature: 'blabla', vault: 'blabla',
            });
          },
        },
      };

      const result = await Action.getUserByName(mockDB, name);
      expect(result).toEqual({
        id: 1, at: name, key: 'blabla', signature: 'blabla',
      });
    });
    test('Unknwon user throws', async () => {
      const mockDB = {
        users: {
          findByName: () => Promise.resolve(null),
        },
      };

      expect(Action.getUserByName(mockDB, 'test')).rejects.toThrow('@ unknown');
    });
  });
  describe('.removeUser', () => {
    test('User asks for account deletion, it works', async () => {
      const userId = 1;
      const account = {
        id: userId,
        username: 'bar',
      };
      const mockDB = {
        clearUserAccount: ({ userId: givenId, username: givenAt }) => {
          expect(givenId).toBe(userId);
          expect(givenAt).toBe('bar');
          return Promise.resolve();
        },
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({ id: userId, username: 'bar' });
          },
        },
      };

      await Action.removeUser(mockDB, userId, account);
    });
    test('Asking user is different from account, it throws', async () => {
      const userId = 1;
      const account = {
        id: 2,
        username: 'bar',
      };

      const mockDB = {
        clearUserAccount: () => Promise.resolve(),
        users: {
          findByID: () => Promise.resolve(account),
        },
      };

      expect(Action.removeUser(mockDB, userId, account)).rejects.toThrow('You cannot access this account');
    });
    test('Unknown user pass', async () => {
      const userId = 1;
      const account = {
        id: userId,
        username: 'bar',
      };
      const mockDB = {
        clearUserAccount: () => {
          throw new Error('shouldnt be called');
        },
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve(null);
          },
        },
      };

      await Action.removeUser(mockDB, userId, account);
    });
  });

  describe('.setVaultItem', () => {
    test('Correct data adds a vault item to the user', () => {});
    test('Invalid data throws', () => {});
  });
  describe('.removeVaultItem', () => {
    test('Correct data removes the vault item from the user', () => {});
  });
  describe('.setContacts', () => {
    test('Correct data adds contacts to the user', () => {});
    test('Invalid data throws', () => {});
  });
});
