const mongoose = require('mongoose');

class FreezerData {
  constructor() {
    this.freezerSchema = new mongoose.Schema({
      username: {
        type: String,
        unique: true,
        required: true,
      },
      lastActivity: Number,
    });
  }

  async init(conn) {
    this.Doc = conn.model('Freezer', this.freezerSchema);
    await this.Doc.init();
  }

  async findByName(at) {
    const frozen = await this.Doc.findOne({ username: at });
    return frozen;
  }
}

module.exports = FreezerData;
