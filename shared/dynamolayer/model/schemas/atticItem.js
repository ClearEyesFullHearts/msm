const dynamoose = require('dynamoose');

const itemSchema = new dynamoose.Schema({
  salt: {
    type: String,
    required: true,
    minLength: 88,
    maxLength: 88,
  },
});

module.exports = itemSchema;
