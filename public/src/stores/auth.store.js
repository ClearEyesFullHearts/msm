/* eslint-disable import/prefer-default-export */
import { defineStore, getActivePinia } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import {
  useAlertStore, useUsersStore, useContactsStore, useConnectionStore, useWorkerStore,
} from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import ChainHelper from '@/lib/chainHelper';
import Config from '@/lib/config';

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();
const myvalidator = new ChainHelper();
let interval;
let myVault;
let myKillSwitch;
let myChallenge;
let verificationTimeoutID;

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
      const { vault, switch: killSwitch, ...challenge } = await fetchWrapper.get(`${baseUrl}/identity/${username}`);
      myChallenge = challenge;
      if (vault) {
        this.hasVault = true;
        myVault = vault;
      } else {
        this.hasVault = false;
        myVault = undefined;
      }
      if (killSwitch) {
        myKillSwitch = killSwitch;
      } else {
        myKillSwitch = undefined;
      }
    },
    async openVault(passphrase) {
      if (!myVault || !myVault.iv || !myVault.token) {
        throw new Error('No vault recorded');
      }
      const {
        iv,
        token,
      } = myVault;
      const hashPass = await mycrypto.hash(passphrase);
      try {
        const decryptedVault = await mycrypto.symmetricDecrypt(hashPass, iv, token);

        const dec = new TextDecoder();
        return dec.decode(decryptedVault);
      } catch (err) {
        throw new Error('WRONG_PASSWORD');
      }
    },
    async openKillSwitch(passphrase) {
      if (!myKillSwitch || !myKillSwitch.iv || !myKillSwitch.token) {
        throw new Error('No vault recorded');
      }

      const {
        iv,
        token,
      } = myKillSwitch;
      const hashPass = await mycrypto.hash(passphrase);
      try {
        const decryptedVault = await mycrypto.symmetricDecrypt(hashPass, iv, token);

        const dec = new TextDecoder();
        return dec.decode(decryptedVault);
      } catch (err) {
        throw new Error('WRONG_PASSWORD');
      }
    },
    async login(key, signKey, firstTime = false) {
      const alertStore = useAlertStore();
      try {
        await this.setIdentityUp(key, signKey, myChallenge);

        const epk = await mycrypto.getPublicKey(this.pem);
        const spk = await mycrypto.getSigningPublicKey(this.signing);

        this.publicHash = await mycrypto.hash(`${epk}\n${spk}`);

        const contactsStore = useContactsStore();
        await contactsStore.setContactList(this.pem, this.user.contacts);

        let isSubscribed = false;
        if (!!Notification && Notification.permission === 'granted') {
          const workerStore = useWorkerStore();
          isSubscribed = await workerStore.subscribe();
        }
        if (!isSubscribed) {
          await contactsStore.updateMessages();
        } else {
          await contactsStore.updateMessages(false);
        }

        if (!firstTime) {
          this.onChainVerification();
        }

        myVault = undefined;
        myKillSwitch = undefined;
        myChallenge = undefined;
      } catch (error) {
        alertStore.error(error);
      }
    },
    async kill(key, signKey) {
      const alertStore = useAlertStore();
      const usersStore = useUsersStore();
      try {
        await this.setIdentityUp(key, signKey, myChallenge);
        await usersStore.destroy(this.user.user.username);
        this.logout();
      } catch (error) {
        alertStore.error(error);
      }
    },
    toggleAutoConnect() {
      if (!this.autoConnect && this.countDownMsg === 'expired') {
        this.logout();
        return;
      }
      this.autoConnect = !this.autoConnect;
    },
    async relog() {
      if (this.countDownMsg === 'expired' && !this.autoConnect) {
        this.logout();
        return;
      }
      try {
        clearInterval(interval);
        const { vault, ...challenge } = await fetchWrapper.get(`${baseUrl}/identity/${this.user.user.username}`);
        await this.setIdentityUp(this.pem, this.signing, challenge);
      } catch (err) {
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
    async setVault(passphrase, killSwitch) {
      const itemValue = `${this.pem}${CryptoHelper.SEPARATOR}${this.signing}`;
      const { token, iv } = await mycrypto.symmetricEncrypt(itemValue, passphrase);
      const vault = { token, iv };

      let kill;
      if (killSwitch && killSwitch.length && killSwitch.length > 7) {
        const switchEnc = await mycrypto.symmetricEncrypt(itemValue, killSwitch);
        kill = { token: switchEnc.token, iv: switchEnc.iv };
      } else {
        const switchEnc = await mycrypto.symmetricEncrypt(itemValue);
        kill = { token: switchEnc.token, iv: switchEnc.iv };
      }

      await fetchWrapper.put(`${baseUrl}/vault`, { vault, switch: kill });

      this.hasVault = true;
    },
    async emptyVault() {
      await fetchWrapper.delete(`${baseUrl}/vault`);

      this.hasVault = false;
    },
    async onChainVerification(timeout = 5000) {
      clearTimeout(verificationTimeoutID);
      if (this.isValidatedOnChain) {
        return;
      }
      const alertStore = useAlertStore();
      const spk = await mycrypto.getSigningPublicKey(this.signing);
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

      if (!this.isValidatedOnChain && timeout < 100000) {
        verificationTimeoutID = setTimeout(() => {
          this.onChainVerification(timeout * 2);
        }, timeout);
      }
    },
    logout() {
      const contactsStore = useContactsStore();
      const connectionStore = useConnectionStore();
      const workersStore = useWorkerStore();
      clearTimeout(contactsStore.timeout);
      clearTimeout(verificationTimeoutID);
      clearInterval(interval);
      if (connectionStore.isConnected) {
        connectionStore.disconnect(true);
      }
      if (workersStore.channel) {
        workersStore.channel.close();
      }
      const pinia = getActivePinia();
      pinia._s.forEach((store) => store.$reset());
      router.push('/login');
      document.title = 'ySyPyA';
    },
  },
});
