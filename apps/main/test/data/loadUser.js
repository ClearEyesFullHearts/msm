const fs = require('fs');

module.exports = (id) => {
  const priv = fs.readFileSync(`${__dirname}/user${id}/private.pem`).toString().split('\n----- SIGNATURE -----\n');
  const pub = fs.readFileSync(`${__dirname}/user${id}/public.pem`).toString().split('\n----- SIGNATURE -----\n');

  const user = {
    id,
    username: `user${id}`,
    searchTerms: ['USE', 'USER', `USER${id}`, 'SER', `SER${id}`, `ER${id}`],
    key: pub[0],
    signature: pub[1],
    lastActivity: Date.now(),
    security: 'safe',
    size: 5,
    private: {
      key: priv[0],
      signature: priv[1],
    },
  };
  return user;
};
