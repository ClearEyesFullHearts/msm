const fs = require('fs');
const crypto = require('crypto');
const apickli = require('apickli');
const config = require('config');
const {
  Before, BeforeAll, After,
} = require('@cucumber/cucumber');
const Util = require('./utils');

BeforeAll((cb) => {
  if (process.env.RESET_FIXTURE) {
    Util.emptyTable()
      .then(() => Util.restoreTable())
      // .then(() => Util.backupTable())
      .then(cb);
  } else {
    cb();
  }
});

Before(function () {
  const host = config.get('instance.host');
  const protocol = config.get('instance.protocol');

  this.apickli = new apickli.Apickli(protocol, host, 'data');
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

After(async function () {
  const promises = [];
  let socketClosing = false;
  Object.keys(this.apickli.scenarioVariables).forEach((p) => {
    if (p.startsWith('SOCKET')) {
      this.apickli.scenarioVariables[p].close();
      socketClosing = true;
    }
    if (p.startsWith('USER')) {
      promises.push(Util.recordInDB(this.apickli.scenarioVariables[p]));
    }
    if (p.startsWith('GROUP_ID')) {
      promises.push(Util.removeGroup(this.apickli.scenarioVariables[p]));
    }
  });
  if (promises.length > 0) {
    await Promise.all(promises);
  }
  if (socketClosing) {
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
});
