import Config from '@/lib/config';
import { fetchWrapper } from '@/helpers';

const {
  VAPID_KEY, API_URL,
} = Config;
class SubscriptionHelper {
  constructor() {
    this.urlB64ToUint8Array = (base64String) => {
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
    };
  }

  async subscribe() {
    const swReg = await navigator.serviceWorker.register('/worker/sw.js');
    const subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlB64ToUint8Array(VAPID_KEY),
    });

    console.log('subscriptoin', subscription.toJSON());

    const {
      endpoint,
      keys,
    } = subscription.toJSON();
    console.log('endpoint', endpoint);
    console.log('keys', keys);

    await fetchWrapper.post(`${API_URL}/subscription`, { endpoint, keys });
  }
}

export default SubscriptionHelper;
