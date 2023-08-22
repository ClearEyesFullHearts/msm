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

  init(options) {
    this.KeyEntity = dynamoose.model('KeyUnicity', this.keyUnicitySchema, options);
    this.SigEntity = dynamoose.model('SigUnicity', this.signatureUnicitySchema, options);
    this.UserEntity = dynamoose.model('UserUnicity', this.userIdUnicitySchema, options);
  }
}

module.exports = UnicityData;
