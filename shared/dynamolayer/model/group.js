const dynamoose = require('dynamoose');
const { v4: uuidv4 } = require('uuid');

class GroupData {
  constructor() {
    this.Entity = null;
    this.groupSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
        map: 'groupId',
      },
      sk: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 35,
        rangeKey: true,
        map: 'username',
        index: {
          name: 'UserGroupIndex',
          global: true,
          rangeKey: 'pk',
        },
      },
      groupName: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
        minLength: 684,
        maxLength: 684,
      },
      isAdmin: {
        type: Number,
        required: true,
        default: 0,
      },
    });
  }

  init(options) {
    this.Entity = dynamoose.model('Group', this.groupSchema, options);
  }

  async batchDelete(keys) {
    if (!keys.length) return;

    const size = 24; const arrayOfBatch = [];
    for (let i = 0; i < keys.length; i += size) {
      const batchKeys = keys.slice(i, i + size);
      arrayOfBatch.push(this.Entity.batchDelete(batchKeys));
    }

    await Promise.all(arrayOfBatch);
  }

  async create({
    groupName,
    username,
    admin,
    key,
  }) {
    const id = uuidv4();

    const newGroup = {
      pk: id,
      sk: `G#${username}`,
      groupName,
      key,
      isAdmin: admin ? 1 : 0,
    };

    const group = await this.Entity.create(newGroup);
    return group;
  }

  async createMember({
    id,
    groupName,
    username,
    admin,
    key,
  }) {
    const newMember = {
      pk: id,
      sk: `G#${username}`,
      groupName,
      key,
      isAdmin: admin ? 1 : 0,
    };

    const group = await this.Entity.create(newMember);
    return group;
  }

  async deleteMember(id, username) {
    const result = await this.Entity.delete({ pk: id, sk: `G#${username}` });
    return result;
  }

  async deleteGroup(id) {
    const members = await this.Entity.query('pk').eq(id).exec();
    const keys = members.map((m) => ({ pk: m.groupId, sk: m.username }));

    await this.batchDelete(keys);
  }

  async findMember(id, username) {
    const member = await this.Entity.get({ pk: id, sk: `G#${username}` });
    return member;
  }

  async findAllMembers(id) {
    const members = await this.Entity
      .query('pk').eq(id)
      .exec();

    return members;
  }

  async findAllGroups(username) {
    const groups = await this.Entity
      .query('sk').eq(`G#${username}`)
      .using('UserGroupIndex')
      .exec();

    return groups;
  }

  async setNewKeys(id, keys) {
    const promises = keys.map((k) => this.Entity.update(
      { pk: id, sk: `G#${k.username}` },
      {
        $SET: { key: k.key },
      },
    ));

    await Promise.all(promises);
  }
}

module.exports = GroupData;
