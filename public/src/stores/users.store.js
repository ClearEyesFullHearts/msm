import { defineStore } from 'pinia';

import CryptoHelper from '@/lib/cryptoHelper';
import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/users`;
const mycrypto = new CryptoHelper();

function downloadKey(at, text) {
    var a = window.document.createElement('a')
    a.href = window.URL.createObjectURL(new Blob([text]))
    a.download = `@${at}.pem`;

    // Append anchor to body.
    document.body.appendChild(a)
    a.click()

    // Remove anchor from body
    document.body.removeChild(a)
}

export const useUsersStore = defineStore({
    id: 'users',
    state: () => ({
        users: {},
        user: {}
    }),
    actions: {
        async register(user) {
            const { PK, SK } = await mycrypto.generateKeyPair();
            downloadKey(user.username, SK);
            const send = {
                at: user.username,
                key: PK,
            }
            await fetchWrapper.post(`${baseUrl}`, send);
        },
        async getAll(search) {
            if(search.length < 3) return;
            this.users = { loading: true };
            try {
                this.users = await fetchWrapper.get(`${baseUrl}?search=${search}`);    
            } catch (error) {
                this.users = { error };
            }
        },
    }
});
