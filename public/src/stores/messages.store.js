import { defineStore } from 'pinia';

import CryptoHelper from '@/lib/cryptoHelper';
import { fetchWrapper } from '@/helpers';
import { useAuthStore, useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}`;
const mycrypto = new CryptoHelper();

export const useMessagesStore = defineStore({
    id: 'messages',
    state: () => ({
        headers: {},
        message: {},
        targets: {}
    }),
    actions: {
        async getHeaders() {
            this.headers = { loading: true };
            try {
                const challenges = await fetchWrapper.get(`${baseUrl}/inbox`);

                const authStore = useAuthStore();
                const pem = authStore.pem;
                
                this.headers = [];
                for(let i = 0; i < challenges.length; i++){
                    const { id, challenge } = challenges[i];
                    const objStr = await mycrypto.resolve(pem, challenge);
                    const {
                        from,
                        sentAt,
                        title: cryptedTitle
                    } = JSON.parse(objStr);

                    const titleBuff = await mycrypto.privateDecrypt(pem, cryptedTitle);
                    const dec = new TextDecoder();
                    const title = dec.decode(titleBuff);

                    this.headers.push({
                        id,
                        from,
                        sentAt,
                        title
                    });
                    const alertStore = useAlertStore();
                }
            } catch (error) {
                this.headers = { error };
            }
        },
        async getMessage(msgId) {
            this.message = { loading: true };
            try {
                const challenge = await fetchWrapper.get(`${baseUrl}/message/${msgId}`);

                const authStore = useAuthStore();
                const pem = authStore.pem;

                const objStr = await mycrypto.resolve(pem, challenge);
                const {
                    from,
                    sentAt,
                    title: cryptedTitle,
                    content: cryptedContent,
                } = JSON.parse(objStr);

                const titleBuff = await mycrypto.privateDecrypt(pem, cryptedTitle);
                const contentBuff = await mycrypto.privateDecrypt(pem, cryptedContent);
                const dec = new TextDecoder();
                const title = dec.decode(titleBuff);
                const content = dec.decode(contentBuff);

                this.message = {
                    id,
                    from,
                    sentAt,
                    title,
                    content,
                };
                alertStore.success('Reminder: This message will disappear from the server 2 minutes from now');
            } catch (error) {
                this.message = { error };
            }
        },
        async write(at, targetPem, title, text, isAnonymous) {
            try {
                const b64Title = await mycrypto.publicEncrypt(targetPem, title);
                const b64Content = await mycrypto.publicEncrypt(targetPem, text);

                const reqBody = {
                    to: at,
                    title: b64Title,
                    content: b64Content,
                    anonymous: isAnonymous,
                };
                
                await fetchWrapper.post(`${baseUrl}/message`, reqBody);
                const alertStore = useAlertStore();
                alertStore.success('Your message is sent');
            } catch (error) {
                this.users = { error };
            }
            
        }
    }
});
