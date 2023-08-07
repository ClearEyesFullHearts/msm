const mongoose = require('mongoose');
const { autoIncrement } = require('mongoose-plugin-autoinc');
const challengeSchema = require('./subSchema/challenge');
const vaultItemSchema = require('./subSchema/vaultItem');

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
        minLength: 3,
      },
      searchTerms: [String],
      size: Number,
      key: {
        type: String,
        required: true,
        unique: true,
        minLength: 788,
        maxLength: 788,
      },
      signature: {
        type: String,
        unique: true,
        minLength: 268,
        maxLength: 268,
      },
      hash: {
        type: String,
        unique: true,
        minLength: 172,
        maxLength: 172,
      },
      vault: {
        type: vaultItemSchema,
        default: null,
      },
      switch: {
        type: vaultItemSchema,
        default: null,
      },
      contacts: {
        type: challengeSchema,
        default: null,
      },
      lastActivity: Number,
      validation: {
        type: String,
        enum: ['NO_VALIDATION', 'IS_VALIDATING', 'VALIDATED'],
        default: 'NO_VALIDATION',
      },
    });
    this.userSchema.index({ searchTerms: -1 });
  }

  async init(conn) {
    this.userSchema.plugin(autoIncrement, { model: 'User', field: 'id' });
    this.Doc = conn.model('User', this.userSchema);
    await this.Doc.init();
  }

  getNew() {
    return new this.Doc();
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
    const users = await this.Doc.find({
      searchTerms: search,
      lastActivity: { $gte: 0 },
    })
      .sort({ size: 1 })
      .limit(15);

    return users || [];
  }
}

module.exports = UserData;
