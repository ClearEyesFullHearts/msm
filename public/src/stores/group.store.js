/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { fetchWrapper } from '@/helpers';
import {
  useAuthStore, useContactsStore,
} from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import Config from '@/lib/config';

const baseUrl = Config.API_URL;

const mycrypto = new CryptoHelper();

export const useGroupStore = defineStore({
  id: 'group',
  state: () => ({
    current: {
      users: [],
    },
  }),
  actions: {
    setDetailedMember(name, users, contactsStore) {
      if (!contactsStore) contactsStore = useContactsStore();
      const known = contactsStore.list.find((c) => c.at === name);
      if (known) {
        this.current.users.push(known);
      } else {
        const foundUser = users.find((c) => c.at === name);
        if (foundUser) {
          const {
            at, id: userId, key, signature,
          } = foundUser;
          const unknown = reactive({
            id: userId,
            at,
            key,
            verified: false,
            connected: false,
            store: {
              hash: null,
              signature: null,
            },
            server: {
              hash: null,
              signingKey: signature,
            },
          });
          this.current.users.push(unknown);

          console.log('this.current.users', this.current.users);
          mycrypto.hash(`${key}\n${signature}`)
            .then((hash) => {
              unknown.server.hash = hash;
            })
            .then(() => contactsStore.autoValidation(unknown));
        }
      }
    },
    async create({ groupName }) {
      const authStore = useAuthStore();
      const myPK = await mycrypto.getPublicKey(authStore.pem);

      const password = mycrypto.getRandomBase64Password();

      const key = await mycrypto.publicEncrypt(myPK, password);

      const send = {
        name: groupName,
        key,
      };
      const { id } = await fetchWrapper.post(`${baseUrl}/groups`, send);

      return { id, key };
    },
    async getCurrentGroup(id) {
      const contactsStore = useContactsStore();
      this.current = contactsStore.list.find((g) => g.id === id);
      this.current.users = [];
      console.log('this.current', this.current);
      // const challenge = await fetchWrapper.get(`${baseUrl}/group/${id}`);
      // const authStore = useAuthStore();
      // const groupStr = await mycrypto.resolve(authStore.pem, challenge);
      // this.current = JSON.parse(groupStr);

      // const keyBuff = await mycrypto.privateDecrypt(authStore.pem, this.current.key);
      // this.current.key = new TextDecoder().decode(keyBuff);
      // this.current.users = [];

      const { members } = this.current;
      if (members.length > 0) {
        const users = await fetchWrapper.get(`${baseUrl}/users?list=${encodeURIComponent(members.join(','))}`);
        const l = members.length;
        for (let i = 0; i < l; i += 1) {
          this.setDetailedMember(members[i], users, contactsStore);
        }
      }

      return this.current;
    },
    async addMember(at) {
      const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);
      console.log('user', user);
      console.log('this.current.key', this.current.key);
      const { key } = user;
      const targetSecret = await mycrypto.publicEncrypt(key, this.current.key);

      await fetchWrapper.post(`${baseUrl}/group/${this.current.id}/member`, { username: at, key: targetSecret });

      this.setDetailedMember(at, [user]);
      this.current.members.push(at);
    },
  },
});
