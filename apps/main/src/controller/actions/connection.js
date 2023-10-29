const debug = require('debug')('msm-main:connection');
const AWSXRay = require('@shared/tracing');

class Connection {
  static async getConnectedUsers({ db }, { list }) {
    debug('search for connected users:', list);
    const connections = await db.connections.findAll(list);

    debug('found', connections.length);
    return connections.map(({
      sk,
    }) => (sk));
  }
}

module.exports = AWSXRay.captureClass(Connection);
