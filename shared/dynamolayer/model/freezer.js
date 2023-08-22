const dynamoose = require('dynamoose');

class FreezerData {
  constructor() {
    this.Entity = null;
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
      expirationDate: Number,
    });
  }

  init(options) {
    this.Entity = dynamoose.model('Freezer', this.freezerSchema, options);
  }
}

module.exports = FreezerData;
