const dynamoose = require('dynamoose');

class SearchData {
  constructor() {
    this.Entity = null;
    this.searchSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
        index: {
          name: 'SearchUserIndex',
          global: false,
          project: true,
          rangeKey: 'size',
        },
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
      },
      size: {
        type: Number,
        required: true,
      },
    });
  }

  init(options) {
    this.Entity = dynamoose.model('Search', this.searchSchema, options);
  }
}

module.exports = SearchData;
