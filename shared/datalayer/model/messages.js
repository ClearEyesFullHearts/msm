const mongoose = require('mongoose');
const { autoIncrement } = require('mongoose-plugin-autoinc');
const challengeSchema = require('./subSchema/challenge');

class MessageData {
  constructor() {
    this.messageSchema = new mongoose.Schema({
      id: {
        type: Number,
        unique: true,
        required: true,
      },
      userId: {
        type: Number,
        required: true,
      },
      hasBeenRead: {
        type: Boolean,
        required: true,
        default: false,
      },
      header: {
        type: challengeSchema,
        required: true,
      },
      full: {
        type: challengeSchema,
        required: true,
      },
    });
    this.messageSchema.index({ userId: -1 });
  }

  async init(conn) {
    this.messageSchema.plugin(autoIncrement, { model: 'Message', field: 'id' });
    this.Doc = conn.model('Message', this.messageSchema);
    await this.Doc.init();
  }

  async create({
    userId,
    header,
    full,
  }) {
    const newMsg = new this.Doc();
    newMsg.userId = userId;
    newMsg.hasBeenRead = false;
    newMsg.header = header;
    newMsg.full = full;

    await newMsg.save();
    return newMsg;
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
