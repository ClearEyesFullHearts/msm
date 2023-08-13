const {
  describe, expect, test,
} = require('@jest/globals');

const Encryption = require('@shared/encryption');
const userLoader = require('./data/loadUser');

describe('Encryption helper test', () => {
  describe('Public Key validation', () => {
    test('Validates a correct encryption PK', () => {
      const {
        key,
      } = userLoader(1);

      expect(Encryption.isValidPemPk(key)).toBeTruthy();
    });
    test('Validates a correct signature PK', () => {
      const {
        signature,
      } = userLoader(1);

      expect(Encryption.isValidPemPk(signature)).toBeTruthy();
    });
    test('Do not validate encryption PK with openssl format', () => {
      const {
        key,
      } = userLoader(3);

      expect(Encryption.isValidPemPk(key)).toBeFalsy();
    });
    test('Do not validate signature PK from openssl format', () => {
      const {
        signature,
      } = userLoader(3);

      expect(Encryption.isValidPemPk(signature)).toBeFalsy();
    });
    test('PK should start with correct header', () => {
      const {
        signature,
      } = userLoader(1);

      const bad = signature.substring(1);

      expect(Encryption.isValidPemPk(bad)).toBeFalsy();
    });
    test('PK should end with correct footer', () => {
      const {
        signature,
      } = userLoader(1);

      const bad = signature.substring(0, signature.length - 2);

      expect(Encryption.isValidPemPk(bad)).toBeFalsy();
    });
    test('PK should be a base64 string', () => {
      const PK_START = '-----BEGIN PUBLIC KEY-----';
      const PK_END = '-----END PUBLIC KEY-----';
      const {
        signature: str,
      } = userLoader(1);

      const properKey = str.substring(PK_START.length + 1, str.length - PK_END.length - 2);
      const keyHex = Buffer.from(properKey, 'base64').toString('hex');
      const bad = `${PK_START}\n${keyHex}\n${PK_END}`;

      expect(Encryption.isValidPemPk(bad)).toBeFalsy();
    });
  });
});
