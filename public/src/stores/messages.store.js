/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import { reactive } from 'vue';

import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';
import { fetchWrapper } from '@/helpers';
import { useAuthStore, useAlertStore, useContactsStore } from '@/stores';
import Config from '@/lib/config';

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();

export const useMessagesStore = defineStore({
  id: 'messages',
  state: () => ({
    headers: {},
    message: {},
    targetMessage: {},
    targetAt: [],
    contentLength: 0,
  }),
  actions: {
    async getHeaders() {
      this.headers = { loading: true };
      try {
        const challenges = await fetchWrapper.get(`${baseUrl}/inbox`);

        const authStore = useAuthStore();
        const { pem } = authStore;

        const copy = [];
        this.headers = [];
        document.title = 'ySyPyA';
        for (let i = 0; i < challenges.length; i += 1) {
          const { id, challenge } = challenges[i];
          const objStr = await mycrypto.resolve(pem, challenge);

          const {
            from,
            sentAt,
            title: cryptedTitle,
          } = JSON.parse(objStr);

          const titleBuff = await mycrypto.privateDecrypt(pem, cryptedTitle);
          const dec = new TextDecoder();
          const title = dec.decode(titleBuff);

          const header = {
            id,
            from,
            sentAt,
            title: this.decodeText(title),
          };
          this.headers.push(header);
          copy.push(header);
        }
        return copy;
      } catch (error) {
        this.headers = { error };
        return [];
      }
    },
    async getMessage(msgId) {
      try {
        const { id, challenge } = await fetchWrapper.get(`${baseUrl}/message/${msgId}`);

        const authStore = useAuthStore();
        const { pem } = authStore;

        const objStr = await mycrypto.resolve(pem, challenge);

        const {
          from,
          sentAt,
          title: cryptedTitle,
          content: cryptedContent,
        } = JSON.parse(objStr);

        const titleBuff = await mycrypto.privateDecrypt(pem, cryptedTitle);
        const contentBuff = await mycrypto.privateDecrypt(pem, cryptedContent);
        let dec = new TextDecoder();
        const title = dec.decode(titleBuff);
        dec = new TextDecoder();
        const content = dec.decode(contentBuff);

        this.message = {
          id,
          from,
          sentAt,
          title: this.decodeText(title),
          content: this.decodeText(content),
        };

        const alertStore = useAlertStore();
        alertStore.success('Reminder: This message will disappear from the server 2 minutes from now');
        authStore.onChainVerification();
      } catch (error) {
        const alertStore = useAlertStore();
        alertStore.error(`An error occured: ${error}`);
      }
    },
    async write(at, targetPem, title, text) {
      const b64Title = await mycrypto.publicEncrypt(targetPem, this.encodeText(title));
      const b64Content = await mycrypto.publicEncrypt(targetPem, this.encodeText(text));

      const reqBody = {
        to: at,
        title: b64Title,
        content: b64Content,
      };

      await fetchWrapper.post(`${baseUrl}/message`, reqBody);
    },
    async downloadMessage() {
      const {
        id,
        title: clearTitle,
        content: clearText,
        ...restMsg
      } = this.message;

      const authStore = useAuthStore();
      const { pem } = authStore;

      const challenge = await mycrypto.challenge(pem, JSON.stringify({
        title: this.encodeText(clearTitle),
        content: this.encodeText(clearText),
        ...restMsg,
      }));

      FileHelper.download(`${id}.ysypya`, JSON.stringify(challenge));
    },
    async deleteMessage(msgId) {
      const alertStore = useAlertStore();
      try {
        await fetchWrapper.delete(`${baseUrl}/message/${msgId}`);
        alertStore.success('The message has been deleted');
      } catch (error) {
        alertStore.error(`An error occured: ${error}`);
      }
    },
    async addTarget(name) {
      const user = await fetchWrapper.get(`${baseUrl}/user/${name}`);
      const {
        key,
        signature,
      } = user;
      const hash = await mycrypto.hash(`${key}\n${signature}`);
      const checkingUser = reactive({
        ...user,
        security: {
          hash,
          verification: 0,
        },
      });
      this.targetAt.push(checkingUser);
      const contactsStore = useContactsStore();
      contactsStore.checkUser(checkingUser);
    },
    encodeText(str) {
      return str
        .replace(/%/g, '%25')
        .split('')
        .map((char) => {
          const charCode = char.charCodeAt(0);
          return charCode > 127 ? encodeURIComponent(char) : char;
        })
        .join('');
    },
    decodeText(str) {
      return decodeURIComponent(str);
    },
  },
});
