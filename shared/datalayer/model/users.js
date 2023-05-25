const mongoose = require('mongoose');
const { autoIncrement } = require('mongoose-plugin-autoinc');

class UserData {
  constructor() {
    this.userSchema = new mongoose.Schema({
      id: {
        type: Number,
        unique: true,
      },
      username: {
        type: String,
        unique: true,
      },
      searchTerms: [String],
      key: {
        type: String,
        required: true,
      },
      lastActivity: Number,
      security: {
        type: String,
        enum: ['safe', 'custom', 'hosted'],
        default: 'safe',
      },
    });
    this.userSchema.index({ username: 'text', searchTerms: 'text' });
  }

  async init(conn) {
    this.userSchema.plugin(autoIncrement, { model: 'User', field: 'id' });
    this.Doc = conn.model('User', this.userSchema);
    await this.Doc.init();
  }
}

module.exports = UserData;
