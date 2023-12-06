const dynamoose = require('dynamoose');

function getLengthControlledItem(length) {
  return new dynamoose.Schema({
    value: {
      type: String,
      required: true,
      minLength: length,
      maxLength: length,
    },
    vector: {
      type: String,
      required: true,
      minLength: 24,
      maxLength: 24,
    },
  });
}

const itemSchema = new dynamoose.Schema({
  info: {
    type: String,
    required: true,
    minLength: 24,
    maxLength: 24,
  },
  token: {
    type: Object,
    schema: getLengthControlledItem(7192),
    required: true,
  },
  iv: {
    type: Object,
    schema: getLengthControlledItem(56),
    required: true,
  },
  salt: {
    type: Object,
    schema: getLengthControlledItem(140),
    required: true,
  },
  pass: {
    type: Object,
    schema: getLengthControlledItem(208),
    required: true,
  },
  kill: {
    type: Object,
    schema: getLengthControlledItem(208),
    required: true,
  },
});

module.exports = itemSchema;
