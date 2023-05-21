const config = require('config');
const logger = require('debug');

const debug = logger('msm-main:cors');

class CORSMiddleware {
  static options() {
    const corsHeaders = config.get('instance.cors');
    debug('CORS headers defined', corsHeaders);
    return function corsOptionsReq(req, res, next) {
      Object.keys(corsHeaders).forEach((h) => {
        res.header(h, corsHeaders[h]);
      });
      next();
    };
  }
}

module.exports = CORSMiddleware;
