const dynamoose = require('dynamoose');
const Data = require('./index');
const UserData = require('./model/user');

const getRandomString = (length, base64 = false) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  let str = '';
  for (let i = 0; i < length; i += 1) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  if (base64) {
    return Buffer.from(str).toString('base64');
  }
  return str;
};

const getRandomChallenge = () => ({
  token: getRandomString(1500),
  passphrase: getRandomString(684),
  iv: getRandomString(24),
});

// Create new DynamoDB instance
// const ddb = new dynamoose.aws.ddb.DynamoDB({
//   credentials: {
//     accessKeyId: 'local',
//     secretAccessKey: 'local',
//   },
//   region: 'us-west-2',
// });

// // Set DynamoDB instance to the Dynamoose DDB instance
// dynamoose.aws.ddb.set(ddb);
// dynamoose.aws.ddb.local();

(async () => {
  const db = new Data({
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
    region: 'us-west-2',
    local: true,
  },
  { frozen: 7776000000, inactivity: 2592000000 });
  db.init();

  let arr = UserData.createSearchTerms('sM7zVVj24ykcoPuLdD7J4BdwXKZiUwoYwvVwIxKHea2OEUSPqDLky15CS0iCDRtDHgRFMY3EorBLMFOIIcDbqmatIi9CMa0O9hSM1tXoMCbZvb69w8LRte9wX2n');
  console.log('length for 124', arr.length)
  arr = UserData.createSearchTerms(getRandomString(30));
  console.log('length for 50', arr.length)
})();
