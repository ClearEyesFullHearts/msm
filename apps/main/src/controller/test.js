const DoubleRatchet = require('../../../../integration/features/support/doubleRatchet');

let bobSession;
let currentSession;

module.exports = {
  // Anonymous
  postTest: (req, res, next) => {
    const {
      body: {
        RK, sessionId,
      },
    } = req;

    bobSession = new DoubleRatchet();
    bobSession.init(RK);
    currentSession = sessionId;
    res.json({ publicKey: bobSession.publicKey });
  },
  // Anonymous
  putTest: (req, res, next) => {
    const {
      body: {
        publicKey,
        message,
      },
    } = req;

    const recived = bobSession.receive(publicKey, message);
    console.log('recived', recived);

    const resp1 = bobSession.send(`I received: "${recived}"`, currentSession);
    const resp2 = bobSession.send('Thank you for your kind words', currentSession);

    res.json({ resp1, resp2 });
  },
};
