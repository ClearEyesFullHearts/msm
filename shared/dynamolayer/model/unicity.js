const dynamoose = require('dynamoose');

class UnicityData {
  constructor() {
    this.keyUnicitySchema = new dynamoose.Schema({
      keyHash: {
        type: String,
        required: true,
        hashKey: true,
      },
      confirm: {
        type: String,
        required: true,
        rangeKey: true,
      },
    });
    this.signatureUnicitySchema = new dynamoose.Schema({
      sigHash: {
        type: String,
        required: true,
        hashKey: true,
      },
      confirm: {
        type: String,
        required: true,
        rangeKey: true,
      },
    });
    this.userIdUnicitySchema = new dynamoose.Schema({
      userId: {
        type: String,
        required: true,
        hashKey: true,
      },
      confirm: {
        type: String,
        required: true,
        rangeKey: true,
      },
    });
  }
}

module.exports = UnicityData;
