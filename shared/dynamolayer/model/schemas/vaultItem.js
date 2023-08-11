const dynamoose = require('dynamoose');

const itemSchema = new dynamoose.Schema({
  token: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
    minLength: 24,
    maxLength: 24,
  },
});

module.exports = itemSchema;
