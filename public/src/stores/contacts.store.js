/* eslint-disable import/prefer-default-export */
import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import {
  useAuthStore, useConversationStore, useToasterStore, useWorkerStore, useGroupStore,
} from '@/stores';

import CryptoHelper from '@/lib/cryptoHelper';
import ChainHelper from '@/lib/chainHelper';
import Config from '@/lib/config';

const mycrypto = new CryptoHelper();
const myvalidator = new ChainHelper();

const baseUrl = Config.API_URL;
const chainSalt = Config.CHAIN_SALT;

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
    getCheckingUser({
      id, at, hash, signature,
    }) {
      return reactive({
        id,
        at,
        store: {
          hash,
          signature,
        },
        key: null,
        verified: false,
        connected: false,
        server: {
          hash: null,
          signingKey: null,
        },
        auto: 0,
        group: false,
        alert: null,
        messages: [],
      });
    },
    async setContactDetail(checking, detail) {
      const { id: userId, key, signature } = detail;

      if (!checking.id) checking.id = userId;

      checking.key = key;
      const hash = await mycrypto.hash(`${key}\n${signature}`);
      checking.server.hash = hash;
      checking.server.signingKey = signature;

      if (checking.store.signature) {
        try {
          const result = await mycrypto.verify(signature, hash, checking.store.signature, true);
          if (result) {
            checking.verified = true;
          } else {
            checking.alert = 'The stored signature failed to verify. This is very alarming.\nPlease report the problem to an admin.';
          }
        } catch (exc) {
          checking.alert = 'A problem happened while trying to validate this contact.\nIt may just be a temporary problem but you\'d be safer by not using this @';
        }
        return checking;
      }
      if (checking.store.hash) {
        const result = checking.store.hash === hash;
        if (result) {
          checking.verified = true;
        } else {
          checking.alert = 'There is a mismatch between the server\'s hash and the stored one. This is very alarming.\nPlease report the problem to an admin.';
        }
      }
      return checking;
    },
    async setContactList(pem, contacts) {
      const groupStore = useGroupStore();
      this.list = [];
      if (!contacts) {
        if (groupStore.list.length > 0) {
          this.list.unshift(...groupStore.list);
        }
        return;
      }

      const {
        passphrase,
        iv,
        token,
      } = contacts;

      const listStr = await mycrypto.resolve(pem, { token, passphrase, iv });
      const myList = JSON.parse(listStr);

      if (myList.length > 0) {
        const userAts = myList.reduce((acc, l) => {
          if (!l.group) acc.push(l.at);
          return acc;
        }, []);

        let users = [];
        if (userAts.length > 0) {
          users = await fetchWrapper.get(`${baseUrl}/users?list=${encodeURIComponent(userAts.join(','))}`);
        }

        myList.forEach(({
          id,
          at,
          store: {
            hash,
            signature,
          },
          group,
        }) => {
          if (!group) {
            const checkingUser = this.getCheckingUser({
              id, at, hash, signature,
            });
            this.list.push(checkingUser);
            const detail = users.find((u) => u.at === at);
            if (!detail) {
              checkingUser.alert = 'This user does not exists anymore.\nPlease remove it from your list.';
            } else {
              this.setContactDetail(checkingUser, detail)
                .then(() => this.autoValidation(checkingUser));
            }
          } else {
            const groupContact = groupStore.list.find((g) => g.at === id);
            if (groupContact) {
              this.list.push(groupContact);
            }
          }
        });
      }

      const newGroups = groupStore.list.filter((g) => myList.findIndex((l) => l.id === g.at) < 0);
      this.list.unshift(...newGroups);
    },
    async saveContactList(pem) {
      const saveList = this.list.map(({
        id,
        at,
        store: {
          hash,
          signature,
        },
        group,
      }) => ({
        id,
        at,
        store: {
          hash,
          signature,
        },
        group,
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

      const checkingUser = this.getCheckingUser({ at: name });
      this.list.unshift(checkingUser);

      fetchWrapper.get(`${baseUrl}/user/${name}`)
        .then((user) => {
          this.setContactDetail(checkingUser, user)
            .then(() => this.autoValidation(checkingUser));
          this.dirty = true;
        })
        .catch((err) => {
          if (err === '@ unknown') {
            const alertMsg = 'This user does not exists anymore.\nPlease remove it from your list.';
            checkingUser.alert = alertMsg;
          }
        });
    },
    async fileAdd({
      id, at, hash, signature,
    }) {
      const knownUserIndex = this.list.findIndex((u) => u.at === at);
      if (knownUserIndex >= 0) {
        this.list.splice(knownUserIndex, 1);
      }

      const checkingUser = this.getCheckingUser({
        id, at, hash, signature,
      });
      this.list.unshift(checkingUser);

      try {
        const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);

        this.setContactDetail(checkingUser, user)
          .then(() => this.autoValidation(checkingUser));
      } catch (err) {
        if (err === '@ unknown') {
          const alertMsg = 'This user does not exists anymore.\nPlease remove it from your list.';
          checkingUser.alert = alertMsg;
          return;
        }
        throw err;
      }

      this.dirty = true;
    },
    verifyUser(id) {
      const [knownUser] = this.list.filter((u) => u.id === id);
      knownUser.store.hash = knownUser.server.hash;
      knownUser.verified = true;
      this.dirty = true;
    },
    async autoValidation(user) {
      try {
        const userId = await mycrypto.hash(`${chainSalt}${user.at}`);
        const isValidatedOnChain = await myvalidator.isValidated(userId);
        if (!isValidatedOnChain) return;

        const { signature } = isValidatedOnChain;
        const { server: { signingKey, hash } } = user;
        const result = await mycrypto.verify(signingKey, hash, signature, true);
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

          const {
            from,
            sentAt,
            title,
            groupId,
          } = JSON.parse(objStr);

          const header = {
            id,
            from,
            sentAt,
            title,
            groupId,
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
        if (headers[i].groupId) {
          promises.push(this.addGroupMessage(headers[i]));
        } else {
          promises.push(this.addMissedMessage(headers[i]));
        }
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
        this.manualAdd(from);
        const newContact = this.list.find((c) => c.at === from);
        newContact.messages.push(header);
      }

      document.title = `ySyPyA (${this.messageCount})`;
      const toasterStore = useToasterStore();
      toasterStore.success({ text: `New message from @${from}` });
    },
    async addGroupMessage(header) {
      const { groupId } = header;
      const conversationStore = useConversationStore();
      const { current, conversations } = conversationStore;

      if (current.target && current.target.at === groupId) {
        if (current.messages.find((m) => m.id === header.id)) return;
        const msg = await conversationStore.getMissedMessage(header.id);
        current.messages.push(msg);
        return;
      }

      const group = this.list.find((c) => c.at === groupId);

      if (!group) {
        // should delete message from groups we're no longer a member
        fetchWrapper.delete(`${baseUrl}/message/${header.id}`);
        return;
      }
      const convo = conversations[group.at];

      if (convo && convo.messages.find((m) => m.id === header.id)) return;

      if (group.messages.find((m) => m.id === header.id)) return;

      group.messages.push(header);
      document.title = `ySyPyA (${this.messageCount})`;
      const toasterStore = useToasterStore();
      toasterStore.success({ text: `New message from ${group.id}` });
    },
    async addFallBackMessage(header) {
      const from = header.from.substring(1);
      let contact = this.list.find((c) => c.at === from);
      if (!contact) {
        this.manualAdd(from);
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
