const AWSXRay = require('aws-xray-sdk');
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
      },
      app: {
        locals: {
          db,
        },
      },
    } = req;

    AWSXRay.captureAsyncFunc('User.createUser', (subsegment) => {
      User.createUser(db, {
        at, key, signature, hash,
      })
        .then(({ username }) => {
          AsyncAction.autoUserRemoval(db, username)
            .catch((err) => {
              console.error('error on user auto removal');
              console.error(err);
            })
            .finally(() => {
              res.status(201).send();
              subsegment.close();
            });
        })
        .catch((err) => {
          next(err);
          subsegment.close(err);
        });
    });
  },
  login: (req, res, next) => {
    const {
      params: {
        at,
      },
      app: {
        locals: {
          db,
          secret,
        },
      },
    } = req;
    AWSXRay.captureAsyncFunc('User.getCredentials', (subsegment) => {
      User.getCredentials({ db, secret }, { at })
        .then((challenge) => {
          res.json(challenge);
          subsegment.close();
        })
        .catch((err) => {
          next(err);
          subsegment.close(err);
        });
    });
  },
  // Use only auth
  getUsers: [
    AuthMiddleware.verify(),
    (req, res, next) => {
      const {
        auth,
        query: {
          search,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;

      AWSXRay.captureAsyncFunc('User.getUsers', (subsegment) => {
        User.getUsers({ db, auth }, { search })
          .then((users) => {
            res.json(users);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('User.getUserByName', (subsegment) => {
        User.getUserByName({ db, auth }, at)
          .then((user) => {
            res.json(user);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('Connection.getConnectedUsers', (subsegment) => {
        const users = list[0].split(',').map((u) => u.trim());
        Connection.getConnectedUsers({ db }, { list: [...new Set(users)] })
          .then((result) => {
            res.json(result);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('Message.getInbox', (subsegment) => {
        Message.getInbox({ db, auth })
          .then((inbox) => {
            res.json(inbox);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('Message.getMessage', (subsegment) => {
        Message.getMessage({ db, auth }, Number(msgId))
          .then((fullMessage) => {
            AsyncAction.autoMessageRemoval(db, auth.username, Number(msgId))
              .catch((err) => {
                console.error('error on message auto removal');
                console.error(err);
              })
              .finally(() => {
                res.json(fullMessage);
                subsegment.close();
              });
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.getAll', (subsegment) => {
        Group.getAll({ db, auth })
          .then((groups) => {
            res.json(groups);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.getOne', (subsegment) => {
        Group.getOne({ db, auth }, id)
          .then((member) => {
            res.json(member);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('User.removeUser', (subsegment) => {
        User.removeUser({ db, user: auth }, at)
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('User.setContacts', (subsegment) => {
        User.setContacts({ db, user: auth }, body)
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('User.setVaultItem', (subsegment) => {
        User.setVaultItem({ db, user: auth }, body)
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('User.removeVaultItem', (subsegment) => {
        User.removeVaultItem({ db, user: auth })
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('Message.writeMessage', (subsegment) => {
        Message.writeMessage({ db, user: auth }, body)
          .then(() => {
            AsyncAction.notifyMessage(auth.username, body.to)
              .catch((err) => {
                console.error('error on message notification');
                console.error(err);
              })
              .finally(() => {
                res.status(201).send();
                subsegment.close();
              });
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('Message.removeMessage', (subsegment) => {
        Message.removeMessage({ db, user: auth }, Number(msgId))
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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

      AWSXRay.captureAsyncFunc('User.addSubscription', (subsegment) => {
        User.addSubscription({ db, user: auth }, body)
          .then(() => {
            res.status(201).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.create', (subsegment) => {
        Group.create({ db, user: auth }, body)
          .then((result) => {
            res.status(201).json(result);
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.delete', (subsegment) => {
        Group.delete({ db, user: auth }, id)
          .then(() => {
            res.status(204).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.add', (subsegment) => {
        Group.add({ db, user: auth }, id, body)
          .then(() => {
            res.status(201).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.remove', (subsegment) => {
        Group.remove({ db, user: auth }, id)
          .then(() => {
            res.status(204).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.setAdmin', (subsegment) => {
        Group.setAdmin({ db, user: auth }, id, username, body)
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.revoke', (subsegment) => {
        Group.revoke({ db, user: auth }, id, username, body)
          .then(() => {
            res.status(200).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
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
      AWSXRay.captureAsyncFunc('Group.write', (subsegment) => {
        Group.write({ db, user: auth }, id, body)
          .then(() => {
            res.status(201).send();
            subsegment.close();
          })
          .catch((err) => {
            next(err);
            subsegment.close(err);
          });
      });
    },
  ],
};
