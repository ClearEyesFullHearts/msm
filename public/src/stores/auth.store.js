import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import { useAlertStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';

const baseUrl = `${import.meta.env.VITE_API_URL}/user`;
const mycrypto = new CryptoHelper();

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        user: null,
        pem: null,
        returnUrl: null
    }),
    actions: {
        async login(username, key) {
            try {
                const challenge = await fetchWrapper.put(`${baseUrl}`, { at: username });
                const userStr = await mycrypto.resolve(key, challenge);

                const user = JSON.parse(userStr);
                this.pem = key

                // update pinia state
                this.user = user;

                // redirect to previous url or default to home page
                router.push(this.returnUrl || '/');
            } catch (error) {
                const alertStore = useAlertStore();
                alertStore.error(error);                
            }
        },
        logout() {
            this.user = null;
            router.push('/account/login');
        }
    }
});
