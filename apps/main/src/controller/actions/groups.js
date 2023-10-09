const debug = require('debug')('msm-main:group');
const ErrorHelper = require('@shared/error');

class Group {
  static async create({ db, user }, { name, key }) {
    debug('create group:', name);

    if (user.lastActivity < 0) {
      throw ErrorHelper.getCustomError(501, ErrorHelper.CODE.NOT_IMPLEMENTED, 'Sender account is not activated (open the welcoming email)');
    }

    const group = await db.groups.create({
      groupName: name, key, username: user.username, admin: true,
    });
    debug('group created', group.pk);

    return { id: group.pk };
  }

  static async add({ db, user }, groupId, { username, key }) {
    debug('add member:', username);

    const admin = await db.groups.findMember(groupId, user.username);
    debug('asking member found');
    if (admin.isAdmin < 1) {
      debug('asking member is not an admin');
      throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.BAD_ROLE, 'Only the group admin cann add a member');
    }

    const targetUser = await db.users.findByName(username);
    if (!targetUser || targetUser.lastActivity < 0) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'target @ not found');
    }
    debug('new member is a known active user');

    try {
      await db.groups.createMember({
        id: groupId, groupName: admin.groupName, key, username, admin: false,
      });
      debug('new member added');
    } catch (err) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.USER_EXISTS, 'user is already a member');
    }
  }
}

module.exports = Group;
