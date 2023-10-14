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
    list: [],
    current: {
      users: [],
    },
  }),
  actions: {
    formatGroup(pem, {
      groupId,
      groupName,
      key,
      isAdmin,
      members,
    }) {
      const checkingGroup = reactive({
        id: groupId,
        at: groupName,
        store: {
          hash: null,
          signature: null,
        },
        isAdmin,
        secret: null,
        group: true,
        alert: null,
        members,
        messages: [],
        users: [],
      });

      mycrypto.privateDecrypt(pem, key)
        .then((keyBuff) => {
          checkingGroup.secret = new TextDecoder().decode(keyBuff);
        });

      return checkingGroup;
    },
    async setGroupList(pem) {
      const groups = await fetchWrapper.get(`${baseUrl}/groups`);

      const {
        passphrase,
        iv,
        token,
      } = groups;

      const listStr = await mycrypto.resolve(pem, { token, passphrase, iv });
      const myList = JSON.parse(listStr);

      myList.forEach((listedGroup) => {
        const {
          groupId,
          groupName,
          key,
          isAdmin,
          members,
        } = listedGroup;

        const checkingGroup = this.formatGroup(pem, {
          groupId,
          groupName,
          key,
          isAdmin,
          members,
        });
        this.list.push(checkingGroup);
      });
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

      const checkingGroup = reactive({
        id,
        at: groupName,
        store: {
          hash: null,
          signature: null,
        },
        isAdmin: true,
        secret: password,
        group: true,
        alert: null,
        members: [],
        messages: [],
        users: [],
      });
      this.list.push(checkingGroup);

      return checkingGroup;
    },
    async getCurrentGroup(id) {
      const challenge = await fetchWrapper.get(`${baseUrl}/group/${id}`);
      const authStore = useAuthStore();
      const groupStr = await mycrypto.resolve(authStore.pem, challenge);
      const currentGroup = JSON.parse(groupStr);

      this.current = this.formatGroup(authStore.pem, currentGroup);

      const { members } = this.current;
      if (members.length > 0) {
        const users = await fetchWrapper.get(`${baseUrl}/users?list=${encodeURIComponent(members.join(','))}`);
        const contactsStore = useContactsStore();

        const l = members.length;
        for (let i = 0; i < l; i += 1) {
          const known = contactsStore.list.find((c) => c.at === members[i]);
          if (known) {
            this.current.users.push(known);
          } else {
            const foundUser = users.find((c) => c.at === members[i]);
            if (foundUser) {
              const { id: userId, at } = foundUser;
              const checkingUser = contactsStore.getCheckingUser({
                id: userId, at,
              });

              this.current.users.push(checkingUser);

              contactsStore.setContactDetail(checkingUser, foundUser)
                .then(() => contactsStore.autoValidation(checkingUser));
            }
          }
        }
      }
    },
    async addMember(at) {
      const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);

      const { key } = user;
      const targetSecret = await mycrypto.publicEncrypt(key, this.current.secret);

      await fetchWrapper.post(`${baseUrl}/group/${this.current.id}/member`, { username: at, key: targetSecret });

      const contactsStore = useContactsStore();

      const { id: userId, at: username } = user;
      const checkingUser = contactsStore.getCheckingUser({
        id: userId, at: username,
      });

      this.current.users.push(checkingUser);
      this.current.members.push(at);

      contactsStore.setContactDetail(checkingUser, user)
        .then(() => contactsStore.autoValidation(checkingUser));
    },
  },
});
