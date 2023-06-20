const mongoose = require('mongoose');
const { autoIncrement } = require('mongoose-plugin-autoinc');

class MessageData {
  constructor() {
    this.messageSchema = new mongoose.Schema({
      id: {
        type: Number,
        unique: true,
      },
      userId: {
        type: Number,
      },
      hasBeenRead: {
        type: Boolean,
      },
      header: {
        token: {
          type: String,
        },
        passphrase: {
          type: String,
        },
        iv: {
          type: String,
        },
      },
      full: {
        token: {
          type: String,
        },
        passphrase: {
          type: String,
        },
        iv: {
          type: String,
        },
      },
    });
    this.messageSchema.index({ userId: -1 });
  }

  async init(conn) {
    this.messageSchema.plugin(autoIncrement, { model: 'Message', field: 'id' });
    this.Doc = conn.model('Message', this.messageSchema);
    await this.Doc.init();
  }

  getNew() {
    return new this.Doc();
  }

  async findByID(msgId) {
    const message = await this.Doc.findOne({ id: msgId });
    return message;
  }

  async getUserMessages(userId) {
    const messages = await this.Doc.find({ userId }).sort({ id: 'desc' });
    return messages;
  }

  async deleteID(msgId) {
    const result = await this.Doc.deleteOne({ id: msgId });
    return result;
  }
}

module.exports = MessageData;
