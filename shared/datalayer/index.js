const mongoose = require('mongoose');
const config = require('config');
const debug = require('debug')('datalayer:data');
const path = require('path');
const UserData = require('./model/users');
const MessageData = require('./model/messages');

class Data {
  constructor() {
    this.users = new UserData();
    this.messages = new MessageData();
  }

  async init() {
    try {
      debug('initialize mongodb connection');
      let options = {};
      if (config.get('mongo.ssl')) {
        options = {
          ssl: true,
          sslValidate: false,
          sslCA: path.join(__dirname, 'ssl/ca.pem'),
        };
      }
      this.connection = await mongoose.connect(config.get('mongo.url'), {
        autoIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ...options,
      });
    } catch (err) {
      debug('initialization connection error', err);
      throw err;
    }

    debug('initialize users collection');
    await this.users.init(this.connection);
    debug('initialize messages collection');
    await this.messages.init(this.connection);

    debug('finished initialization');
  }

  async clearUserAccount(userId) {
    await this.messages.Doc.deleteMany({ userId });
    await this.users.Doc.deleteOne({ id: userId });
  }

  async clearReadMessages() {
    await this.messages.Doc.deleteMany({ hasBeenRead: true });
  }

  async deactivateAccounts() {
    const now = Date.now();
    const inactiveLimit = now - config.get('timer.removal.inactivity');
    const missedLimit = config.get('timer.removal.user') - now;

    const inactiveUsers = await this.users.Doc.find({ lastActivity: { $lte: inactiveLimit, $gte: 0 } });
    const missedUsers = await this.users.Doc.find({ lastActivity: { $lte: 0, $gte: missedLimit } });

    const IDs = inactiveUsers.map((iu) => iu.id).concat(missedUsers.map((iu) => iu.id));
    const l = IDs.length;
    const promises = [];
    for (let i = 0; i < l; i += 1) {
      promises.push(this.clearUserAccount(IDs[i]));
    }
    await Promise.all(promises);
  }
}

module.exports = Data;
