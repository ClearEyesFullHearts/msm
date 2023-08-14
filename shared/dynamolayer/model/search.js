const dynamoose = require('dynamoose');

class SearchData {
  constructor() {
    this.Entity = null;
    this.searchSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
        index: {
          name: 'SearchUserIndex',
          global: true,
          rangeKey: 'size',
        },
      },
      size: {
        type: Number,
        required: true,
      },
      at: {
        type: String,
        required: true,
      },
    });
  }

  init(tableName) {
    this.Entity = dynamoose.model('Search', this.searchSchema, { tableName });
  }
}

module.exports = SearchData;
