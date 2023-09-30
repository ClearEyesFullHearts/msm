const { AlchemyProvider, Wallet, Contract } = require('ethers');
const debug = require('debug')('validator:contract');
const contract = require('./contract/BetaMsm.json');

class ValidatorContract {
  constructor({
    network = 'sepolia', apiKey, privateKey, address,
  }) {
    this.network = network;
    this.apiKey = apiKey;
    this.privateKey = privateKey;
    this.contractAddress = address;

    this.provider = new AlchemyProvider(this.network, this.apiKey);
    this.signer = new Wallet(this.privateKey, this.provider);
    this.contract = new Contract(this.contractAddress, contract.abi, this.signer);
  }

  async validateUser({ userId, signature }) {
    debug('updating user', userId);
    await this.contract.userValidated(userId, signature);
    debug('request sent');
    // const tx = await this.contract.userValidated(userId, signature);
    // const result = await tx.wait();
    // debug('user updated', result);

    // return result.status === 1;
  }

  async isValidated(userId) {
    debug('looking for user', userId);
    const events = await this.contract.filters.UserValidated(userId);
    const logs = await this.contract.queryFilter(events);

    if (logs.length && logs.length > 0) {
      if (logs.length > 1) throw new Error('Validated more than once');
      const [{ args }] = logs;
      const [id, signature] = args;
      debug('User validated');
      return {
        userId: id,
        signature,
      };
    }
    debug('No validation');
    return false;
  }
}

module.exports = ValidatorContract;
