const dynamoose = require('dynamoose');
const challengeSchema = require('./schemas/challenge');
const vaultItemSchema = require('./schemas/vaultItem');

class UserData {
  constructor() {
    this.userSchema = new dynamoose.Schema({
      username: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 125,
        hashKey: true,
      },
      confirm: {
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
        type: vaultItemSchema,
        default: null,
      },
      switch: {
        type: vaultItemSchema,
        default: null,
      },
      contacts: {
        type: challengeSchema,
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
}

module.exports = UserData;
