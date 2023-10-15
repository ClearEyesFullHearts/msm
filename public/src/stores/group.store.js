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

function sortMembers(a, b) {
  return a.isAdmin && !b.isAdmin ? -1 : (b.isAdmin && !a.isAdmin ? 1 : 0); // eslint-disable-line
}

export const useGroupStore = defineStore({
  id: 'group',
  state: () => ({
    list: [],
    current: {
      members: [],
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
        userKey: key,
        secret: null,
        group: true,
        alert: null,
        members,
        messages: [],
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
          members: members.sort(sortMembers),
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
      this.current = this.list.find((l) => l.id === id);
      fetchWrapper.get(`${baseUrl}/group/${id}`)
        .then(async (challenge) => {
          const authStore = useAuthStore();
          const groupStr = await mycrypto.resolve(authStore.pem, challenge);
          const currentGroup = JSON.parse(groupStr);

          this.current.at = currentGroup.groupName;
          this.current.members = currentGroup.members.sort(sortMembers);
        });
    },
    async addMember(at) {
      this.current.members.unshift({ at, isAdmin: false });
      this.current.members.sort(sortMembers);
      try {
        const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);

        const { key } = user;
        const targetSecret = await mycrypto.publicEncrypt(key, this.current.secret);

        await fetchWrapper.post(`${baseUrl}/group/${this.current.id}/member`, { username: at, key: targetSecret });
      } catch (err) {
        this.current.member.shift();
      }
    },
    async setAdmin(member) {
      const mIndex = this.current.members.findIndex((m) => m.at === member.at);
      if (mIndex >= 0) {
        await fetchWrapper.put(`${baseUrl}/group/${this.current.id}/member/${member.at}`, { isAdmin: true });
        this.current.members[mIndex].isAdmin = true;
        this.current.members.sort(sortMembers);
      }
    },
  },
});
