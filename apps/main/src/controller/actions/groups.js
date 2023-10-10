const debug = require('debug')('msm-main:group');
const ErrorHelper = require('@shared/error');
const Encryption = require('@shared/encryption');

class Group {
  static async formatGroup(db, groupId, user) {
    const members = await db.groups.findAllMembers(groupId);
    if (!members || !members.length || members.length <= 0) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Unknown group');
    }
    const askerIndex = members.findIndex((m) => m.username === `G#${user.username}`);
    if (askerIndex < 0) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
    debug('is a member');

    const [asker] = members.splice(askerIndex, 1);

    const {
      groupId: id,
      groupName,
      key,
      isAdmin,
    } = asker;

    return {
      groupId: id,
      groupName,
      key,
      isAdmin: !!isAdmin,
      members: members.map((m) => m.username.split('#')[1]),
    };
  }

  static async getOne({ db, auth }, groupId) {
    debug(`${auth.username} wants its data membership for group ${groupId}`);
    const user = await db.users.findByName(auth.username);
    if (!user) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'User not found');
    }
    debug('user exists');

    const group = await this.formatGroup(db, groupId, user);

    const { key: publicKey } = user;

    const challenge = Encryption.hybrid(JSON.stringify(group), publicKey);

    debug('data encrypted');
    return challenge;
  }

  static async getAll({ db, auth }) {
    debug(`${auth.username} wants its membership data`);
    const user = await db.users.findByName(auth.username);
    if (!user) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'User not found');
    }
    debug('user exists');

    const groups = await db.groups.findAllGroups(auth.username) || [];

    debug('groups found', groups.length);

    const promises = groups.map((g) => this.formatGroup(db, g.groupId, user));

    const result = await Promise.all(promises);

    const { key: publicKey } = user;

    const challenge = Encryption.hybrid(JSON.stringify(result), publicKey);

    debug('data encrypted');
    return challenge;
  }

  static async create({ db, user }, { name, key }) {
    debug('create group:', name);

    if (user.lastActivity < 0) {
      throw ErrorHelper.getCustomError(501, ErrorHelper.CODE.NOT_IMPLEMENTED, 'Sender account is not activated (open the welcoming email)');
    }
    debug('admin is active');

    if (user.validation !== 'VALIDATED') {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'only validated users can be create a group');
    }
    debug('admin is validated');

    const group = await db.groups.create({
      groupName: name, key, username: user.username, admin: true,
    });
    debug('group created', group.pk);

    return { id: group.pk };
  }

  static async add({ db, user }, groupId, { username, key }) {
    debug('add member:', username);

    const admin = await db.groups.findMember(groupId, user.username);

    if (!admin) {
      debug('asking member is not an member');
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
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

    if (targetUser.validation !== 'VALIDATED') {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'only validated users can be added to a group');
    }
    debug('new member is validated');

    try {
      await db.groups.createMember({
        id: groupId, groupName: admin.groupName, key, username, admin: false,
      });
      debug('new member added');

      // TODO add update group notif
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.USER_EXISTS, 'user is already a member');
      }
      throw err;
    }
  }

  static async remove({ db, user }, groupId) {
    debug('auto remove member:', user.username);

    const member = await db.groups.findMember(groupId, user.username);

    if (!member) {
      debug('asking member is not an member');
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
    debug('asking member found');

    if (member.isAdmin > 0) {
      debug('member is admin');
      const allMembers = await db.groups.findAllMembers(groupId);
      if (!allMembers.some((m) => m.isAdmin > 0 && m.username !== member.username)) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re the last admin you cannot quit');
      }
      debug('someone else is too');
    }

    await db.groups.deleteMember(groupId, user.username);
    debug('member deleted');

    // TODO add update group notif
  }

  static async write({ db, user }, groupId, { title, content }) {
    // usual checks
    const writer = await db.groups.findMember(groupId, user.username);
    if (!writer) {
      debug('writer is not an member');
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
    debug('writing member found');

    // get all members
    const members = await db.groups.findAllMembers(groupId);
    debug('group members', members.length);

    if (members.length < 2) return;

    // encrypt message for members
    const from = writer.groupName;
    const sentAt = Date.now();

    const headerPlain = {
      from,
      sentAt,
      title,
      groupId,
    };
    const fullPlain = {
      from,
      sentAt,
      title,
      content,
      groupId,
    };
    const messages = members.map((member) => {
      if (member.username !== writer.username) {
        const cleanName = member.username.split('#')[1]; // username format is `G#${username}` in groups
        return db.users.findByName(cleanName)
          .then(({ key }) => {
            const headerChallenge = Encryption.hybrid(JSON.stringify(headerPlain), key);
            const fullChallenge = Encryption.hybrid(JSON.stringify(fullPlain), key);
            debug('write group message to', cleanName);
            return db.messages.create({
              username: cleanName,
              header: headerChallenge,
              full: fullChallenge,
            });
          });
      }
      return Promise.resolve();
    });
    // send message and notif
    await Promise.all(messages);
  }
}

module.exports = Group;
