const dynamoose = require('dynamoose');
const config = require('config');
const debug = require('debug')('dynamolayer:data');
const Encryption = require('@shared/encryption');
const UserData = require('./model/user');
const MessageData = require('./model/message');
const UnicityData = require('./model/unicity');
const SearchData = require('./model/search');
const FreezerData = require('./model/freezer');

const TABLE_NAME = 'MyLocalTable';

class Data {
  constructor() {
    this.unicityData = new UnicityData();
    this.searchData = new SearchData();
    this.freezerData = new FreezerData();
    this.userData = new UserData();
    this.messageData = new MessageData();
  }

  static batchDelete(keys, data) {
    keys.reduce(async (prev, { pk, sk }, index) => {
      const arr = await prev;
      arr.push({ pk, sk });
      if (arr.length >= 24 || index >= keys.length - 1) {
        await data.Entity.batchDelete(arr);
        return [];
      }
      return arr;
    }, Promise.resolve([]));
  }

  init() {
    // Create new DynamoDB instance
    const ddb = new dynamoose.aws.ddb.DynamoDB({
      credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      },
      region: 'us-west-2',
    });

    // Set DynamoDB instance to the Dynamoose DDB instance
    dynamoose.aws.ddb.set(ddb);
    dynamoose.aws.ddb.local();

    this.unicityData.init(TABLE_NAME);
    this.searchData.init(TABLE_NAME);
    this.freezerData.init(TABLE_NAME);

    this.userData.init(TABLE_NAME, {
      unicity: this.unicityData,
      search: this.searchData,
    });
    this.messageData.init(TABLE_NAME, { user: this.userData });

    debug('finished initialization');
  }

  async clearUserAccount({
    username, key, signature, id,
  }, freeze = true) {
    if (!freeze) {
      const keyHash = Encryption.hash(key).toString('base64');
      const sigHash = Encryption.hash(signature).toString('base64');
      await dynamoose.transaction([
        this.userData.Entity.transaction.delete({ pk: `U#${username}`, sk: username }),
        this.unicityData.KeyEntity.transaction.delete({ sk: keyHash, pk: keyHash }),
        this.unicityData.SigEntity.transaction.delete({ sk: sigHash, pk: sigHash }),
        this.unicityData.UserEntity.transaction.delete({ sk: id, pk: id }),
      ]);
    } else {
      const searchTerms = UserData.createSearchTerms(username);
      const keys = searchTerms.map((term) => ({ pk: `S#${username}`, sk: term }));

      Data.batchDelete(keys, this.searchData);

      const timer = 7776000000; // config.get('timer.removal.frozen');
      const removalDate = Math.floor(Date.now() / 1000) + Math.floor(timer / 1000);
      await this.freezerData.Entity.update(
        { pk: `U#${username}`, sk: username },
        {
          $SET: { expirationDate: removalDate },
          $REMOVE: ['id', 'key', 'signature', 'hash', 'vault', 'switch', 'contacts', 'lastActivity', 'validation', 'msgCount'],
        },
      );
    }
    const messages = await this.messageData.Entity
      .query('pk').eq(`U#${username}`)
      .filter('sk').beginsWith('M')
      .attributes(['sk', 'pk'])
      .exec();

    Data.batchDelete(messages, this.messageData);
  }
}

module.exports = Data;
