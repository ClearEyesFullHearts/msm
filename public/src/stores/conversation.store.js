/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import {
  useContactsStore, useAuthStore, useConnectionStore, useWorkerStore, useGroupStore,
} from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';
import { fetchWrapper } from '@/helpers';
import Config from '@/lib/config';
import TimeLogger from '@/lib/timeLogger';

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();
const logger = new TimeLogger('Conversation');

export const useConversationStore = defineStore({
  id: 'conversation',
  state: () => ({
    conversations: {},
    current: {
      target: {
        at: '',
        group: false,
      },
      messages: [],
    },
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

      const sequence = target.messages.reduce((acc, m) => {
        if (m.id) {
          return acc.then(() => this.getMissedMessage(m.id)
            .then((msg) => {
              if (msg) {
                this.current.messages.push(msg);
              }
            })
            .catch(console.log));
        }
        this.current.messages.push(m);

        return acc;
      }, Promise.resolve());
      await sequence;
      target.messages = [];

      document.title = `ySyPyA (${contactsStore.messageCount})`;
      const workerStore = useWorkerStore();
      workerStore.updateBadge(contactsStore.messageCount);
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
          groupId,
        } = JSON.parse(objStr);

        let title;
        let content;
        if (!groupId) {
          const titleBuff = await mycrypto.privateDecrypt(pem, cryptedTitle);
          const contentBuff = await mycrypto.privateDecrypt(pem, cryptedContent);
          let dec = new TextDecoder();
          title = dec.decode(titleBuff);
          dec = new TextDecoder();
          content = dec.decode(contentBuff);
        } else {
          const groupStore = useGroupStore();
          const group = groupStore.list.find((g) => g.at === groupId);
          if (!group) return;

          const {
            iv: titleIV,
            token: titleToken,
          } = cryptedTitle;
          const titleBuff = await mycrypto.symmetricDecrypt(group.secret, titleIV, titleToken);

          const {
            iv: contentIV,
            token: contentToken,
          } = cryptedContent;
          const contentBuff = await mycrypto.symmetricDecrypt(group.secret, contentIV, contentToken);

          let dec = new TextDecoder();
          title = dec.decode(titleBuff);
          dec = new TextDecoder();
          content = dec.decode(contentBuff);
        }

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
                this.sendMail(at, 'Missed', text).then(() => resolve());
              }
            }
            connectionStore.sendFallback(reqBody, onAcknowledgment.bind(this));
          });
      });
    },
    async sendMail(title, text) {
      const message = {
        from: 'me',
        title,
        sentAt: Date.now(),
        content: text,
      };
      const { at, key: targetPem } = this.current.target;
      const b64Title = await mycrypto.publicEncrypt(targetPem, this.encodeText('Missed'));
      const b64Content = await mycrypto.publicEncrypt(targetPem, this.encodeText(text));

      const reqBody = {
        to: at,
        title: b64Title,
        content: b64Content,
      };

      await fetchWrapper.post(`${baseUrl}/message`, reqBody);
      this.current.messages.push(message);
    },
    async sendGroupMail(text) {
      const message = {
        from: 'me',
        title: '',
        sentAt: Date.now(),
        content: text,
      };
      this.current.messages.push(message);
      try {
        const { secret } = this.current.target;

        const authStore = useAuthStore();
        const from = authStore.user.user.username;
        const {
          iv: titleIV,
          token: titleToken,
        } = await mycrypto.symmetricEncrypt(this.encodeText(`From ${from}`), secret, false);
        const {
          iv: contentIV,
          token: contentToken,
        } = await mycrypto.symmetricEncrypt(this.encodeText(text), secret, false);

        const reqBody = {
          title: {
            iv: titleIV,
            token: titleToken,
          },
          content: {
            iv: contentIV,
            token: contentToken,
          },
        };

        await fetchWrapper.post(`${baseUrl}/group/${this.current.target.at}/message`, reqBody);
      } catch (err) {
        this.current.messages.pop();
        throw err;
      }
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
