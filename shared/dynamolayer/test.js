const dynamoose = require('dynamoose');
const Data = require('./index');

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
const ddb = new dynamoose.aws.ddb.DynamoDB({
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
  region: 'us-west-2',
});

// Set DynamoDB instance to the Dynamoose DDB instance
dynamoose.aws.ddb.set(ddb);
dynamoose.aws.ddb.local();

(async () => {
  // const unicityData = new UnicityDa
  const db = new Data();
  db.init();
  // unicityData.init(TABLE_NAME);
  // const searchData = new SearchData();
  // searchData.init(TABLE_NAME);

  // const userData = new UserData();
  // userData.init(TABLE_NAME, {
  //   unicity: unicityData,
  //   search: searchData,
  // });
  // const messageData = new MessageData();
  // messageData.init(TABLE_NAME, { user: userData });
  // const freezerData = new FreezerData();
  // freezerData.init(TABLE_NAME);

  // await db.userData.create(
  //   {
  //     username: 'mathieu',
  //     key: getRandomString(788),
  //     signature: getRandomString(268),
  //     hash: getRandomString(172),
  //   },
  // );
  // await db.userData.confirmUser('mathieu');

  // await db.userData.create(
  //   {
  //     username: 'mat',
  //     key: getRandomString(788),
  //     signature: getRandomString(268),
  //     hash: getRandomString(172),
  //   },
  // );
  // await db.userData.confirmUser('mat');

  // await db.userData.create(
  //   {
  //     username: 'batmat',
  //     key: getRandomString(788),
  //     signature: getRandomString(268),
  //     hash: getRandomString(172),
  //   },
  // );
  // await db.userData.confirmUser('batmat');

  // const users = await db.userData.searchUsername('MAT');
  // console.log('users', users);

  // for (let i = 0; i < 5; i += 1) {
  //   await db.messageData.create({ username: 'mat', header: getRandomChallenge(), full: getRandomChallenge() });
  // }

  const matMessages = await db.messageData.getUserMessages('mat');
  console.log('matMessages', matMessages);

  const mat = await db.userData.findByName('batmat');

  await db.clearUserAccount(mat, true);
})();
