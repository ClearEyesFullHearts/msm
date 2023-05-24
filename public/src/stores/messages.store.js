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
        targetMessage: {},
        targets: {},
        contentLength: 0
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
                }
            } catch (error) {
                this.headers = { error };
            }
        },
        async getMessage(msgId) {
            try {
                const { id, challenge } = await fetchWrapper.get(`${baseUrl}/message/${msgId}`);

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
                let dec = new TextDecoder();
                const title = dec.decode(titleBuff);
                dec = new TextDecoder();
                const content = dec.decode(contentBuff);

                this.message = {
                    id,
                    from,
                    sentAt,
                    title,
                    content,
                };

                const alertStore = useAlertStore();
                alertStore.success('Reminder: This message will disappear from the server 2 minutes from now');
            } catch (error) {
                const alertStore = useAlertStore();
                alertStore.error(`An error occured: ${error}`);
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
                return true;
            } catch (error) {
                const alertStore = useAlertStore();
                alertStore.error(`An error occured: ${error}`);
            }
            return false;
        },
        async downloadMessage() {
            var a = window.document.createElement('a');
            const {
                id,
                ...restMessage
            } = this.message;
        
            const authStore = useAuthStore();
            const pem = authStore.pem;
        
            const challenge = await mycrypto.challenge(pem, JSON.stringify(restMessage));
        
            a.href = window.URL.createObjectURL(new Blob([JSON.stringify({ id, challenge })]));
            a.download = `@${at}.pem`;
        
            // Append anchor to body.
            document.body.appendChild(a)
            a.click()
        
            // Remove anchor from body
            document.body.removeChild(a)
        }
    }
});
