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
  }

  async init(conn) {
    this.messageSchema.plugin(autoIncrement, { model: 'Message', field: 'id' });
    this.Doc = conn.model('Message', this.messageSchema);
    await this.Doc.init();
  }
}

module.exports = MessageData;
