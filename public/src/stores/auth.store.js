import { defineStore, getActivePinia } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import { useAlertStore, useContactsStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';

const baseUrl = `${import.meta.env.VITE_API_URL}`;
const mycrypto = new CryptoHelper();
let interval;
let myVault;
let myChallenge;

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    user: null,
    pem: null,
    signing: null,
    publicHash: null,
    hasVault: false,
    returnUrl: null,
    countDownMsg: null,
    isValidatedOnChain: false,
  }),
  actions: {
    async getIdentity(username) {
      const { vault, ...challenge } = await fetchWrapper.get(`${baseUrl}/identity/${username}`);
      myChallenge = challenge;
      if (vault) {
        this.hasVault = true;
        myVault = vault;
      } else {
        this.hasVault = false;
        myVault = undefined;
      }
    },
    async openVault(passphrase) {
      if (!myVault || !myVault.iv || myVault.token) {
        const alertStore = useAlertStore();
        alertStore.error('No vault recorded');
      }
      const {
        iv,
        token,
      } = myVault;
      const hashPass = await mycrypto.hash(passphrase);
      const decryptedVault = await mycrypto.symmetricDecrypt(hashPass, iv, token);
      
      const dec = new TextDecoder();
      return dec.decode(decryptedVault);
    },
    async login(key, signKey) {
      try {
        const userStr = await mycrypto.resolve(key, myChallenge);

        const user = JSON.parse(userStr);
        this.pem = key;
        this.signing = signKey;

        const epk = await mycrypto.getPublicKey(this.pem);
        const spk = await mycrypto.getSigningPublicKey(this.signing);

        this.publicHash = await mycrypto.hash(`${epk}\n${spk}`);

        // update pinia state
        this.user = user;
        const countDownDate = user.connection + user.config.sessionTime;

        const alertStore = useAlertStore();
        try{
          const isValidatedOnChain = await myvalidator.isValidated(this.user.user.id);
          if (isValidatedOnChain){
            const { signature } = isValidatedOnChain;
            const result = await mycrypto.verify(this.signing, this.publicHash, signature, true);
            if(result) {
              this.isValidatedOnChain = true;
              alertStore.success('Your on-chain validation is confirmed');
            }else{
              throw new Error('Signature mismatch on chain');
            }
          }
        }catch(err){
          alertStore.error(`${err.message || err}.\nYour on chain validation is wrong, do not use this account.\nReport the problem to an admin ASAP!`);
        }
        
        myVault = undefined;
        myChallenge = undefined;

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
        
        const contactsStore = useContactsStore();
        contactsStore.setContactList(this.pem, user.contacts);

        // redirect to previous url or default to home page
        router.push(this.returnUrl || '/messages');
      } catch (error) {
        const alertStore = useAlertStore();
        alertStore.error(error);
      }
    },
    async setVault(passphrase) {
      const itemValue = `${this.pem}${CryptoHelper.SEPARATOR}${this.signing}`;
      const { token, iv } = await mycrypto.symmetricEncrypt(itemValue, passphrase);

      await fetchWrapper.put(`${baseUrl}/vault`, { token, iv });

      this.hasVault = true;
    },
    async emptyVault() {
      await fetchWrapper.delete(`${baseUrl}/vault`);

      this.hasVault = false;
    },
    logout() {
      const pinia = getActivePinia();
      pinia._s.forEach((store) => store.$reset());
      router.push('/account/login');
      document.title = 'ySyPyA';
      clearInterval(interval);
    },
  },
});
