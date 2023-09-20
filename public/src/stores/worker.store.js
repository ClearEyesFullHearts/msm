/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import Config from '@/lib/config';
import { fetchWrapper } from '@/helpers';

const {
  VAPID_KEY, API_URL,
} = Config;

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useWorkerStore = defineStore({
  id: 'worker',
  state: () => ({
    sw: null,
    permission: null,
    subscription: null,
    channel: null,
  }),
  getters: {
    allowed: (state) => state.permission === 'granted',
    disabled: (state) => state.permission !== 'default',
  },
  actions: {
    async start() {
      if ('serviceWorker' in navigator) {
        this.sw = await navigator.serviceWorker.register('/worker/sw.js');
        this.permission = Notification.permission;
      }
    },
    async subscribe(force = false) {
      if (!this.sw) return;
      this.permission = Notification.permission;
      if (Notification.permission !== 'granted' && !force) return;

      this.subscription = await this.sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_KEY),
      });

      const {
        endpoint,
        keys,
      } = this.subscription.toJSON();

      try {
        await fetchWrapper.post(`${API_URL}/subscription`, { endpoint, keys });
      } catch (err) {
        console.log('error on endpoint', endpoint);
      }

      this.permission = Notification.permission;
    },
    updateBadge(unreadMessages) {
      const messageChannel = new MessageChannel();

      // Send the service worker a message to clear the cache.
      // We can't use a BroadcastChannel for this because the
      // service worker may need to be woken up. MessageChannels do that.
      navigator.serviceWorker.controller.postMessage({
        action: 'updatebadge',
        unread: unreadMessages,
      }, [messageChannel.port2]);
    },
  },
});
