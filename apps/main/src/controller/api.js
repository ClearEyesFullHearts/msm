const AWSXRay = require('@shared/tracing');
const AuthMiddleware = require('../lib/auth');
const User = require('./actions/users');
const Message = require('./actions/messages');
const AsyncAction = require('./actions/async');
const Connection = require('./actions/connection');
const Group = require('./actions/groups');

module.exports = {
  // Anonymous
  createUser: (req, res, next) => {
    const {
      body: {
        at,
        key,
        signature,
        hash,
        pass,
        kill,
      },
      app: {
        locals: {
          db,
        },
      },
    } = req;

    AWSXRay.captureAsyncFunc('User.createUser', User.createUser(db, {
      at, key, signature, hash, pass, kill,
    }))
      .then(({ username }) => {
        AWSXRay.captureAsyncFunc('AsyncAction.autoUserRemoval', AsyncAction.autoUserRemoval(db, username))
          .catch((err) => {
            console.error('error on user auto removal');
            console.error(err);
          })
          .finally(() => {
            res.status(201).send();
          });
      })
      .catch((err) => {
        next(err);
      });
  },
  login: (req, res, next) => {
    const {
      params: {
        at,
      },
      headers,
      app: {
        locals: {
          db,
          secret,
        },
      },
    } = req;

    const hashedPass = headers['x-msm-pass'];
    AWSXRay.captureAsyncFunc('User.getCredentials', User.getCredentials({ db, secret }, { at, hashedPass }))
      .then((challenge) => {
        res.json(challenge);
      })
      .catch((err) => {
        next(err);
      });
  },
  // Use only auth
  searchUsers: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        query: {
          user,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.getUsers', User.getUsers({ db }, { search: user }))
        .then((users) => {
          res.json(users);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getOneUser: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          at,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.getUserByName', User.getUserByName({ db, auth }, at))
        .then((user) => {
          res.json(user);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getUsersList: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        query: {
          list,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      const users = list[0].split(',').map((u) => u.trim());
      AWSXRay.captureAsyncFunc('User.getList', User.getList({ db }, { list: [...new Set(users)] }))
        .then((result) => {
          res.json(result);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getConnections: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        query: {
          list,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      const users = list[0].split(',').map((u) => u.trim());
      AWSXRay.captureAsyncFunc('Connection.getConnectedUsers', Connection.getConnectedUsers({ db }, { list: [...new Set(users)] }))
        .then((result) => {
          res.json(result);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getInbox: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Message.getInbox', Message.getInbox({ db, auth }))
        .then((inbox) => {
          res.json(inbox);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getMessage: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          msgId,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Message.getMessage', Message.getMessage({ db, auth }, Number(msgId)))
        .then((fullMessage) => {
          AWSXRay.captureAsyncFunc('AsyncAction.autoMessageRemoval', AsyncAction.autoMessageRemoval(db, auth.username, Number(msgId)))
            .catch((err) => {
              console.error('error on message auto removal');
              console.error(err);
            })
            .finally(() => {
              res.json(fullMessage);
            });
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getGroups: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.getAll', Group.getAll({ db, auth }))
        .then((groups) => {
          res.json(groups);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getOneGroup: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.getOne', Group.getOne({ db, auth }, id))
        .then((member) => {
          res.json(member);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  // User identified
  incinerate: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          at,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.removeUser', User.removeUser({ db, user: auth }, at))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  setUserContactList: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.setContacts', User.setContacts({ db, user: auth }, body))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  setUserVaultItem: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.setVaultItem', User.setVaultItem({ db, user: auth }, body))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  removeUserVaultItem: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.removeVaultItem', User.removeVaultItem({ db, user: auth }))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  writeMessage: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Message.writeMessage', Message.writeMessage({ db, user: auth }, body))
        .then(() => {
          AWSXRay.captureAsyncFunc('AsyncAction.notifyMessage', AsyncAction.notifyMessage(auth.username, body.to))
            .catch((err) => {
              console.error('error on message notification');
              console.error(err);
            })
            .finally(() => {
              res.status(201).send();
            });
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  removeMessage: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          msgId,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Message.removeMessage', Message.removeMessage({ db, user: auth }, Number(msgId)))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  subscribe: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.addSubscription', User.addSubscription({ db, user: auth }, body))
        .then(() => {
          res.status(201).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  createGroup: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.create', Group.create({ db, user: auth }, body))
        .then((result) => {
          res.status(201).json(result);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  deleteGroup: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.delete', Group.delete({ db, user: auth }, id))
        .then(() => {
          res.status(204).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  setGroupName: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
        },
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.rename', Group.rename({ db, user: auth }, id, body))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  groupAddMember: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
        },
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.add', Group.add({ db, user: auth }, id, body))
        .then(() => {
          res.status(201).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  groupRemoveMember: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.remove', Group.remove({ db, user: auth }, id))
        .then(() => {
          res.status(204).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  setMemberStatus: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
          username,
        },
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.setAdmin', Group.setAdmin({ db, user: auth }, id, username, body))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  revokeMember: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
          username,
        },
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.revoke', Group.revoke({ db, user: auth }, id, username, body))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  writeGroup: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        params: {
          id,
        },
        body,
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('Group.write', Group.write({ db, user: auth }, id, body))
        .then(() => {
          res.status(201).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
};
