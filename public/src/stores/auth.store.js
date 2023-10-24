/* eslint-disable import/prefer-default-export */
import { defineStore, getActivePinia } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import {
  useAlertStore, useContactsStore, useConnectionStore, useWorkerStore, useGroupStore,
} from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import ChainHelper from '@/lib/chainHelper';
import Config from '@/lib/config';
// temporary
// import TimeLogger from '@/lib/timeLogger';

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();
const myvalidator = new ChainHelper();
let interval;
let myVault;
let myChallenge;
let verificationTimeoutID;

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    user: null,
    pem: null,
    signing: null,
    publicHash: null,
    privateHash: null,
    hasVault: false,
    returnUrl: null,
    countDownMsg: null,
    isValidatedOnChain: false,
    autoConnect: false,
    idIsSet: false,
  }),
  actions: {
    async getIdentity(username, passphrase) {
      this.privateHash = await mycrypto.hash(passphrase);
      const passHeader = {
        'X-msm-Pass': this.privateHash,
      };
      const { vault, ...challenge } = await fetchWrapper.get(`${baseUrl}/identity/${username}`, false, passHeader);
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
    async login(key, signKey, firstTime = false) {
      // TimeLogger.start();
      const alertStore = useAlertStore();
      try {
        await this.setIdentityUp(key, signKey, myChallenge);
        // TimeLogger.logTime('a - setIdentityUp');

        const epk = await mycrypto.getPublicKey(this.pem);
        const spk = await mycrypto.getSigningPublicKey(this.signing);
        // TimeLogger.logTime('b - get public key');

        this.publicHash = await mycrypto.hash(`${epk}\n${spk}`);
        // TimeLogger.logTime('c - get hash');

        const groupStore = useGroupStore();
        await groupStore.setGroupList(this.pem);
        // TimeLogger.logTime('d - setGroupList');
        const contactsStore = useContactsStore();
        contactsStore.setContactList(this.pem, this.user.contacts)
          .then(() => {
            contactsStore.updateMessages();
            if (!!window.Notification && window.Notification.permission === 'granted') {
              const workerStore = useWorkerStore();
              workerStore.subscribe().then((isSubscribed) => {
                if (isSubscribed) {
                  clearTimeout(contactsStore.timeout);
                  // TimeLogger.logTime('f1 - subscribe');
                }
              });
            }
            // TimeLogger.logTime('e - setContactList');
          });

        if (!firstTime) {
          this.onChainVerification();
        }

        this.idIsSet = true;
        myVault = undefined;
        myChallenge = undefined;
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
        const passHeader = {
          'X-msm-Pass': this.privateHash,
        };
        const { vault, ...challenge } = await fetchWrapper.get(`${baseUrl}/identity/${this.user.user.username}`, false, passHeader);
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
      const passHash = await mycrypto.hash(passphrase);
      const pass = await mycrypto.sign(this.signing, passHash);

      let kill;
      if (killSwitch && killSwitch.length && killSwitch.length > 7) {
        const killHash = await mycrypto.hash(killSwitch);
        kill = await mycrypto.sign(this.signing, killHash);
      } else {
        const randKill = window.crypto.getRandomValues(new Uint8Array(32));
        const b64Kill = mycrypto.ArBuffToBase64(randKill);
        kill = await mycrypto.sign(this.signing, b64Kill);
      }

      await fetchWrapper.put(`${baseUrl}/vault`, { vault, pass, kill });

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
        if (workersStore.channel.mail) workersStore.channel.mail.close();
        if (workersStore.channel.group) workersStore.channel.group.close();
      }
      const pinia = getActivePinia();
      pinia._s.forEach((store) => store.$reset());
      router.push('/login');
      document.title = 'ySyPyA';
    },
  },
});
