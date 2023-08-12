const dynamoose = require('dynamoose');

class FreezerData {
  constructor() {
    this.freezerSchema = new dynamoose.Schema({
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
      lastActivity: {
        type: Number,
        index: {
          name: 'FrozenUserIndex',
          type: 'local',
        },
      },
    });
  }

  init(tableName) {
    this.entity = dynamoose.model('Freezer', this.freezerSchema, { tableName });
  }
}

module.exports = FreezerData;
