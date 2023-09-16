/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import Config from '@/lib/config';
import CryptoHelper from '@/lib/cryptoHelper';
import {
  useAuthStore, useContactsStore, useConversationStore, useAlertStore,
} from '@/stores';

const mycrypto = new CryptoHelper();
const baseUrl = Config.WSS_URL;

function onNewConnection(message) {
  const { from } = message;
  const contactsStore = useContactsStore();
  contactsStore.connection(from, true);
}

export const useConnectionStore = defineStore({
  id: 'connection',
  state: () => ({
    socket: null,
    isConnected: false,
    isConnecting: false,
    messagesSent: {},
  }),
  actions: {
    async connect() {
      this.isConnecting = true;
      const authStore = useAuthStore();
      if (authStore.countDownMsg === 'expired') {
        await authStore.relog();
      }
      const { token, contacts, ...restUser } = authStore.user;
      const data = JSON.stringify({
        ...restUser,
        action: 'WSS',
      });
      const signature = await mycrypto.sign(authStore.signing, data);

      const wssToken = mycrypto.clearTextToHEX(token);
      const wssSignature = mycrypto.clearTextToHEX(signature);

      this.socket = new WebSocket(baseUrl, [wssToken, wssSignature]);
      this.socket.addEventListener('open', () => {
        this.isConnecting = false;
        this.isConnected = true;
        if (!authStore.autoConnect) authStore.toggleAutoConnect();
      });
      this.socket.addEventListener('error', () => {
        const alertStore = useAlertStore();
        alertStore.error('An error occured while connecting, retry later.');
        this.isConnecting = false;
      });
      this.socket.addEventListener('close', () => {
        this.socket = null;
        this.isConnected = false;
        this.isConnecting = false;
        const contactsStore = useContactsStore();
        contactsStore.disconnected();
      });
      this.socket.addEventListener('message', (event) => {
        const { action, message } = JSON.parse(event.data);
        // console.log(action, message)
        switch (action) {
          case 'connected':
            onNewConnection(message);
            break;
          case 'disconnected':
            this.onDisconnection(message);
            break;
          case 'fallback':
            this.onMessage(message);
            break;
          case 'error':
            this.onError(message);
            break;
          default:
            console.log('default', event.data);
            break;
        }
      });
    },
    sendFallback(message, callback) {
      const msg = {
        action: 'fallback',
        message,
      };
      const timeout = setTimeout(() => {
        delete this.messagesSent[message.requestId];
        callback(false);
      }, 10000);
      this.messagesSent[message.requestId] = {
        cb: callback,
        timeout,
      };
      this.socket.send(JSON.stringify(msg));
    },
    sendAck(to, requestId) {
      const msg = {
        action: 'fallback',
        message: {
          to,
          requestId,
          content: 'ack',
        },
      };

      this.socket.send(JSON.stringify(msg));
    },
    onDisconnection(message) {
      const { username, requestId } = message;
      const contactsStore = useContactsStore();
      contactsStore.connection(username, false);
      if (this.messagesSent[requestId]) {
        clearTimeout(this.messagesSent[requestId].timeout);
        this.messagesSent[requestId].cb(false);
        delete this.messagesSent[requestId];
      }
    },
    async onMessage(message) {
      const { from, requestId, content } = message;

      if (content === 'ack') {
        if (this.messagesSent[requestId]) {
          clearTimeout(this.messagesSent[requestId].timeout);
          this.messagesSent[requestId].cb(true);
          delete this.messagesSent[requestId];
        }
      } else {
        this.sendAck(from, requestId);

        const authStore = useAuthStore();
        const { pem } = authStore;
        const contentBuff = await mycrypto.privateDecrypt(pem, content);
        const dec = new TextDecoder();
        const txt = dec.decode(contentBuff);

        const conversationStore = useConversationStore();
        const hasBeenTreated = await conversationStore.getFallbackMessage(from, txt);

        if (!hasBeenTreated) {
          const contactsStore = useContactsStore();
          await contactsStore.addFallBackMessage({
            from: `@${from}`,
            content: conversationStore.decodeText(txt),
            sentAt: Date.now(),
          });
          if (contactsStore.dirty) contactsStore.saveContactList(pem);
        }
      }
    },
    onError(message) {
      const {
        requestId,
        // action,
        error,
      } = message;

      if (this.messagesSent[requestId]) {
        clearTimeout(this.messagesSent[requestId].timeout);
        this.messagesSent[requestId].cb(new Error(error), true);
        delete this.messagesSent[requestId];
      }
    },
    disconnect() {
      this.socket.close();
      this.isConnected = false;
    },
  },
});
