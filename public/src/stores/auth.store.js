/* eslint-disable import/prefer-default-export */
import { defineStore, getActivePinia } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import { useAlertStore, useContactsStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import ChainHelper from '@/lib/chainHelper';

const baseUrl = `${import.meta.env.VITE_API_URL}`;
const mycrypto = new CryptoHelper();
const myvalidator = new ChainHelper();
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
    autoConnect: false,
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
      const alertStore = useAlertStore();
      try {

        await this.setIdentityUp(key, signKey, myChallenge);

        const epk = await mycrypto.getPublicKey(this.pem);
        const spk = await mycrypto.getSigningPublicKey(this.signing);
  
        this.publicHash = await mycrypto.hash(`${epk}\n${spk}`);

        const contactsStore = useContactsStore();
        contactsStore.setContactList(this.pem, this.user.contacts);

        // redirect to previous url or default to home page
        router.push(this.returnUrl || '/messages');

        try {
          const isValidatedOnChain = await myvalidator.isValidated(this.user.user.id);
          if (isValidatedOnChain) {
            const { signature } = isValidatedOnChain;
            const result = await mycrypto.verify(spk, this.publicHash, signature, true);
            if (result) {
              this.isValidatedOnChain = true;
              alertStore.success('Your on-chain validation is confirmed');
            } else {
              throw new Error('Signature mismatch on chain');
            }
          }
        } catch (err) {
          console.log('error on validation', err);
          alertStore.error(`${err.message || err}.\nYour on chain validation is wrong, do not use this account.\nReport the problem to an admin ASAP!`);
        }

        myVault = undefined;
        myChallenge = undefined;
      } catch (error) {
        alertStore.error(error);
      }
    },
    async relog(){
      try {
        clearInterval(interval);
        const { vault, ...challenge } = await fetchWrapper.get(`${baseUrl}/identity/${this.user.user.username}`);
        await this.setIdentityUp(this.pem, this.signing, challenge);
      }catch(err){
        this.logout();
      }
    },
    async setIdentityUp(key, signKey, challenge) {
      const userStr = await mycrypto.resolve(key, challenge);

      const user = JSON.parse(userStr);
      this.pem = key;
      this.signing = signKey;

      // update pinia state
      this.user = user;
      const countDownDate = user.connection + user.config.sessionTime;

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
    },
    async setVault(passphrase) {
      const itemValue = `${this.pem}${CryptoHelper.SEPARATOR}${this.signing}`;
      const { token, iv } = await mycrypto.symmetricEncrypt(itemValue, passphrase);

      console.log('this.pem length', this.pem.length)
      console.log('this.signing length', this.signing.length)
      console.log('token length', token.length)

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
