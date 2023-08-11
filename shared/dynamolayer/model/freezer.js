const dynamoose = require('dynamoose');

class FreezerData {
  constructor() {
    this.freezerSchema = new dynamoose.Schema({
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
      lastActivity: {
        type: Number,
        index: {
          name: 'FrozenUserIndex',
          type: 'local',
        },
      },
    });
  }
}

module.exports = FreezerData;
