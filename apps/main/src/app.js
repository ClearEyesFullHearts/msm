const path = require('path');
const express = require('express');
const config = require('config');
const OpenApiValidator = require('express-openapi-validator');
const debug = require('debug')('msm-main:server');
const Data = require('@shared/dynamolayer');
const Secret = require('@shared/secrets');
const helmet = require('helmet');
const morgan = require('morgan');
const ErrorHelper = require('@shared/error');
const CORS = require('./lib/cors');

const APP_ID = 'msm-main';

class MSMMain {
  constructor() {
    this.app = express();
    this.app.use(helmet());
    this.app.disable('x-powered-by');
    this.app.use(CORS.options());
    this.app.options('/*', (req, res) => res.sendStatus(200));
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());
    this.app.use(morgan('combined'));

    this.app.locals.appId = APP_ID;

    this.doc = path.join(__dirname, 'spec/openapi.yaml');
  }

  async start() {
    debug('STARTED');

    const port = config.get('instance.port');

    const data = new Data(config.get('dynamo'));
    await data.init();
    this.app.locals.db = data;

    const secret = new Secret(['KEY_AUTH_SIGN', 'KEY_WALLET_SECRET']);
    await secret.getSecretValue();
    this.app.locals.secret = secret;

    this.app.get('/health', (req, res) => {
      res.status(200).send();
    });

    //  Install the OpenApiValidator on your express app
    this.app.use(
      OpenApiValidator.middleware({
        apiSpec: this.doc,
        validateApiSpec: true,
        validateResponses: true, // default false
        // Provide the base path to the operation handlers directory
        operationHandlers: path.join(__dirname, 'controller'), // default false
      }),
    );

    this.app.use((req, res) => {
      res.status(404).send("Sorry can't find that!");
    });

    this.app.use(ErrorHelper.catchMiddleware());

    return new Promise(((resolve) => {
      this.app.listen(port, () => {
        debug('Your server is listening on port %d', port);
        resolve();
      });
    }));
  }
}

module.exports = MSMMain;
