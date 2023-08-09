const {
  describe, expect, test, beforeEach,
} = require('@jest/globals');
const config = require('config');
const Validator = require('@shared/validator');
const Action = require('../src/controller/actions/async');

jest.mock('@shared/validator');

describe('Async Action tests', () => {
  describe('.autoUserRemoval', () => {
    test('Inactive account is removed after interval set in config', async () => {
      const start = Date.now();
      const userId = 1789;
      const mockDB = {
        clearUserAccount: ({ userId: givenId, username: givenAt }) => {
          expect(givenId).toBe(userId);
          expect(givenAt).toBe('bar');
          return Promise.resolve();
        },
        users: {
          findByID: (id) => {
            const timer = Date.now() - start;
            expect(timer).toBeGreaterThanOrEqual(config.get('timer.removal.user'));
            expect(id).toBe(userId);
            return Promise.resolve({ id: userId, username: 'bar', lastActivity: -start });
          },
        },
      };

      await Action.autoUserRemoval(mockDB, userId);
    });
    test('Unknown user pass', async () => {
      const start = Date.now();
      const userId = 1;
      const mockDB = {
        clearUserAccount: () => {
          throw new Error('shouldnt be called');
        },
        users: {
          findByID: (id) => {
            const timer = Date.now() - start;
            expect(timer).toBeGreaterThanOrEqual(config.get('timer.removal.user'));
            expect(id).toBe(userId);
            return Promise.resolve(null);
          },
        },
      };

      await Action.autoUserRemoval(mockDB, userId);
    });
    test('Active account is not removed', async () => {
      const start = Date.now();
      const userId = 1;
      const mockDB = {
        clearUserAccount: () => {
          throw new Error('shouldnt be called');
        },
        users: {
          findByID: (id) => {
            const timer = Date.now() - start;
            expect(timer).toBeGreaterThanOrEqual(config.get('timer.removal.user'));
            expect(id).toBe(userId);
            return Promise.resolve({ id: userId, username: 'bar', lastActivity: 1 });
          },
        },
      };

      await Action.autoUserRemoval(mockDB, userId);
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

  describe('.autoValidation', () => {
    beforeEach(() => {
      // Clear all instances and calls to constructor and all methods:
      Validator.mockClear();
      Validator.mockValidateUser.mockClear();
    });
    test('A user should get validated', async () => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({
              id: userId,
              hash: 'mysignedhash',
              validation: 'NO_VALIDATION',
              counter: 0,
              save() {
                if (this.counter === 0) {
                  expect(this.validation).toBe('IS_VALIDATING');
                  this.counter += 1;
                } else if (this.counter === 1) {
                  expect(this.validation).toBe('VALIDATED');
                  this.counter += 1;
                } else {
                  throw new Error('called too many times');
                }
              },
            });
          },
        },
      };

      Validator.mockValidateUser.mockImplementation(({ userId: funcId, signature }) => {
        expect(funcId).toBe(userId);
        expect(signature).toBe('mysignedhash');
        return Promise.resolve(true);
      });

      await Action.autoValidation(mockDB, userId);
      expect(Validator).toHaveBeenCalledTimes(1);
      expect(Validator.mockValidateUser).toHaveBeenCalledTimes(1);
    });
    test('Unknown user should get ignored', async () => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve(null);
          },
        },
      };

      await Action.autoValidation(mockDB, userId);
      expect(Validator).not.toHaveBeenCalled();
      expect(Validator.mockValidateUser).not.toHaveBeenCalled();
    });
    test('Validating user should get ignored', async () => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({
              id: userId,
              hash: 'mysignedhash',
              validation: 'IS_VALIDATING',
              counter: 0,
              save() {
                throw new Error('Should not be called');
              },
            });
          },
        },
      };

      await Action.autoValidation(mockDB, userId);
      expect(Validator).not.toHaveBeenCalled();
      expect(Validator.mockValidateUser).not.toHaveBeenCalled();
    });
    test('Validated user should get ignored', async () => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({
              id: userId,
              hash: 'mysignedhash',
              validation: 'VALIDATED',
              counter: 0,
              save() {
                throw new Error('Should not be called');
              },
            });
          },
        },
      };

      await Action.autoValidation(mockDB, userId);
      expect(Validator).not.toHaveBeenCalled();
      expect(Validator.mockValidateUser).not.toHaveBeenCalled();
    });
    test('Validation error cancels validation', (cb) => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({
              id: userId,
              hash: 'mysignedhash',
              validation: 'NO_VALIDATION',
              counter: 0,
              save() {
                if (this.counter === 0) {
                  expect(this.validation).toBe('IS_VALIDATING');
                  this.counter += 1;
                } else if (this.counter === 1) {
                  try {
                    expect(this.validation).toBe('NO_VALIDATION');
                    expect(Validator).toHaveBeenCalledTimes(1);
                    expect(Validator.mockValidateUser).toHaveBeenCalledTimes(1);
                    cb();
                  } catch (err) {
                    cb(err);
                  }
                }
              },
            });
          },
        },
      };

      Validator.mockValidateUser.mockImplementation(({ userId: funcId, signature }) => {
        expect(funcId).toBe(userId);
        expect(signature).toBe('mysignedhash');
        return Promise.reject(new Error('On chain error'));
      });

      Action.autoValidation(mockDB, userId);
    });
    test('Validator connection error cancels validation', (cb) => {
      const userId = '1';
      const mockDB = {
        users: {
          findByID: (id) => {
            expect(id).toBe(userId);
            return Promise.resolve({
              id: userId,
              hash: 'mysignedhash',
              validation: 'NO_VALIDATION',
              counter: 0,
              save() {
                if (this.counter === 0) {
                  expect(this.validation).toBe('IS_VALIDATING');
                  this.counter += 1;
                } else if (this.counter === 1) {
                  try {
                    expect(this.validation).toBe('NO_VALIDATION');
                    expect(Validator).toHaveBeenCalledTimes(1);
                    expect(Validator.mockValidateUser).not.toHaveBeenCalled();
                    cb();
                  } catch (err) {
                    cb(err);
                  }
                  this.counter += 1;
                } else {
                  throw new Error('called too many times');
                }
              },
            });
          },
        },
      };

      Validator.mockImplementation(() => {
        throw new Error('Bad configuration for connection');
      });

      Action.autoValidation(mockDB, userId);
    });
  });
});
