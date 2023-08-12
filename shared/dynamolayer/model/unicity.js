const dynamoose = require('dynamoose');

class UnicityData {
  constructor() {
    this.KeyEntity = null;
    this.SigEntity = null;
    this.UserEntity = null;
    this.keyUnicitySchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
        map: 'keyHash',
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
      },
    });
    this.signatureUnicitySchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
        map: 'sigHash',
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
      },
    });
    this.userIdUnicitySchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
        map: 'userId',
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
      },
    });
  }

  init(tableName) {
    this.KeyEntity = dynamoose.model('KeyUnicity', this.keyUnicitySchema, { tableName });
    this.SigEntity = dynamoose.model('SigUnicity', this.signatureUnicitySchema, { tableName });
    this.UserEntity = dynamoose.model('UserUnicity', this.userIdUnicitySchema, { tableName });
  }
}

module.exports = UnicityData;
