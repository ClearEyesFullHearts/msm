const User = require('./actions/users');

module.exports = {
  createUser: (req, res, next) => {
    const {
      body: {
        at, key,
      },
      app: {
        locals: {
          db,
        },
      },
    } = req;
    User.createUser(db, { at, key })
      .then((challenge) => {
        console.log('challenge', challenge);
        res.statusCode = 201;
        res.json(challenge);
      })
      .catch((err) => {
        next(err);
      });
  },
  getUsers: () => {},
  login: (req, res, next) => {
    const {
      body: {
        at,
      },
      app: {
        locals: db,
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
  getInbox: () => {},
  writeMessage: () => {},
  getMessage: () => {},
};
