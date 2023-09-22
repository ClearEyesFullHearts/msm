/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import Config from '@/lib/config';
import { fetchWrapper } from '@/helpers';
import { useAuthStore, useContactsStore } from '@/stores';

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
    installable: false,
    installed: false,
    installPrompt: null,
  }),
  getters: {
    allowed: (state) => state.permission === 'granted',
    disabled: (state) => state.permission !== 'default',
  },
  actions: {
    async start() {
      if ('serviceWorker' in navigator) {
        window.addEventListener('beforeinstallprompt', (event) => {
          event.preventDefault();
          this.installPrompt = event;
          this.installable = true;
        });
        window.addEventListener('appinstalled', () => {
          this.installed = true;
        });
        this.sw = await navigator.serviceWorker.register('/worker/sw.js');
        this.permission = Notification.permission;
      }
    },
    async subscribe(force = false) {
      if (!this.sw) return false;
      this.permission = Notification.permission;

      if (Notification.permission !== 'granted' && !force) return false;

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
      if (this.permission === 'granted') {
        const authStore = useAuthStore();
        const bc = new BroadcastChannel('new_mail');
        bc.onmessage = (event) => {
          const { data } = event;
          if (data.to === authStore.user.user.username) {
            const contactsStore = useContactsStore();
            contactsStore.updateMessages(false);
          }
        };
      }

      return true;
    },
    async install() {
      if (!this.installPrompt) {
        return;
      }
      const result = await this.installPrompt.prompt();

      if (result.outcome === 'accepted') {
        this.installed = true;
      }
    },
    updateBadge(unreadMessages) {
      if (!this.sw) return;

      if (this.sw.active) {
        this.sw.active.postMessage({
          action: 'updatebadge',
          unread: unreadMessages,
        });
      }
    },
  },
});
