const path = require('path');
const express = require('express');
const config = require('config');
const OpenApiValidator = require('express-openapi-validator');
const debug = require('debug')('msm-main:server');
const Data = require('@shared/dynamolayer');
const helmet = require('helmet');
const CORS = require('./lib/cors');
const ErrorHelper = require('./lib/error');
const Encryption = require('@shared/encryption');
const MessageAction = require('./controller/actions/messages');

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

    this.app.locals.appId = APP_ID;

    this.doc = path.join(__dirname, 'spec/openapi.yaml');
  }

  async start() {
    debug('STARTED');

    const port = config.get('instance.port');

    const data = new Data(config.get('dynamo'), {
      frozen: config.get('timer.removal.frozen'),
      inactivity: config.get('timer.removal.inactivity'),
    });
    await data.init();
    this.app.locals.db = data;

    debug('clear all read messages');
    await data.clearReadMessages();
    debug('clear all inactive users');
    await data.deactivateAccounts();
    debug('unfreeze usernames');
    await data.unfreezeUsername();

    this.app.get('/health', (req, res) => {
      res.status(200).send();
    });

    // clear everything once a day
    this.interval = setInterval(async () => {
      debug('clear all read messages');
      await data.clearReadMessages();
      debug('clear all inactive users');
      await data.deactivateAccounts();
      debug('unfreeze usernames');
      await data.unfreezeUsername();
      debug('send report');
      await this.sendActivityReport();
    }, config.get('timer.interval.clear'));

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

  async sendActivityReport() {
    const {
      locals: {
        db,
      },
    } = this.app;

    const target = await db.users.findByName(config.get('instance.reportTarget'));

    if (target) {
      const {
        activeUsers,
        waitingMessages,
      } = await db.activityReport();

      debug('send report message');
      const reportTitle = 'Here is today\'s activity report';
      const reportContent = `We have ${activeUsers} active users\nWe have ${waitingMessages} unread messages\n`;
      const encrytedMsg = Encryption.encryptMessage(target, reportTitle, reportContent);
      await MessageAction.writeMessage(db, encrytedMsg, { username: 'Daily Report' });
      debug('report message sent');
    }
  }
}

module.exports = MSMMain;
