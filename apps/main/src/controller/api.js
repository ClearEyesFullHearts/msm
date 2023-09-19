const config = require('config');
const AuthMiddleware = require('../lib/auth');
const User = require('./actions/users');
const Message = require('./actions/messages');
const AsyncAction = require('./actions/async');
const Connection = require('./actions/connection');

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
    User.createUser(db, {
      at, key, signature, hash,
    })
      .then(({ username }) => {
        res.status(201).send();

        AsyncAction.autoUserRemoval(db, username)
          .catch((err) => {
            console.error('error on user auto removal');
            console.error(err);
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
      app: {
        locals: {
          db,
        },
      },
    } = req;
    User.getCredentials(db, { at })
      .then((challenge) => {
        res.json(challenge);
      })
      .catch((err) => {
        next(err);
      });
  },
  // Use only auth
  getUsers: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      User.getUsers({ db, auth }, { search })
        .then((users) => {
          res.json(users);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getOneUser: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      User.getUserByName({ db, auth }, at)
        .then((user) => {
          res.json(user);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getConnections: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      Connection.getConnectedUsers({ db }, { list: [...new Set(users)] })
        .then((result) => {
          res.json(result);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getInbox: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
    (req, res, next) => {
      const {
        auth,
        app: {
          locals: {
            db,
          },
        },
      } = req;
      Message.getInbox({ db, auth })
        .then((inbox) => {
          res.json(inbox);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  getMessage: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      Message.getMessage({ db, auth }, Number(msgId))
        .then((fullMessage) => {
          res.json(fullMessage);

          AsyncAction.autoMessageRemoval(db, auth.username, Number(msgId))
            .catch((err) => {
              console.error('error on message auto removal');
              console.error(err);
            });
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  // User identified
  incinerate: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      User.removeUser({ db, user: auth }, at)
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  setUserContactList: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      User.setContacts({ db, user: auth }, body)
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  setUserVaultItem: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      User.setVaultItem({ db, user: auth }, body)
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  removeUserVaultItem: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
    (req, res, next) => {
      const {
        auth,
        app: {
          locals: {
            db,
          },
        },
      } = req;
      User.removeVaultItem({ db, user: auth })
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  writeMessage: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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

      Message.writeMessage({ db, user: auth }, body)
        .then(() => {
          res.status(201).send();

          AsyncAction.notifyMessage(db, auth.username, body.to)
            .catch((err) => {
              console.error('error on message notification');
              console.error(err);
            });
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  removeMessage: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      Message.removeMessage({ db, user: auth }, Number(msgId))
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
  subscribe: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
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
      User.addSubscription({ db, user: auth }, body)
        .then(() => {
          res.status(201).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
};
