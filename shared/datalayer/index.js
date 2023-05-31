const mongoose = require('mongoose');
const config = require('config');
const debug = require('debug')('datalayer:data');
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
      this.connection = await mongoose.connect(config.get('mongo.url'), {
        autoIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (err) {
      debug('initialization connection error', err);
      throw err;
    }

    debug('initialize users collection');
    await this.users.init(this.connection);
    debug('initialize messages collection');
    await this.messages.init(this.connection);

    debug('clean up read messages');
    await this.messages.Doc.deleteMany({ hasBeenRead: true });

    debug('finished initialization');
  }
}

module.exports = Data;
