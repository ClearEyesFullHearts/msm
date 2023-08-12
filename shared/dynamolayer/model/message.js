const dynamoose = require('dynamoose');
const challengeSchema = require('./schemas/challenge');

class MessageData {
  constructor() {
    this.messageSchema = new dynamoose.Schema({
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
        rangeKey: true,
        map: 'msgId',
      },
      hasBeenRead: {
        type: Number,
        required: true,
        default: 0,
        index: {
          name: 'ReadMessageIndex',
          type: 'local',
        },
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

  init(tableName) {
    this.entity = dynamoose.model('Message', this.messageSchema, { tableName });
  }
}

module.exports = MessageData;
