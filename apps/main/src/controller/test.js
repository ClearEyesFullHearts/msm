const SimpleRatchet = require('../../../../integration/features/support/simpleRatchet');

let current = new SimpleRatchet();
module.exports = {
  // Anonymous
  post: (req, res, next) => {
    const {
      body,
    } = req;
    current = new SimpleRatchet();
    current.initChains(false, body.pk);
  },
  put: (req, res, next) => {
    const {
      body: { cypher, iv, counter },
    } = req;

    console.log('received', cypher, iv, counter);
    const message = current.receive({ cypher, iv, counter });
    console.log('message', message);

    const resp1 = current.send(`I received "${message}"`);
    const resp2 = current.send('It is working');

    res.json({ resp1, resp2 });
  },
};
