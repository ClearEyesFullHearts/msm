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
        index: {
          name: 'ConnectionIDIndex',
          global: false,
          project: true,
          rangeKey: 'id',
        },
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
      stage: {
        type: String,
        required: true,
      },
      domainName: {
        type: String,
        required: true,
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
    stage,
    domainName,
  }) {
    const newConnection = {
      pk: 'WSS',
      sk: username,
      id: connectionId,
      signature,
      stage,
      domainName,
    };

    const conn = await this.Entity.create(newConnection);
    return conn;
  }

  async findByName(at) {
    const user = await this.Entity.get({ pk: 'WSS', sk: at });
    return user;
  }

  async findAll(usernames) {
    const keys = usernames.map((at) => ({ pk: 'WSS', sk: at }));

    const connected = await this.Entity.batchGet(keys);
    return connected;
  }

  async findById(connectionId) {
    const user = await this.Entity.query('pk').eq('WSS')
      .filter('id').eq(connectionId)
      .using('ConnectionIDIndex')
      .exec();
    return user && user.length ? user[0] : undefined;
  }

  async delete(username) {
    await this.Entity.delete({ pk: 'WSS', sk: username });
  }

  async allConnected() {
    const connections = await this.Entity.query('pk').eq('WSS').exec();
    return connections || [];
  }
}

module.exports = ConnectionData;
