const dynamoose = require('dynamoose');
const UserData = require('./model/user');
const MessageData = require('./model/message');
const FreezerData = require('./model/freezer');
const UnicityData = require('./model/unicity');
const SearchData = require('./model/search');

const TABLE_NAME = 'MyLocalTable';

function createSearchTerms(str) {
  const l = str.length;
  const terms = [];
  for (let i = 0; i < l - 2; i += 1) {
    for (let j = i + 3; j < l; j += 1) {
      terms.push(str.substring(i, j).toUpperCase());
    }
    terms.push(str.substring(i).toUpperCase());
  }
  return terms;
}

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
  const unicityData = new UnicityData();
  unicityData.init(TABLE_NAME);
  const searchData = new SearchData();
  searchData.init(TABLE_NAME);

  const userData = new UserData();
  userData.init(TABLE_NAME, {
    unicity: unicityData,
    search: searchData,
  });
  const messageData = new MessageData();
  messageData.init(TABLE_NAME, { user: userData });
  const freezerData = new FreezerData();
  freezerData.init(TABLE_NAME);

  // await userData.create(
  //   {
  //     username: 'mathieu',
  //     key: getRandomString(788),
  //     signature: getRandomString(268),
  //     hash: getRandomString(172),
  //     searchTerms: createSearchTerms('mathieu'),
  //   },
  // );

  // await userData.create(
  //   {
  //     username: 'mat',
  //     key: getRandomString(788),
  //     signature: getRandomString(268),
  //     hash: getRandomString(172),
  //     searchTerms: createSearchTerms('mat'),
  //   },
  // );

  // await userData.create(
  //   {
  //     username: 'batmat',
  //     key: getRandomString(788),
  //     signature: getRandomString(268),
  //     hash: getRandomString(172),
  //     searchTerms: createSearchTerms('batmat'),
  //   },
  // );

  const users = await userData.searchUsername('MAT');
  console.log('users', users);


  // for(let i = 0; i < 5; i+=1){
  //   await messageData.create({ username: 'mat', header: getRandomChallenge(), full: getRandomChallenge() });
  // }
  
  const matMessages = await messageData.getUserMessages('mat');
  console.log('matMessages', matMessages);
})();
