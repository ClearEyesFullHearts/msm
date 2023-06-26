const fs = require('fs');
const apickli = require('apickli');
const axios = require('axios');
const {
  Before, After, BeforeAll, AfterAll,
} = require('@cucumber/cucumber');
const config = require('config');

// BeforeAll((cb) => {
// });

Before(function () {
  const host = config.get('base.instance.host');
  const port = config.get('base.instance.port');
  const protocol = config.get('base.instance.protocol');

  this.apickli = new apickli.Apickli(protocol, `${host}:${port}`, 'data');
  this.apickli.addRequestHeader('Cache-Control', 'no-cache');
  this.apickli.addRequestHeader('Content-Type', 'application/json');

  this.axios = axios.create({
    baseURL: `${protocol}://${host}:${port}`,
    timeout: 1000,
  });
});

// After(async () => {

// });

// AfterAll((cb) => {

// });
