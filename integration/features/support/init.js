const fs = require('fs');
const apickli = require('apickli');
const {
  Before, BeforeAll, After,
} = require('@cucumber/cucumber');
const Util = require('./utils');

// lengths: ESK = 3222 SSK = 898
// lengths: ESK = 3222 SSK = 902

// BeforeAll((cb) => {
//   Util.emptyTable()
//     .then(() => Util.restoreTable())
//     .then(cb);
// });

Before(function () {
  const host = 'test.ysypya.com';
  const protocol = 'https';

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
  Object.keys(this.apickli.scenarioVariables).forEach((p) => {
    if (p.startsWith('SOCKET')) {
      this.apickli.scenarioVariables[p].close();
    }
    if (p.startsWith('USER')) {
      promises.push(Util.recordInDB(this.apickli.scenarioVariables[p]));
    }
  });
  if (promises.length > 0) {
    await Promise.all(promises);
  }
});
