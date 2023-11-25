const crypto = require('crypto');
const dynamoose = require('dynamoose');
const { v4: uuidv4 } = require('uuid');
const challengeSchema = require('./schemas/challenge');
const vaultItemSchema = require('./schemas/vaultItem');
const atticItemSchema = require('./schemas/atticItem');
const sessionSchema = require('./schemas/session');

class UserData {
  constructor() {
    this.Entity = null;
    this.unicity = null;
    this.userSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
      },
      sk: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 35,
        rangeKey: true,
        map: 'username',
      },
      id: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
        minLength: 788,
        maxLength: 788,
      },
      signature: {
        type: String,
        required: true,
        minLength: 268,
        maxLength: 268,
      },
      hash: {
        type: String,
        required: true,
        minLength: 172,
        maxLength: 172,
      },
      vault: {
        type: Object,
        schema: vaultItemSchema,
        default: null,
      },
      attic: {
        type: Object,
        schema: atticItemSchema,
        default: null,
      },
      session: {
        type: Object,
        schema: sessionSchema,
        default: null,
      },
      contacts: {
        type: Object,
        schema: challengeSchema,
        default: null,
      },
      lastActivity: {
        type: Number,
        set: (val) => UserData.roundTimeToDays(val),
        index: {
          name: 'LastActivityIndex',
          global: true,
          rangeKey: 'sk',
        },
      },
      validation: {
        type: String,
        enum: ['NO_VALIDATION', 'IS_VALIDATING', 'VALIDATED'],
        default: 'NO_VALIDATION',
        index: {
          name: 'UserValidationIndex',
          global: true,
          project: false,
        },
      },
      msgCount: {
        type: Number,
        default: 0,
      },
      expirationDate: Number,
    });
  }

  static createSearchTerms(str) {
    const l = str.length;
    const terms = [];
    for (let i = 0; i < l - 2; i += 1) {
      for (let j = i + 3; j < l; j += 1) {
        terms.push(str.substring(i, j).toUpperCase());
      }
      terms.push(str.substring(i).toUpperCase());
    }
    return [...new Set(terms)];
  }

  static roundTimeToDays(epoch, addDays = 0) {
    const daysInMs = (24 * 60 * 60000);
    const dayMs = Math.floor(epoch / daysInMs) * daysInMs;
    return dayMs + (addDays * daysInMs);
  }

  static base64Hash(txt) {
    const hash = crypto.createHash('sha256');
    hash.update(txt);
    const digest = hash.digest();
    return digest.toString('base64');
  }

  init(options, {
    unicity,
    search,
  }) {
    this.Entity = dynamoose.model('User', this.userSchema, options);
    this.unicity = unicity;
    this.search = search;
  }

  async create({
    username,
    key,
    signature,
    hash,
  }, isRetry = false) {
    const id = uuidv4();

    const keyHash = UserData.base64Hash(key);
    const sigHash = UserData.base64Hash(signature);

    const newUser = {
      pk: `U#${username}`,
      sk: username,
      id,
      lastActivity: -Date.now(),
      key,
      signature,
      hash,
    };
    try {
      let result = await dynamoose.transaction([
        this.Entity.transaction.create(newUser),
        this.unicity.KeyEntity.transaction.create({ sk: keyHash, pk: keyHash }),
        this.unicity.SigEntity.transaction.create({ sk: sigHash, pk: sigHash }),
        this.unicity.UserEntity.transaction.create({ sk: id, pk: id }),
      ]);

      if (!result) {
        result = await this.findByName(username);
      } else {
        [result] = result;
      }

      return result;
    } catch (exc) {
      const { CancellationReasons } = exc;
      if (!CancellationReasons) throw exc;

      const [
        { Code: userReason },
        { Code: keyReason },
        { Code: sigReason },
        { Code: idReason },
      ] = CancellationReasons;

      let retryUser;
      switch ('ConditionalCheckFailed') {
        case userReason:
          throw new Error('Username already exists');
        case keyReason:
          throw new Error('Encryption key already exists');
        case sigReason:
          throw new Error('Signing key already exists');
        case idReason:
          if (isRetry) throw new Error('Unique id already exists');
          retryUser = await this.create({
            username,
            key,
            signature,
            hash,
          }, true);
          return retryUser;
        default:
          throw exc;
      }
    }
  }

  async confirmUser(username) {
    const searchTerms = UserData.createSearchTerms(username);
    const baseSearch = {
      size: username.length,
      sk: username,
    };

    // create all transactions
    const allTransactions = searchTerms.map((term) => this.search.Entity.transaction.create({
      ...baseSearch,
      pk: term,
    }));

    allTransactions.push(
      this.Entity.transaction.update(
        { pk: `U#${username}`, sk: username },
        {
          $SET: { lastActivity: Date.now() },
        },
      ),
    );

    const size = 99; const arrayOfTransacts = [];
    for (let i = 0; i < allTransactions.length; i += size) {
      const transacts = allTransactions.slice(i, i + size);
      arrayOfTransacts.push(dynamoose.transaction([
        ...transacts,
      ]));
    }

    await Promise.all(arrayOfTransacts);
  }

  async findByName(at) {
    const user = await this.Entity.get({ pk: `U#${at}`, sk: at });
    if (user && user.expirationDate && user.expirationDate > 0) return undefined;
    return user;
  }

  async searchUsername(search) {
    const users = await this.search.Entity.query('pk').eq(search).limit(15).using('SearchUserIndex')
      .exec();
    return users || [];
  }

  async updateLastActivity(username) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $SET: { lastActivity: UserData.roundTimeToDays(Date.now()) },
      },
    );
  }

  async updateValidation(username, val) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $SET: { validation: val },
      },
    );
  }

  async setSession(username, session) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $SET: { session },
      },
    );
  }

  async usedSession(username, session) {
    const spentSession = {
      ...session,
      usage: 0,
    };
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $SET: { session: spentSession },
      },
    );
  }

  async emptySession(username) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $REMOVE: ['session'],
      },
    );
  }

  async addVault(username, item) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $SET: { vault: item.vault, attic: item.attic },
      },
    );
  }

  async deleteVault(username) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $REMOVE: ['vault', 'attic'],
      },
    );
  }

  async setContacts(username, item) {
    await this.Entity.update(
      { pk: `U#${username}`, sk: username },
      {
        $SET: { contacts: item },
      },
    );
  }
}

module.exports = UserData;
