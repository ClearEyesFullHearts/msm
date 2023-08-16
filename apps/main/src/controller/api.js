const config = require('config');
const AuthMiddleware = require('../lib/auth');
const User = require('./actions/users');
const Message = require('./actions/messages');
const AsyncAction = require('./actions/async');

module.exports = {
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
      .then(({ id }) => {
        res.status(201).send();

        AsyncAction.autoUserRemoval(db, id)
          .catch((err) => {
            console.error('error on user auto removal');
            console.error(err);
          });
      })
      .catch((err) => {
        next(err);
      });
  },
  getUsers: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
    (req, res, next) => {
      const {
        query: {
          search,
        },
        app: {
          locals: {
            db,
          },
        },
      } = req;
      User.getUsers(db, { search })
        .then((users) => {
          res.json(users);
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
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
      User.removeUser(db, at, auth)
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
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
  getOneUser: [
    AuthMiddleware.verify(config.get('auth'), config.get('timer.removal.session')),
    (req, res, next) => {
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
      User.getUserByName(db, at)
        .then((user) => {
          res.json(user);
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
      User.setContacts(db, auth, body)
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
      User.setVaultItem(db, auth, body)
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
      User.removeVaultItem(db, auth.username)
        .then(() => {
          res.status(200).send();
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
      Message.getInbox(db, auth)
        .then((inbox) => {
          res.json(inbox);
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

      Message.writeMessage(db, body, auth)
        .then(() => {
          res.status(201).send();
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
      Message.getMessage(db, msgId, auth)
        .then((fullMessage) => {
          res.json(fullMessage);

          AsyncAction.autoMessageRemoval(db, msgId)
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
      Message.removeMessage(db, Number(msgId), auth)
        .then(() => {
          res.status(200).send();
        })
        .catch((err) => {
          next(err);
        });
    },
  ],
};
