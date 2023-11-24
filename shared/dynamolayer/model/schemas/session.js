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
  },
  maxTtl: {
    type: Number,
  },
  usage: {
    type: Number,
  },
});

module.exports = sessionSchema;
