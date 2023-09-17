/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import CryptoHelper from '@/lib/cryptoHelper';

const mycrypto = new CryptoHelper();

const defaultTimeout = 2000;

const createToast = (text, status) => ({
  text,
  status,
  id: mycrypto.uuidV4(),
});

export const useToasterStore = defineStore({
  id: 'toaster',
  state: () => ({
    toasts: [],
  }),
  actions: {
    updateState(payload, status) {
      const { text, timeout } = payload;

      const toast = createToast(text, status);

      this.toasts.push(toast);

      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== toast.id);
      }, timeout || defaultTimeout);
    },
    success(payload) {
      this.updateState(payload, 'success');
    },

    warning(payload) {
      this.updateState(payload, 'warning');
    },

    error(payload) {
      this.updateState(payload, 'error');
    },
  },
});
