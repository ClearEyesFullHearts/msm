const fs = require('fs');
const Util = require('../features/support/utils');

const ORIGIN_TABLE = 'MyTestTable';
const TARGET_TABLE = 'TestTableMSM';

(async function () {
  await Util.backupTable(ORIGIN_TABLE);
  console.log('Util.backupTable ok');
  const dynamoTable = JSON.parse(fs.readFileSync(`./data/msm/${ORIGIN_TABLE}.json`));
  const l = dynamoTable.length;
  for (let i = 0; i < l; i += 1) {
    const document = dynamoTable[i];
    if (document.pk.startsWith('S#')) {
      const username = document.pk;
      const searchTerm = document.sk;

      document.pk = searchTerm;
      document.sk = username.split('#')[1];
      delete document.at;
    }
  }
  console.log('modif file ok');

  fs.writeFileSync(`./data/msm/${TARGET_TABLE}.json`, JSON.stringify(dynamoTable));
  console.log('file written ok');

  await Util.restoreTable(TARGET_TABLE, TARGET_TABLE);
  console.log('Util.restoreTable ok');
}());
