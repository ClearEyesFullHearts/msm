/* eslint-disable import/prefer-default-export */
import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import CryptoHelper from '@/lib/cryptoHelper';
import ChainHelper from '@/lib/chainHelper';
import Config from '@/lib/config';

const mycrypto = new CryptoHelper();
const myvalidator = new ChainHelper();

const baseUrl = Config.API_URL;

export const useContactsStore = defineStore({
  id: 'contacts',
  state: () => ({
    list: [],
    dirty: false,
  }),
  actions: {
    async userToContact({
      id,
      at,
      store,
    }) {
      const checkingUser = reactive({
        id,
        at,
        store,
        verified: false,
        server: {
          hash: null,
          signingKey: null,
        },
        auto: 0,
        alert: null,
      });
      this.list.push(checkingUser);
      return fetchWrapper.get(`${baseUrl}/user/${at}`)
        .then(async ({ key, signature }) => {
          const hash = await mycrypto.hash(`${key}\n${signature}`);
          checkingUser.server.hash = hash;
          checkingUser.server.signingKey = signature;
          if (store.signature) {
            try {
              const result = await mycrypto.verify(signature, hash, store.signature, true);
              if (result) {
                checkingUser.verified = true;
              } else {
                checkingUser.alert = 'The stored signature failed to verify. This is very alarming.\nPlease report the problem to an admin.';
              }
            } catch (exc) {
              checkingUser.alert = 'A problem happened while trying to validate this contact.\nIt may just be a temporary problem but you\'d be safer by not using this @';
            }
            return;
          }
          if (store.hash) {
            const result = store.hash === hash;
            if (result) {
              checkingUser.verified = true;
            } else {
              checkingUser.alert = 'There is a mismatch between the server\'s hash and the stored one. This is very alarming.\nPlease report the problem to an admin.';
            }
          }
        })
        .catch((err) => {
          console.log(err);
          if (err === '@ unknown') {
            const alertMsg = 'This user does not exists anymore.\nPlease remove it from your list.';
            checkingUser.alert = alertMsg;
          }
        })
        .then(() =>
          // check if user is verified in ether blockchain
          this.autoValidation(checkingUser));
    },
    async setContactList(pem, contacts) {
      if (!contacts) {
        this.list = [];
        return;
      }

      const {
        passphrase,
        iv,
        token,
      } = contacts;

      const listStr = await mycrypto.resolve(pem, { token, passphrase, iv });
      const myList = JSON.parse(listStr);
      myList.sort((a, b) => a.at.localeCompare(b.at));
      myList.forEach(({
        id,
        at,
        store,
      }) => {
        this.userToContact({
          id,
          at,
          store,
        });
      });
    },
    async saveContactList(pem) {
      const saveList = this.list.map(({
        id,
        at,
        store,
      }) => ({
        id,
        at,
        store,
      })).sort((a, b) => a.at.localeCompare(b.at));
      const listChallenge = await mycrypto.challenge(pem, JSON.stringify(saveList));
      await fetchWrapper.put(`${baseUrl}/contacts`, listChallenge);
      this.dirty = false;
    },
    removeUser(id) {
      const index = this.list.findIndex((u) => u.id === id);
      this.list.splice(index, 1);
      this.dirty = true;
    },
    async manualAdd(name) {
      const user = await fetchWrapper.get(`${baseUrl}/user/${name}`);
      const {
        id,
        at,
        key,
        signature,
      } = user;
      const [knownUser] = this.list.filter((u) => u.id === id);
      if (knownUser) return;

      const hash = await mycrypto.hash(`${key}\n${signature}`);
      const checkingUser = reactive({
        id,
        at,
        store: {
          hash: null,
          signature: null,
        },
        verified: false,
        server: {
          hash,
          signingKey: signature,
        },
        auto: 0,
        alert: null,
      });
      this.list.push(checkingUser);
      this.list.sort((a, b) => a.at.localeCompare(b.at));
      this.dirty = true;
      // check if user is verified in ether blockchain
      await this.autoValidation(checkingUser);
    },
    async fileAdd({
      id, at, hash, signature,
    }) {
      this.userToContact({
        id, at, store: { hash, signature },
      }).then(() => this.list.sort((a, b) => a.at.localeCompare(b.at)));
      this.dirty = true;
    },
    verifyUser(id) {
      const [knownUser] = this.list.filter((u) => u.id === id);
      knownUser.store.hash = knownUser.server.hash;
      knownUser.verified = true;
      this.dirty = true;
    },
    async checkUser(user) {
      // check if user is verified in contact list
      const [knownUser] = this.list.filter((u) => u.id === user.id);
      if (knownUser) {
        if (knownUser.verified) {
          const {
            store: {
              hash,
              signature,
            },
          } = knownUser;
          if (signature) {
            const result = await mycrypto.verify(user.signature, user.security.hash, signature, true);

            user.security.verification = result ? 1 : 4;
            return;
          }
          user.security.verification = user.security.hash === hash ? 2 : 4;
          return;
        }
        if (knownUser.auto) {
          const result = await mycrypto.verify(user.signature, user.security.hash, knownUser.auto, true);
          user.security.verification = result ? 3 : 4;
          return;
        }
      }
      // check if user is verified in ether blockchain
      // if the hash checks out => user.security.verification = 3;
      try {
        const isValidatedOnChain = await myvalidator.isValidated(user.id);
        if (!isValidatedOnChain) return;

        const { signature } = isValidatedOnChain;
        const result = await mycrypto.verify(user.signature, user.security.hash, signature, true);
        if (result) {
          user.security.verification = 3;
        } else {
          user.security.verification = 4;
        }
      } catch (err) {
        user.security.verification = 4;
      }
    },
    async autoValidation(user) {
      try {
        const isValidatedOnChain = await myvalidator.isValidated(user.id);
        if (!isValidatedOnChain) return;

        const { signature } = isValidatedOnChain;
        const result = await mycrypto.verify(user.server.signingKey, user.server.hash, signature, true);
        if (!result) {
          throw new Error('Signature mismatch on chain');
        }
        user.auto = signature;
      } catch (err) {
        user.alert = `${err.message || err}, do not trust this user.\nReport the problem to an admin ASAP!`;
      }
    },
  },
});
