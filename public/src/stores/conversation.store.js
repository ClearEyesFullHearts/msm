/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import { useContactsStore, useAuthStore, useConnectionStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';
import { fetchWrapper } from '@/helpers';
import Config from '@/lib/config';

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();

export const useConversationStore = defineStore({
  id: 'conversation',
  state: () => ({
    conversations: {},
    current: {},
  }),
  actions: {
    async loadConvo(at) {
      const contactsStore = useContactsStore();
      const [target] = contactsStore.list.filter((c) => c.at === at);
      if (!this.conversations[at]) {
        this.conversations[at] = {
          target,
          messages: [],
        };
      }

      this.current = this.conversations[at];
      const promises = target.messages.map((m) => {
        if (m.id) return this.getMissedMessage(m.id);
        return Promise.resolve(m);
      });

      const allMissedMessages = await Promise.all(promises);
      this.current.messages.push(...allMissedMessages);
      target.messages = [];

      document.title = `ySyPyA (${contactsStore.messageCount})`;
    },
    async getMissedMessage(msgId) {
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

        authStore.onChainVerification();
        return {
          id,
          from,
          sentAt,
          title: this.decodeText(title),
          content: this.decodeText(content),
        };
      } catch (error) {
        console.error(`An error occured: ${error}`);
        return null;
      }
    },
    async getFallbackMessage(from, txt) {
      if (this.current && this.current.target && this.current.target.at === from) {
        if (!this.current.target.connected) this.current.target.connected = true;
        this.current.messages.push({
          from,
          content: this.decodeText(txt),
        });
        return true;
      }
      return false;
    },
    async sendFallbackMessage(at, text, requestId) {
      return new Promise((resolve, reject) => {
        const message = {
          from: 'me',
          sentAt: Date.now(),
          content: text,
        };
        const { key: targetPem } = this.current.target;
        mycrypto.publicEncrypt(targetPem, this.encodeText(text))
          .then((b64Content) => {
            const reqBody = {
              to: at,
              requestId,
              content: b64Content,
            };
            const connectionStore = useConnectionStore();

            function onAcknowledgment(err, result) {
              let error = err;
              let response = result;
              if (!result) {
                response = err;
                error = false;
              }
              if (error) {
                reject(error);
              }
              if (response) {
                this.current.messages.push(message);
                resolve();
              } else {
                this.sendMail(at, text).then(() => resolve());
              }
            }
            connectionStore.sendFallback(reqBody, onAcknowledgment.bind(this));
          });
      });
    },
    async sendMail(at, text) {
      const message = {
        from: 'me',
        title: 'Missed',
        sentAt: Date.now(),
        content: text,
      };
      this.current.messages.push(message);
      const { key: targetPem } = this.current.target;
      const b64Title = await mycrypto.publicEncrypt(targetPem, this.encodeText('Missed'));
      const b64Content = await mycrypto.publicEncrypt(targetPem, this.encodeText(text));

      const reqBody = {
        to: at,
        title: b64Title,
        content: b64Content,
      };

      await fetchWrapper.post(`${baseUrl}/message`, reqBody);
    },
    async downloadConversation() {
      if (!this.current || this.current.messages.length < 1) return;

      const {
        target: { at },
        messages,
      } = this.current;
      const body = {
        at,
        messages: messages.map((m) => ({ ...m })),
      };
      const authStore = useAuthStore();
      const { pem } = authStore;

      const challenge = await mycrypto.challenge(pem, JSON.stringify(body));

      FileHelper.download(`${at}.ysypya`, JSON.stringify(challenge));
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
