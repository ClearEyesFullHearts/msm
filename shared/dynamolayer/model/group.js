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

  async create({
    groupName,
    username,
    admin,
    key,
  }) {
    const id = uuidv4();

    const newGroup = {
      pk: id,
      sk: username,
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
      sk: username,
      groupName,
      key,
      isAdmin: admin ? 1 : 0,
    };

    const group = await this.Entity.create(newMember);
    return group;
  }

  async findMember(id, username) {
    const member = await this.Entity.get({ pk: id, sk: username });
    return member;
  }

  async findAllMembers(id) {
    const members = await this.Entity
      .query('pk').eq(id)
      .exec();

    return members;
  }
}

module.exports = GroupData;
