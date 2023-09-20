const dynamoose = require('dynamoose');

class SubscriptionData {
  constructor() {
    this.Entity = null;
    this.subscriptionSchema = new dynamoose.Schema({
      pk: {
        type: String,
        required: true,
        hashKey: true,
      },
      sk: {
        type: String,
        required: true,
        rangeKey: true,
      },
      id: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
      p256dh: {
        type: String,
        required: true,
      },
    });
  }

  init(options) {
    this.Entity = dynamoose.model('Subscription', this.subscriptionSchema, options);
  }

  async create({
    username,
    id,
    endpoint,
    auth,
    p256dh,
  }) {
    const newSubscription = {
      pk: `P#${username}`,
      sk: endpoint,
      id,
      auth,
      p256dh,
    };

    const conn = await this.Entity.create(newSubscription);
    return conn;
  }

  async findAll(username) {
    const subscriptions = await this.Entity
      .query('pk').eq(`P#${username}`)
      .exec();

    return subscriptions;
  }

  async delete(username, endpoint) {
    await this.Entity.delete({ pk: `P#${username}`, sk: endpoint });
  }
}

module.exports = SubscriptionData;
