/* eslint-disable import/prefer-default-export */
/* eslint-disable no-extra-boolean-cast */
import { defineStore } from 'pinia';
import Config from '@/lib/config';
import { fetchWrapper } from '@/helpers';
import { useAuthStore, useContactsStore, useGroupStore } from '@/stores';

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
let notifTimeout;
export const useWorkerStore = defineStore({
  id: 'worker',
  state: () => ({
    sw: null,
    permission: null,
    subscription: null,
    installable: false,
    installed: false,
    installPrompt: null,
    channel: null,
    notifOk: true,
  }),
  getters: {
    allowed: (state) => state.permission === 'granted',
    disabled: (state) => state.permission !== 'default',
  },
  actions: {
    async start() {
      if ('serviceWorker' in window.navigator) {
        window.addEventListener('beforeinstallprompt', (event) => {
          event.preventDefault();
          this.installPrompt = event;
          this.installable = true;
        });
        window.addEventListener('appinstalled', () => {
          this.installed = true;
        });
        this.sw = await window.navigator.serviceWorker.register('/worker/sw.js');
        await new Promise((r) => setTimeout(() => r(), 500));
        this.permission = !!window.Notification ? window.Notification.permission : 'denied';
      }
    },
    async subscribe(force = false) {
      if (!this.sw) return false;
      this.permission = !!window.Notification ? window.Notification.permission : 'denied';

      if (!window.Notification || (window.Notification.permission !== 'granted' && !force)) return false;

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

      this.permission = !!window.Notification ? window.Notification.permission : 'denied';
      if (this.permission === 'granted') {
        this.listenBroadcast();
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
    notify({ text }) {
      if (!this.sw) return false;

      if (this.sw.active) {
        if (this.notifOk) {
          this.sw.active.postMessage({
            action: 'notify',
            text,
          });
        } else {
          this.notifOk = true;
          clearTimeout(notifTimeout);
        }
        return true;
      }
      return false;
    },
    listenBroadcast() {
      const authStore = useAuthStore();
      const contactsStore = useContactsStore();
      const groupStore = useGroupStore();

      // mail channel
      const mail = new BroadcastChannel('new_mail');
      mail.onmessage = (event) => {
        const { data } = event;
        if (data.to === authStore.user.user.username) {
          contactsStore.updateMessages(false);
          this.notifOk = false;
          notifTimeout = setTimeout(() => {
            this.notifOk = true;
          }, 1000);
        }
      };

      // group channel
      const group = new BroadcastChannel('group_change');
      group.onmessage = (event) => {
        const { data } = event;
        console.log('receive group change', event)
        if (data.to === authStore.user.user.username) {
          groupStore.updateGroup(data.from);
        }
      };
      this.channel = {
        mail,
      };
    },
  },
});
