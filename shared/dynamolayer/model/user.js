const dynamoose = require('dynamoose');
const { v4: uuidv4 } = require('uuid');
const Encryption = require('@shared/encryption');
const UnicityData = require('./unicity');
const challengeSchema = require('./schemas/challenge');
const vaultItemSchema = require('./schemas/vaultItem');

class UserData {
  constructor() {
    this.Entity = null;
    this.unicity = null;
    this.userSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 125,
        hashKey: true,
        map: 'username',
      },
      sk: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 125,
        rangeKey: true,
      },
      id: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
        required: true,
        index: {
          name: 'SearchUserIndex',
          type: 'local',
        },
      },
      key: {
        type: String,
        required: true,
        minLength: 788,
        maxLength: 788,
      },
      signature: {
        type: String,
        required: true,
        minLength: 268,
        maxLength: 268,
      },
      hash: {
        type: String,
        unique: true,
        minLength: 172,
        maxLength: 172,
      },
      vault: {
        type: Object,
        schema: vaultItemSchema,
        default: null,
      },
      switch: {
        type: Object,
        schema: vaultItemSchema,
        default: null,
      },
      contacts: {
        type: Object,
        schema: challengeSchema,
        default: null,
      },
      lastActivity: Number,
      validation: {
        type: String,
        enum: ['NO_VALIDATION', 'IS_VALIDATING', 'VALIDATED'],
        default: 'NO_VALIDATION',
      },
    });
  }

  init(tableName) {
    this.Entity = dynamoose.model('User', this.userSchema, { tableName });
    this.unicity = new UnicityData();
    this.unicity.init(tableName);
  }

  async create({
    username,
    key,
    signature,
    hash,
  }) {
    const id = uuidv4();
    const keyHash = Encryption.hash(key).toString('base64');
    const sigHash = Encryption.hash(signature).toString('base64');
    const newUser = {
      username,
      sk: username,
      id,
      size: username.length,
      lastActivity: -Date.now(),
      key,
      signature,
      hash,
    };
    const result = await dynamoose.transaction([
      this.Entity.transaction.create(newUser),
      this.unicity.KeyEntity.transaction.create({ sk: keyHash, pk: keyHash }),
      this.unicity.SigEntity.transaction.create({ sk: sigHash, pk: sigHash }),
      this.unicity.UserEntity.transaction.create({ sk: id, pk: id }),
    ], {return: 'items'});

    return result;
  }

  getNew(user) {
    return new this.Entity(user);
  }
}

module.exports = UserData;
