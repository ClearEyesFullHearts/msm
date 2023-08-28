const fs = require('fs');
const apickli = require('apickli');
const {
  Before, BeforeAll,
} = require('@cucumber/cucumber');
const config = require('config');
const Util = require('./utils');

// lengths: ESK = 3222 SSK = 898
// lengths: ESK = 3222 SSK = 902

BeforeAll((cb) => {
  process.env.AWS_REGION = config.get('dynamo.region');
  process.env.AWS_ACCESS_KEY_ID = config.get('dynamo.accessKeyId');
  process.env.AWS_SECRET_ACCESS_KEY = config.get('dynamo.secretAccessKey');
  // Util.backupTable().then(cb);
  Util.emptyTable()
    .then(() => Util.restoreTable())
    .then(cb);
});

Before(function () {
  const host = config.get('base.instance.host');
  const port = config.get('base.instance.port');
  const protocol = config.get('base.instance.protocol');

  this.apickli = new apickli.Apickli(protocol, `${host}:${port}`, 'data');
  this.apickli.addRequestHeader('Cache-Control', 'no-cache');
  this.apickli.addRequestHeader('Content-Type', 'application/json');

  this.get = (url) => new Promise((resolve, reject) => {
    this.apickli.get(url, (error) => {
      if (error) {
        reject(error);
      }

      resolve();
    });
  });
  this.post = (url) => new Promise((resolve, reject) => {
    this.apickli.post(url, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
  this.put = (url) => new Promise((resolve, reject) => {
    this.apickli.put(url, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
  this.delete = (url) => new Promise((resolve, reject) => {
    this.apickli.delete(url, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });

  const fileContent = fs.readFileSync(`${__dirname}/../../data/randoms.json`);
  const arrUsers = JSON.parse(fileContent);
  for (let i = 0; i < arrUsers.length; i += 1) {
    this.apickli.setGlobalVariable(`RANDOM_USER.${i}`, arrUsers[i]);
  }
});
