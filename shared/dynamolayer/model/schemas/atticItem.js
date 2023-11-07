const dynamoose = require('dynamoose');

const itemSchema = new dynamoose.Schema({
  iv: {
    type: String,
    required: true,
    minLength: 24,
    maxLength: 24,
  },
  salt: {
    type: String,
    required: true,
    minLength: 88,
    maxLength: 88,
  },
  proof: {
    type: String,
    required: true,
    minLength: 88,
    maxLength: 88,
  },
});

module.exports = itemSchema;
