const dynamoose = require('dynamoose');
const challengeSchema = require('./schemas/challenge');

class MessageData {
  constructor() {
    this.user = null;
    this.Entity = null;
    this.messageSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
        map: 'msgId',
      },
      hasBeenRead: {
        type: Number,
        required: true,
        default: 0,
      },
      header: {
        type: Object,
        schema: challengeSchema,
        required: true,
      },
      full: {
        type: Object,
        schema: challengeSchema,
        required: true,
      },
    });
  }

  init(tableName, {
    user,
  }) {
    this.Entity = dynamoose.model('Message', this.messageSchema, { tableName });
    this.user = user;
  }

  async create({
    username,
    header,
    full,
  }) {
    const { msgCount } = await this.user.Entity.update({ pk: `U#${username}`, sk: username }, { $ADD: { msgCount: 1 } });

    const newMessage = {
      pk: `U#${username}`,
      sk: `M#${msgCount}`,
      hasBeenRead: 0,
      header,
      full,
    };
    const msg = await this.Entity.create(newMessage);

    return msg;
  }

  async findByID(username, msgId) {
    const message = await this.Entity.get({ pk: `U#${username}`, sk: msgId });
    return message;
  }

  async getUserMessages(username) {
    const messages = await this.Entity
      .query('pk').eq(`U#${username}`)
      .filter('sk').beginsWith('M')
      .attributes(['sk', 'header'])
      .sort('descending')
      .exec();

    return messages;
  }

  async deleteID(username, msgId) {
    const result = await this.Entity.delete({ pk: `U#${username}`, sk: msgId });
    return result;
  }
}

module.exports = MessageData;
