const dynamoose = require('dynamoose');
const debug = require('debug')('dynamolayer:data');
const Encryption = require('@shared/encryption');
const UserData = require('./model/user');
const MessageData = require('./model/message');
const UnicityData = require('./model/unicity');
const SearchData = require('./model/search');
const FreezerData = require('./model/freezer');

const TABLE_NAME = 'MyLocalTable';

class Data {
  constructor(config, options) {
    this.unicityData = new UnicityData();
    this.searchData = new SearchData();
    this.freezerData = new FreezerData();
    this.userData = new UserData();
    this.messageData = new MessageData();

    const { local, ...connConfig } = config;
    this.CONNECTION = connConfig;
    this.IS_LOCAL = local;

    const { frozen, inactivity } = options;
    this.FROZEN_TIME = frozen;
    this.INACTIVITY_TIME = inactivity;
  }

  static async batchDelete(keys, data) {
    if (!keys.length) return;

    await keys.reduce(async (prev, { pk, sk }, index) => {
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
    const ddb = new dynamoose.aws.ddb.DynamoDB(this.CONNECTION);

    // Set DynamoDB instance to the Dynamoose DDB instance
    dynamoose.aws.ddb.set(ddb);
    if (this.IS_LOCAL) dynamoose.aws.ddb.local();

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

      await Data.batchDelete(keys, this.searchData);

      const removalDate = Math.floor(Date.now() / 1000) + Math.floor(this.FROZEN_TIME / 1000);
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

    await Data.batchDelete(messages, this.messageData);
  }

  async clearReadMessages() {
    const messages = await this.messageData.Entity.query('hasBeenRead').eq(1).using('ReadMessagesIndex').exec();
    await Data.batchDelete(messages, this.messageData);
  }

  async deactivateAccounts() {
    const now = Date.now();
    const inactiveLimit = UserData.roundTimeToDays(now - this.INACTIVITY_TIME);
    const missedLimit = -UserData.roundTimeToDays(now, 2);

    const inactiveUsers = await this.userData.Entity.query('lastActivity').eq(inactiveLimit).using('LastActivityIndex').exec();
    const missedUsers = await this.userData.Entity.query('lastActivity').eq(missedLimit).using('LastActivityIndex').exec();

    const IDs = inactiveUsers.map((iu) => ({
      username: iu.username,
      key: iu.key,
      signature: iu.signature,
      id: iu.id,
      freeze: true,
    }))
      .concat(
        missedUsers.map((iu) => ({
          username: iu.username,
          key: iu.key,
          signature: iu.signature,
          id: iu.id,
          freeze: false,
        })),
      );

    const l = IDs.length;
    const promises = [];
    for (let i = 0; i < l; i += 1) {
      const {
        freeze,
        ...user
      } = IDs[i];

      debug('clear', user.username);
      promises.push(this.clearUserAccount(user, freeze));
    }

    await Promise.all(promises);
  }

  async activityReport() {
    const { count: notValidatedUsers } = await this.userData.Entity.query('validation').eq('NO_VALIDATION').using('UserValidationIndex').count()
      .exec();
    const { count: validatingUsers } = await this.userData.Entity.query('validation').eq('IS_VALIDATING').using('UserValidationIndex').count()
      .exec();
    const { count: validatedUsers } = await this.userData.Entity.query('validation').eq('VALIDATED').using('UserValidationIndex').count()
      .exec();
    const { count: waitingMessages } = await this.messageData.Entity.query('hasBeenRead').eq(0).using('ReadMessagesIndex').count()
      .exec();

    return {
      notValidatedUsers,
      validatingUsers,
      validatedUsers,
      waitingMessages,
    };
  }
}

module.exports = Data;
