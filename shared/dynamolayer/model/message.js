const dynamoose = require('dynamoose');
const challengeSchema = require('./schemas/challenge');

class MessageData {
  constructor() {
    this.messageSchema = new dynamoose.Schema({
      username: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 125,
        hashKey: true,
      },
      id: {
        type: String,
        required: true,
        rangeKey: true,
      },
      hasBeenRead: {
        type: Boolean,
        required: true,
        default: false,
        index: {
          name: 'ReadMessageIndex',
          type: 'local',
        },
      },
      header: {
        type: challengeSchema,
        required: true,
      },
      full: {
        type: challengeSchema,
        required: true,
      },
    });
  }
}

module.exports = MessageData;
