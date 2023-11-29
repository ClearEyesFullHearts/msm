const apickli = require('apickli');
const config = require('config');
const {
  Before, BeforeAll, AfterAll,
} = require('@cucumber/cucumber');
const { setDefaultTimeout } = require('@cucumber/cucumber');
const Util = require('../../../features/support/utils');

setDefaultTimeout(60 * 1000);

BeforeAll((cb) => {
  Util.emptyTable()
    .then(cb);
  // Util.emptyTable()
  //   .then(() => Util.restoreTable('backupdb_origin'))
  // // .then(() => Util.backupTable())
  //   .then(cb);
});

Before(function () {
  const host = config.get('instance.host');
  const protocol = config.get('instance.protocol');

  this.apickli = new apickli.Apickli(protocol, host, 'data');
  this.apickli.addRequestHeader('Cache-Control', 'no-cache');
  this.apickli.addRequestHeader('Content-Type', 'application/json');
  this.userCounter = 0;

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
});

AfterAll((cb) => {
  Util.backupTable('backupdb_target')
    .then(cb);
});
