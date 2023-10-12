/* eslint-disable import/prefer-default-export */
import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import {
  useAuthStore, useConversationStore, useToasterStore, useWorkerStore,
} from '@/stores';

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
    timeout: null,
  }),
  getters: {
    messageCount: (state) => state.list.reduce((nb, contact) => nb + contact.messages.length, 0),
  },
  actions: {
    userToContact({
      id,
      at,
      store,
    }) {
      const checkingUser = reactive({
        id,
        at,
        store,
        key: null,
        verified: false,
        connected: false,
        server: {
          hash: null,
          signingKey: null,
        },
        auto: 0,
        alert: null,
        messages: [],
      });
      fetchWrapper.get(`${baseUrl}/user/${at}`)
        .then(async ({ id: userId, key, signature }) => {
          if (!checkingUser.id) checkingUser.id = userId;
          checkingUser.key = key;
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
          if (err === '@ unknown') {
            const alertMsg = 'This user does not exists anymore.\nPlease remove it from your list.';
            checkingUser.alert = alertMsg;
          }
        })
        .then(() =>
          // check if user is verified in ether blockchain
          this.autoValidation(checkingUser));

      return checkingUser;
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

      myList.forEach(({
        id,
        at,
        store,
      }) => {
        const contact = this.userToContact({
          id,
          at,
          store,
        });
        this.list.push(contact);
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
      }));
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
      const [knownUser] = this.list.filter((u) => u.at === name);
      if (knownUser) return;

      const contact = this.userToContact({
        id: false,
        at: name,
        store: {
          hash: null,
          signature: null,
        },
      });
      this.list.unshift(contact);
      this.dirty = true;
    },
    async fileAdd({
      id, at, hash, signature,
    }) {
      const knownUserIndex = this.list.findIndex((u) => u.at === at);
      if (knownUserIndex >= 0) {
        this.list.splice(knownUserIndex, 1);
      }
      const contact = this.userToContact({
        id, at, store: { hash, signature },
      });
      this.list.unshift(contact);
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
    async getHeaders() {
      const headers = [];
      try {
        const challenges = await fetchWrapper.get(`${baseUrl}/inbox`);

        const authStore = useAuthStore();
        const { pem } = authStore;

        for (let i = 0; i < challenges.length; i += 1) {
          const { id, challenge } = challenges[i];
          const objStr = await mycrypto.resolve(pem, challenge);
          console.log('header', objStr);
          const {
            from,
            sentAt,
            title: cryptedTitle,
          } = JSON.parse(objStr);

          const titleBuff = await mycrypto.privateDecrypt(pem, cryptedTitle);
          const dec = new TextDecoder();
          const title = dec.decode(titleBuff);

          const conversationStore = useConversationStore();
          const header = {
            id,
            from,
            sentAt,
            title: conversationStore.decodeText(title),
          };
          headers.push(header);
        }
      } catch (error) {
        console.log(error);
      }
      return headers;
    },
    async fillConversations(headers) {
      headers.sort((a, b) => a.sentAt - b.sentAt);

      const promises = [];
      for (let i = 0; i < headers.length; i += 1) {
        promises.push(this.addMissedMessage(headers[i]));
      }

      await Promise.all(promises);

      this.list.sort((a, b) => {
        const s = b.messages.length - a.messages.length;
        return s;
      });
      document.title = `ySyPyA (${this.messageCount})`;
    },
    async addMissedMessage(header) {
      const from = header.from.substring(1);
      const conversationStore = useConversationStore();
      const { current, conversations } = conversationStore;

      if (current.target && current.target.at === from) {
        if (current.messages.find((m) => m.id === header.id)) return;
        const msg = await conversationStore.getMissedMessage(header.id);
        current.messages.push(msg);
        return;
      }

      const contact = this.list.find((c) => c.at === from);
      if (contact) {
        const convo = conversations[contact.at];

        if (convo && convo.messages.find((m) => m.id === header.id)) return;

        if (contact.messages.find((m) => m.id === header.id)) return;

        contact.messages.push(header);
      } else {
        await this.manualAdd(from);
        const newContact = this.list.find((c) => c.at === from);
        newContact.messages.push(header);
      }
      document.title = `ySyPyA (${this.messageCount})`;
      const toasterStore = useToasterStore();
      toasterStore.success({ text: `New message from @${from}` });
    },
    async addFallBackMessage(header) {
      const from = header.from.substring(1);
      let contact = this.list.find((c) => c.at === from);
      if (!contact) {
        await this.manualAdd(from);
        contact = this.list.find((c) => c.at === from);
      }

      contact.messages.push(header);
      contact.connected = true;
      document.title = `ySyPyA (${this.messageCount})`;
      const toasterStore = useToasterStore();
      toasterStore.success({ text: `New message from @${from}` });
    },
    updateMessages(loop = true) {
      const authStore = useAuthStore();
      this.getHeaders().then((headers) => this.fillConversations(headers))
        .then(() => {
          const workerStore = useWorkerStore();
          workerStore.updateBadge(this.messageCount);

          if (this.dirty) {
            return this.saveContactList(authStore.pem);
          }
          return true;
        })
        .then(() => {
          if (!loop) return;
          const { pollingTime } = authStore.user.config;

          if (pollingTime && pollingTime > 0) {
            this.timeout = setTimeout(() => {
              this.updateMessages();
            }, pollingTime);
          }
        });
    },
    async checkConnections() {
      const list = encodeURIComponent(this.list.map(({ at }) => (at)).join(','));
      const connections = await fetchWrapper.get(`${baseUrl}/connections?list=${list}`);

      connections.forEach((conn) => {
        this.connection(conn, true);
      });
    },
    connection(at, state) {
      const contactArr = this.list.filter((u) => u.at === at);
      if (contactArr.length > 0) {
        const [contact] = contactArr;
        contact.connected = state;
        const toasterStore = useToasterStore();
        toasterStore.success({ text: `${at} is ${state ? 'connected' : 'disconnected'}!` });
      }
    },
    disconnected() {
      this.list.forEach((c) => c.connected = false);
    },
  },
});
