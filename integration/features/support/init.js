const fs = require('fs');
const apickli = require('apickli');
const backup = require('mongodb-backup-4x');
const {
  Before, After, BeforeAll, AfterAll,
} = require('@cucumber/cucumber');
const config = require('config');

// BeforeAll((cb) => {
//   backup({
//     uri: config.get('mongo.url'),
//     root: __dirname,
//     callback: cb,
//   });
// });

Before(function () {
  const host = config.get('base.instance.host');
  const port = config.get('base.instance.port');
  const protocol = config.get('base.instance.protocol');

  this.apickli = new apickli.Apickli(protocol, `${host}:${port}`, 'data');
  this.apickli.addRequestHeader('Cache-Control', 'no-cache');
  this.apickli.addRequestHeader('Content-Type', 'application/json');
});

// After(async () => {

// });

// AfterAll((cb) => {

// });
