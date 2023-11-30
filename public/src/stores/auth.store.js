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

// const mylogger = new TimeLogger('auth store');

const baseUrl = Config.API_URL;
const chainSalt = Config.CHAIN_SALT;
const mycrypto = new CryptoHelper();
const myvalidator = new ChainHelper();
let interval;
let verificationTimeoutID;

/*
function roundTimeToNext(secondsNumber) {
  const epoch = Date.now();
  const coeff = (1000 * secondsNumber);
  const minutesChunk = Math.floor(epoch / coeff) * coeff;
  return minutesChunk + coeff;
}
async function getCredentials(username, pemContent, eup) {
  const ttl = roundTimeToNext(5);
  const headerHash = await mycrypto.hash(`${ttl}${eup}`);

  const sup = await mycrypto.signWithECDSA(pemContent, headerHash);
  // mylogger.logTime('proof signed');

  const passHeader = {
    'X-msm-Pass': `${ttl}:${sup}`,
  };
  const credentials = await fetchWrapper.get(`${baseUrl}/identity/${username}`, false, passHeader);
  return credentials;
}
*/

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    user: null,
    pem: null,
    signing: null,
    publicHash: null,
    hasVault: false,
    countDownMsg: null,
    isValidatedOnChain: false,
    autoConnect: false,
    idIsSet: false,
  }),
  actions: {
    async connect(username, key, signKey, first = false) {
      // mylogger.start();
      const challenge = await fetchWrapper.get(`${baseUrl}/identity/${username}`);
      // mylogger.logTime('get identity challenge');

      await this.login(key, signKey, challenge, first);
      // mylogger.logTime('login done');
    },

    async connectWithPassword(username, passphrase, first = false) {
      // create ECDH keys
      const { cpk, csk } = await mycrypto.generateECDHKeyPair();

      // ask the server for our attic
      const ecdhHeader = {
        'X-msm-Cpk': cpk,
      };
      const { salt: rs1, key: spk } = await fetchWrapper.get(`${baseUrl}/attic/${username}`, false, ecdhHeader);

      // computes the shared secret
      const tss = await mycrypto.computeSharedSecret({ csk, spk });

      // derive an encryption key from our shared secret
      const { key: dek, salt: rs3 } = await mycrypto.deriveKey(tss, `${username}-login`);

      // get comparison hash from the password
      const { key: hpx } = await mycrypto.PBKDF2Hash(passphrase, mycrypto.base64ToArBuff(rs1));

      // encrypt our comparison hash with our derived key
      const { iv: iv2, token: ehp } = await mycrypto.symmetricEncrypt(hpx, dek, false);

      // get our login information encrypted
      const passHeader = {
        'X-msm-Pass': `${iv2}.${ehp}.${rs3}`,
      };
      const credentials = await fetchWrapper.get(`${baseUrl}/identity/${username}`, false, passHeader);
      const { vault: { token: ebt, iv: iv3, salt: rs4 }, ...challenge } = credentials;

      // derive an encryption key from our shared secret
      const { key: dek2 } = await mycrypto.deriveKey(tss, `${username}-connection`, rs4);

      // decrypt the vault
      const vaultAsBuffer = await mycrypto.symmetricDecrypt(dek2, iv3, ebt);
      const vaultAsString = new TextDecoder().decode(vaultAsBuffer);

      const {
        token,
        salt: vaultSalt,
        iv: iv1,
      } = JSON.parse(vaultAsString);

      // get encryption hash from the password
      const rs2 = mycrypto.base64ToArBuff(vaultSalt);
      const { key: hp1 } = await mycrypto.PBKDF2Hash(passphrase, rs2);

      // decrypt the secret key file
      const decryptedKeys = await mycrypto.symmetricDecrypt(hp1, iv1, token);
      const keyFile = new TextDecoder().decode(decryptedKeys);
      const { key, signKey } = CryptoHelper.setContentAsSK(keyFile);

      await this.login(key, signKey, challenge, first);
      this.hasVault = true;
    },
    /*
    async connectWithPassword(username, passphrase, first = false) {
      // mylogger.start();
      const {
        proof, salt, iv, key: pemContent,
      } = await fetchWrapper.get(`${baseUrl}/attic/${username}`);
      // mylogger.logTime('get attic data');
      const rs2 = mycrypto.base64ToArBuff(salt);
      const iv2 = mycrypto.base64ToArBuff(iv);
      const { key: hp2 } = await mycrypto.PBKDF2Hash(passphrase, rs2);
      // mylogger.logTime('password hashed');

      const { token: eup } = await mycrypto.PBKDF2Encrypt(hp2, proof, iv2);
      // mylogger.logTime('proof encrypted');

      let credentials;
      try {
        credentials = await getCredentials(username, pemContent, eup);
      } catch (err) {
        if (err === 'Time to live is expired') {
          // retry once
          credentials = await getCredentials(username, pemContent, eup);
        } else {
          throw err;
        }
      }
      const { vault, ...challenge } = credentials;
      // mylogger.logTime('get vault & identity challenge');

      const {
        token,
        salt: vaultSalt,
        iv: iv1,
      } = vault;
      const rs1 = mycrypto.base64ToArBuff(vaultSalt);
      const { key: hp1 } = await mycrypto.PBKDF2Hash(passphrase, rs1);
      // mylogger.logTime('password hashed for keys decryption');

      const decryptedVault = await mycrypto.symmetricDecrypt(hp1, iv1, token);
      // mylogger.logTime('keys decrypted');
      const dec = new TextDecoder();
      const keyFile = dec.decode(decryptedVault);

      const { key, signKey } = CryptoHelper.setContentAsSK(keyFile);

      await this.login(key, signKey, challenge, first);
      this.hasVault = true;
      // mylogger.logTime('login done');
    },
    */
    async login(key, signKey, challenge, firstTime = false) {
      const alertStore = useAlertStore();
      try {
        await this.setIdentityUp(key, signKey, challenge);
        // mylogger.logTime('a - setIdentityUp');

        const epk = await mycrypto.getPublicKey(this.pem);
        const spk = await mycrypto.getSigningPublicKey(this.signing);
        // mylogger.logTime('b - get public key');

        this.publicHash = await mycrypto.hash(`${epk}\n${spk}`);
        // mylogger.logTime('c - get hash');

        const groupStore = useGroupStore();
        await groupStore.setGroupList(this.pem);
        // mylogger.logTime('d - setGroupList');
        const contactsStore = useContactsStore();
        contactsStore.setContactList(this.pem, this.user.contacts)
          .then(() => {
            contactsStore.updateMessages();
            if (!!window.Notification && window.Notification.permission === 'granted') {
              const workerStore = useWorkerStore();
              workerStore.subscribe().then((isSubscribed) => {
                if (isSubscribed) {
                  clearTimeout(contactsStore.timeout);
                  // mylogger.logTime('f - subscribe');
                }
              });
            }
            // mylogger.logTime('e - setContactList');
          });

        if (!firstTime) {
          this.onChainVerification();
        }

        this.idIsSet = true;
      } catch (error) {
        alertStore.error(error);
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
    async onChainVerification(timeout = 5000) {
      clearTimeout(verificationTimeoutID);
      if (this.isValidatedOnChain) {
        return;
      }
      const alertStore = useAlertStore();
      const spk = await mycrypto.getSigningPublicKey(this.signing);
      try {
        const userId = mycrypto.hash(`${chainSalt}${this.user.user.username}`);
        const isValidatedOnChain = await myvalidator.isValidated(userId);
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
        const challenge = await fetchWrapper.get(`${baseUrl}/identity/${this.user.user.username}`);

        await this.login(this.pem, this.signing, challenge, true);
      } catch (err) {
        this.logout();
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
      router.push('/connect');
      document.title = 'ySyPyA';
    },
  },
});
