import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import { useAlertStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';

const baseUrl = `${import.meta.env.VITE_API_URL}/user`;
const mycrypto = new CryptoHelper();
let interval;

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        user: null,
        pem: null,
        returnUrl: null,
        countDownMsg: null,
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
                const countDownDate = user.connection + (15 * 60 * 1000);

                interval = setInterval(() => {
                    // Get today's date and time
                    const now = new Date().getTime();

                    // Find the distance between now and the count down date
                    const distance = countDownDate - now;

                    // Time calculations for minutes and seconds
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                    this.countDownMsg = `${minutes}m ${seconds}s`;

                    // If the count down is finished, write some text
                    if (distance < 0) {
                        clearInterval(interval);
                        this.countDownMsg = 'expired';
                    }
                }, 1000);

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
            clearInterval(interval);
        }
    }
});
