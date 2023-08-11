const dynamoose = require('dynamoose');

const challengeSchema = new dynamoose.Schema({
  token: {
    type: String,
    required: true,
  },
  passphrase: {
    type: String,
    required: true,
    minLength: 684,
    maxLength: 684,
  },
  iv: {
    type: String,
    required: true,
    minLength: 24,
    maxLength: 24,
  },
});

module.exports = challengeSchema;
