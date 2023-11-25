const dynamoose = require('dynamoose');

const sessionSchema = new dynamoose.Schema({
  spk: {
    type: String,
    required: true,
    minLength: 88,
    maxLength: 88,
  },
  tss: {
    type: String,
    required: true,
    minLength: 44,
    maxLength: 44,
  },
  minTtl: {
    type: Number,
    required: true,
  },
  maxTtl: {
    type: Number,
    required: true,
  },
  usage: {
    type: Number,
    required: true,
  },
});

module.exports = sessionSchema;
