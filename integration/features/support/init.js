const fs = require('fs');
const apickli = require('apickli');
const backup = require('mongodb-backup-4x');
const restore = require('mongodb-restore');
const mongoose = require('mongoose');
const {
  Before, After, BeforeAll, AfterAll,
} = require('@cucumber/cucumber');
const config = require('config');

// 2tMoQaqematKU => double validation OK
// eSHmatFIR1eg => double validation KO

BeforeAll((cb) => {
  // backup({
  //   uri: config.get('mongo.url'),
  //   root: __dirname,
  //   callback: cb,
  // });

  mongoose.connect(config.get('mongo.url'), { useNewUrlParser: true, useUnifiedTopology: true })
    .then(
      () => {
        mongoose.connection.db.collections()
          .then((collections) => Promise.all(
            collections.map((collection) => collection.deleteMany({})),
          ))
          .then(
            () => {
              restore({
                uri: config.get('mongo.url'),
                root: `${__dirname}/msm`,
                callback: cb,
              });
            },
            (err) => { cb(err); },
          );
      },
    ).catch((err) => { cb(err); });
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
});

// After(async () => {

// });

AfterAll((cb) => {
  mongoose.disconnect().then(() => { cb(); });
});
