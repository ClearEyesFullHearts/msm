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
  getters: {
    canQuit: (state) => !state.current.isAdmin || state.current.members.some((m) => m.isAdmin),
  },
  actions: {
    formatGroup(pem, {
      groupId,
      groupName,
      key,
      isAdmin,
      members,
    }) {
      const checkingGroup = reactive({
        id: groupName,
        at: groupId,
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
        id: groupName,
        at: id,
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
      this.current = this.list.find((l) => l.at === id);
      return fetchWrapper.get(`${baseUrl}/group/${id}`)
        .then(async (challenge) => {
          const authStore = useAuthStore();
          const groupStr = await mycrypto.resolve(authStore.pem, challenge);
          const currentGroup = JSON.parse(groupStr);

          this.current.id = currentGroup.groupName;
          this.current.members = currentGroup.members.sort(sortMembers);
          mycrypto.privateDecrypt(authStore.pem, currentGroup.key)
            .then((keyBuff) => {
              this.current.secret = new TextDecoder().decode(keyBuff);
            });
        })
        .catch((err) => {
          if (err === 'Group unknown') {
            const contactsStore = useContactsStore();
            this.current = { id: 'This group no longer exists', members: [] };
            let index = this.list.findIndex((l) => l.at === id);
            this.list.splice(index, 1);
            index = contactsStore.list.findIndex((l) => l.at === id);
            contactsStore.list.splice(index, 1);
          }
        });
    },
    async updateGroup(id) {
      const authStore = useAuthStore();
      let updating = this.list.find((l) => l.at === id);
      if (!updating) {
        const contactsStore = useContactsStore();
        updating = reactive({
          id: '',
          at: id,
          store: {
            hash: null,
            signature: null,
          },
          isAdmin: false,
          userKey: null,
          secret: null,
          group: true,
          alert: null,
          members: [],
          messages: [],
        });

        this.list.unshift(updating);
        contactsStore.list.unshift(updating);
      }
      return fetchWrapper.get(`${baseUrl}/group/${id}`)
        .then(async (challenge) => {
          if (challenge) {
            const groupStr = await mycrypto.resolve(authStore.pem, challenge);
            const currentGroup = JSON.parse(groupStr);

            updating.userKey = currentGroup.key;
            updating.id = currentGroup.groupName;
            updating.members = currentGroup.members.sort(sortMembers);
            mycrypto.privateDecrypt(authStore.pem, currentGroup.key)
              .then((keyBuff) => {
                updating.secret = new TextDecoder().decode(keyBuff);
              });
          }
        })
        .catch((err) => {
          if (err === 'Group unknown') {
            const contactsStore = useContactsStore();
            this.current = { id: 'This group no longer exists', members: [] };
            let index = this.list.findIndex((l) => l.at === id);
            this.list.splice(index, 1);
            index = contactsStore.list.findIndex((l) => l.at === id);
            contactsStore.list.splice(index, 1);
          }
        });
    },
    async addMember(at) {
      const existing = this.current.members.findIndex((m) => m.at === at);
      if (existing >= 0) {
        const [alreadyMember] = this.current.members.splice(existing, 1);
        this.current.members.unshift(alreadyMember);
        return;
      }
      this.current.members.unshift({ at, isAdmin: false });
      this.current.members.sort(sortMembers);
      try {
        const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);

        const { key } = user;
        const targetSecret = await mycrypto.publicEncrypt(key, this.current.secret);

        await fetchWrapper.post(`${baseUrl}/group/${this.current.at}/member`, { username: at, key: targetSecret });
      } catch (err) {
        this.current.member.shift();
        throw err;
      }
    },
    async setAdmin(member) {
      const mIndex = this.current.members.findIndex((m) => m.at === member.at);
      if (mIndex >= 0) {
        await fetchWrapper.put(`${baseUrl}/group/${this.current.at}/member/${member.at}`, { isAdmin: true });
        this.current.members[mIndex].isAdmin = true;
        this.current.members.sort(sortMembers);
      }
    },
    async revoke(member) {
      const mIndex = this.current.members.findIndex((m) => m.at === member.at);
      if (mIndex >= 0) {
        const [revoked] = this.current.members.splice(mIndex, 1);
        try {
          const authStore = useAuthStore();

          const password = mycrypto.getRandomBase64Password();

          const newKeys = [];

          const myPK = await mycrypto.getPublicKey(authStore.pem);
          const key = await mycrypto.publicEncrypt(myPK, password);

          newKeys.push({ username: authStore.user.user.username, key });

          const list = this.current.members.filter((m) => m.at !== member.at).map((m) => m.at);
          if (list.length > 0) {
            const users = await fetchWrapper.get(`${baseUrl}/users?list=${encodeURIComponent(list.join(','))}`);

            await users.reduce(async (p, u) => {
              const acc = await p;
              if (u.at !== member.at) {
                const memberKey = await mycrypto.publicEncrypt(u.key, password);
                acc.push({ username: u.at, key: memberKey });
              }
              return acc;
            }, Promise.resolve(newKeys));
          }

          await fetchWrapper.post(`${baseUrl}/group/${this.current.at}/revoke/${member.at}`, newKeys);
          this.getCurrentGroup(this.current.at);
        } catch (err) {
          this.current.members.splice(mIndex, 0, revoked);
          throw err;
        }
      }
    },
    async quitGroup() {
      if (this.canQuit) {
        const index = this.list.findIndex((l) => l.at === this.current.at);
        const [quit] = this.list.splice(index, 1);
        try {
          await fetchWrapper.delete(`${baseUrl}/group/${this.current.at}/member`);
        } catch (err) {
          this.list.splice(index, 0, quit);
          throw err;
        }
        return quit;
      }

      return undefined;
    },
    async deleteGroup() {
      if (this.current.isAdmin) {
        const index = this.list.findIndex((l) => l.at === this.current.at);
        const [quit] = this.list.splice(index, 1);
        try {
          await fetchWrapper.delete(`${baseUrl}/group/${this.current.at}`);
        } catch (err) {
          this.list.splice(index, 0, quit);
          throw err;
        }
        return quit;
      }

      return undefined;
    },
  },
});
