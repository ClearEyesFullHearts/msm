const dynamoose = require('dynamoose');

class ConnectionData {
  constructor() {
    this.Entity = null;
    this.connectionSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
        default: 'WSS',
        forceDefault: true,
      },
      sk: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 35,
        rangeKey: true,
        map: 'username',
      },
      id: {
        type: String,
        required: true,
      },
      signature: {
        type: String,
        required: true,
        minLength: 268,
        maxLength: 268,
      },
      validation: {
        type: String,
        enum: ['NO_VALIDATION', 'IS_VALIDATING', 'VALIDATED'],
        default: 'NO_VALIDATION',
        index: {
          name: 'UserValidationIndex',
          global: true,
          project: false,
        },
      },
    });
  }

  init(options) {
    this.Entity = dynamoose.model('Connection', this.connectionSchema, options);
  }

  async create({
    username,
    connectionId,
    signature,
    validation,
  }) {
    const newConnection = {
      pk: 'WSS',
      sk: username,
      id: connectionId,
      signature,
      validation,
    };

    const conn = await this.Entity.create(newConnection);
    return conn;
  }

  async findByName(at) {
    const user = await this.Entity.get({ pk: 'WSS', sk: at });
    return user;
  }

  async updateId(username, connectionId) {
    this.Entity.update(
      { pk: 'WSS', sk: username },
      {
        $SET: { id: connectionId },
      },
    );
  }
}

module.exports = ConnectionData;
