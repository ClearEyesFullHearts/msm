const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
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
