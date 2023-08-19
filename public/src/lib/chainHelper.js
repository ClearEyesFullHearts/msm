import { AlchemyProvider, Contract } from 'ethers';

// const NETWORK = `${import.meta.env.VITE_CHAIN_NETWORK}`;
// const API_KEY = `${import.meta.env.VITE_CHAIN_API_KEY}`;
// const CONTRACT_ADDRESS = `${import.meta.env.VITE_CHAIN_CONTRACT}`;

const NETWORK = 'local';
const API_KEY = 'local';
const CONTRACT_ADDRESS = 'local';

const ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint64',
        name: 'userId',
        type: 'uint64',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'signature',
        type: 'string',
      },
    ],
    name: 'UserValidated',
    type: 'event',
  },
];
class ChainHelper {
  constructor() {
    // this.provider = new AlchemyProvider(NETWORK, API_KEY);
    // this.contract = new Contract(CONTRACT_ADDRESS, ABI, this.provider);
  }

  async isValidated(userId) {
    // const events = await this.contract.filters.UserValidated(userId);
    // const logs = await this.contract.queryFilter(events);

    // if (logs.length && logs.length > 0) {
    //   if (logs.length > 1) {
    //     return logs.reduce(({ id, signature }, { args }) => {
    //       const [myId, mySignature] = args;
    //       if (id && signature !== mySignature) {
    //         throw new Error('Validated more than once on chain');
    //       }
    //       return {
    //         id: myId, signature: mySignature,
    //       };
    //     }, {});
    //   }
    //   const [{ args }] = logs;
    //   const [id, signature] = args;
    //   return {
    //     userId: id,
    //     signature,
    //   };
    // }
    return false;
  }
}

export default ChainHelper;
