const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
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
