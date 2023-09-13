/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import Config from '@/lib/config';
import CryptoHelper from '@/lib/cryptoHelper';
import { useAuthStore, useContactsStore, useConversationStore } from '@/stores';

const mycrypto = new CryptoHelper();
const baseUrl = Config.WSS_URL;

function onNewConnection(message) {
  console.log('onNewConnection');
  const { from } = message;
  const contactsStore = useContactsStore();
  contactsStore.connection(from, true);
}
function onDisconnection(message) {
  console.log('onDisconnection');
  const { username } = message;
  const contactsStore = useContactsStore();
  contactsStore.connection(username, true);
}
async function onFallbackMessageReceived(message) {
  console.log('onFallbackMessageReceived');
  const { from, content } = message;
  const authStore = useAuthStore();
  const { pem } = authStore;
  const contentBuff = await mycrypto.privateDecrypt(pem, content);
  const dec = new TextDecoder();
  const txt = dec.decode(contentBuff);

  const conversationStore = useConversationStore();
  const hasBeenTreated = conversationStore.getFallbackMessage(from, txt);
  if (!hasBeenTreated) {
    const contactsStore = useContactsStore();
    await contactsStore.fillConversations([
      {
        from,
        content: txt,
        sentAt: Date.now(),
      },
    ]);
  }
}

export const useConnectionStore = defineStore({
  id: 'connection',
  state: () => ({
    socket: null,
    isConnected: false,
  }),
  actions: {
    async connect() {
      const authStore = useAuthStore();
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
        this.isConnected = true;
      });
      this.socket.addEventListener('error', (event) => {
        console.log('socket error', event);
      });
      this.socket.addEventListener('close', (event) => {
        console.log('socket close', event);
        this.socket = null;
        this.isConnected = false;
      });
      this.socket.addEventListener('message', (event) => {
        const { action, message } = JSON.parse(event.data);
        switch (action) {
          case 'connected':
            console.log('connected', message);
            // {"action":"connected","message":{"from":"xxxxxxxx"}}
            onNewConnection(message);
            break;
          case 'disconnected':
            console.log('disconnected', message);
            onDisconnection(message);
            break;
          case 'fallback':
            console.log('fallback', message);
            onFallbackMessageReceived(message);
            break;
          case 'error':
            console.log('error', message);
            break;
          default:
            console.log('default', event.data);
            break;
        }
      });
    },
    disconnect() {
      this.socket.close();
      this.isConnected = false;
    },
  },
});
