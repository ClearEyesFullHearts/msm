const mongoose = require('mongoose');
const config = require('config');
const debug = require('debug')('datalayer:data');
const path = require('path');
const UserData = require('./model/users');
const MessageData = require('./model/messages');
const FreezerData = require('./model/freezer');

class Data {
  constructor() {
    this.users = new UserData();
    this.messages = new MessageData();
    this.freezer = new FreezerData();
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
    debug('initialize freezer collection');
    await this.freezer.init(this.connection);

    debug('finished initialization');
  }

  async clearUserAccount({ userId, username }, freeze = true) {
    await this.messages.Doc.deleteMany({ userId });
    await this.users.Doc.deleteOne({ id: userId });

    if (freeze) {
      const newFreezer = this.freezer.getNew();
      newFreezer.username = username;
      newFreezer.lastActivity = Date.now();
      await newFreezer.save();
    }
  }

  async clearReadMessages() {
    await this.messages.Doc.deleteMany({ hasBeenRead: true });
  }

  async deactivateAccounts() {
    const now = Date.now();
    const inactiveLimit = now - config.get('timer.removal.inactivity');
    const missedLimit = config.get('timer.removal.user') - now;

    const inactiveUsers = await this.users.Doc.find(
      { lastActivity: { $lte: inactiveLimit, $gte: 0 } },
    );
    const missedUsers = await this.users.Doc.find(
      { lastActivity: { $lte: 0, $gte: missedLimit } },
    );

    const IDs = inactiveUsers.map((iu) => ({ userId: iu.id, username: iu.username, freeze: true }))
      .concat(
        missedUsers.map((iu) => ({ userId: iu.id, username: iu.username, freeze: false })),
      );
    const l = IDs.length;
    const promises = [];
    for (let i = 0; i < l; i += 1) {
      const {
        userId,
        username,
        freeze,
      } = IDs[i];

      debug('clear', userId, username);
      promises.push(this.clearUserAccount({ userId, username }, freeze));
    }

    await Promise.all(promises);
  }

  async unfreezeUsername() {
    const now = Date.now();
    const frozenLimit = now - config.get('timer.removal.frozen');
    await this.freezer.Doc.deleteMany({ lastActivity: { $lte: frozenLimit, $gte: 0 } });
  }

  async activityReport() {
    const activeUsers = await this.users.Doc.find({ lastActivity: { $gte: 0 } }).countDocuments();
    const waitingMessages = await this.messages.Doc.find({}).countDocuments();

    return {
      activeUsers,
      waitingMessages,
    };
  }
}

module.exports = Data;
