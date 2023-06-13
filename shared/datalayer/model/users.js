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
        required: true,
      },
      searchTerms: [String],
      size: Number,
      key: {
        type: String,
        required: true,
        unique: true,
      },
      signature: {
        type: String,
        unique: true,
      },
      lastActivity: Number,
      security: {
        type: String,
        enum: ['safe', 'custom', 'hosted'],
        default: 'safe',
      },
    });
    this.userSchema.index({ searchTerms: -1 });
  }

  async init(conn) {
    this.userSchema.plugin(autoIncrement, { model: 'User', field: 'id' });
    this.Doc = conn.model('User', this.userSchema);
    await this.Doc.init();
  }

  async findByID(userId) {
    const user = await this.Doc.findOne({ id: userId });
    return user;
  }

  async findByName(at) {
    const user = await this.Doc.findOne({ username: at });
    return user;
  }

  async searchUsername(search) {
    const users = await this.Doc.find({ searchTerms: search }).sort({ size: 1 }).limit(15);
    return users;
  }
}

module.exports = UserData;
