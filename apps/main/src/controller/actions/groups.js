const debug = require('debug')('msm-main:group');
const ErrorHelper = require('@shared/error');
const Encryption = require('@shared/encryption');

async function formatGroup(db, groupId, user) {
  const members = await db.groups.findAllMembers(groupId);
  if (!members || !members.length || members.length <= 0) {
    throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Unknown group');
  }
  debug('group exists');
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
class Group {
  static async getOne({ db, auth }, groupId) {
    debug(`${auth.username} wants its data membership for group ${groupId}`);
    const user = await db.users.findByName(auth.username);
    if (!user) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'User not found');
    }
    debug('user exists');

    const group = await formatGroup(db, groupId, user);

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

    const promises = groups.map((g) => formatGroup(db, g.groupId, user));

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

  static async delete({ db, user }, groupId) {
    debug('delete group:', groupId);

    const admin = await db.groups.findMember(groupId, user.username);

    if (!admin) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
    debug('asking member found');
    if (admin.isAdmin < 1) {
      throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.BAD_ROLE, 'Only the group admin cann delete the group');
    }
    debug('asking member is an admin');

    await db.groups.deleteGroup(groupId);
    debug('group is deleted');
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

  static async setAdmin({ db, user }, groupId, username, { isAdmin }) {
    debug(`set admin status of ${username} to ${isAdmin}`);
    const admin = await db.groups.findMember(groupId, user.username);

    if (!admin) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
    debug('asking member found');
    if (admin.isAdmin < 1) {
      throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.BAD_ROLE, 'Only the group admin can change member\'s status');
    }
    debug('asking member is an admin');

    const target = await db.groups.findMember(groupId, username);
    if (!target) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Target is not part of this group');
    }
    debug('target member found');

    const status = isAdmin ? 1 : 0;
    if (target.isAdmin === status) {
      debug('no status change');
      return;
    }

    if (isAdmin) {
      await db.groups.setAdminStatus(groupId, username, isAdmin);
      debug('target is admin');
      return;
    }
    if (target.isAdmin > 0) {
      if (target.username !== admin.username) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot change another admin status');
      }
      debug('self status update');

      const allMembers = await db.groups.findAllMembers(groupId);
      if (!allMembers.some((m) => m.isAdmin > 0 && m.username !== admin.username)) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re the last admin you cannot quit');
      }
      debug('someone else is admin');
      await db.groups.setAdminStatus(groupId, username, isAdmin);
      debug('target is no longer admin');
    }
  }

  static async revoke({ db, user }, groupId, revoked, newKeys) {
    debug('revoke member:', revoked);

    const members = await db.groups.findAllMembers(groupId);
    const admin = members.find((m) => m.username === `G#${user.username}`);

    if (!admin) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You\'re not part of this group');
    }
    debug('asking member found');

    if (admin.isAdmin <= 0) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'Only admins can revoke a member');
    }
    debug('asking member is admin');

    if (admin.username === `G#${revoked}`) {
      throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.UNAUTHORIZED, 'You can\'t revoke yourself');
    }
    debug('asking member is not revokation target');

    if (!members.some((m) => m.username === `G#${revoked}`)) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Revokation target is not a member');
    }
    debug('revokation target is a member');

    const validKeys = newKeys.every((k) => {
      if (k.username !== revoked) {
        return members.some((m) => `G#${k.username}` === m.username);
      }
      return false;
    });

    if (!validKeys || newKeys.length !== members.length - 1) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Every member should have a new key');
    }
    debug('New keys are correct');

    await db.groups.deleteMember(groupId, revoked);
    debug('member deleted');

    await db.groups.setNewKeys(groupId, newKeys);
    debug('Keys changed');

    // TODO add update group notif
  }

  static async write({ db, user }, groupId, { title, content }) {
    // usual checks
    const writer = await db.groups.findMember(groupId, user.username);
    if (!writer) {
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
          .then((target) => {
            if (target) {
              const { key } = target;
              const headerChallenge = Encryption.hybrid(JSON.stringify(headerPlain), key);
              const fullChallenge = Encryption.hybrid(JSON.stringify(fullPlain), key);
              debug('write group message to', cleanName);
              return db.messages.create({
                username: cleanName,
                header: headerChallenge,
                full: fullChallenge,
              });
            }
            debug('user do not exists, removed from the group');
            return db.groups.deleteMember(groupId, cleanName);
          });
      }
      return Promise.resolve();
    });
    // send message and notif
    await Promise.all(messages);
  }
}

module.exports = Group;
