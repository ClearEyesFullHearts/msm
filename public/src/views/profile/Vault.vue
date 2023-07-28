<script setup>
import { ref, onMounted } from 'vue';

import { useAuthStore, useAlertStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const authStore = useAuthStore();
const alertStore = useAlertStore();

const passphraseInput = ref(null);
const confirmInput = ref(null);
const hasVault = ref(false);

onMounted(() => {
  hasVault.value = authStore.hasVault;
});

async function onSetUpVault() {
  const pass = passphraseInput.value.value;
  const confirm = confirmInput.value.value;

  if (!pass || !confirm || pass !== confirm) {
    alertStore.error('You need to set up a correct passphrase in both text box');
    return;
  }
  if (pass.length < 16) {
    alertStore.error('Passphrase must be at least 16 characters long');
    return;
  }

  await authStore.setVault(pass);
  hasVault.value = authStore.hasVault;
}

async function onEmptyVault() {
  await authStore.emptyVault();
  hasVault.value = authStore.hasVault;
}

function onDownloadSK() {
  const itemValue = `${this.authStore.pem}${CryptoHelper.SEPARATOR}${this.authStore.signing}`;
  FileHelper.download(`@${this.authStore.user.user.username}.pem`, itemValue);
}
</script>

<template>
  <div class="card m-3">
    <h4 class="card-header">
      TL/DR
    </h4>
    <div class="card-body">
      <ul>
        <li />
      </ul>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Vault
    </h4>
    <div class="card-body">
      <div v-show="hasVault">
        <button
          class="btn btn-danger mr-1"
          @click="onEmptyVault()"
        >
          Empty vault
        </button>
        <button
          class="btn btn-primary ml-1"
          @click="onDownloadSK()"
        >
          Download SK
        </button>
      </div>
      <div v-show="!hasVault">
        <p>Enter your vault's password</p>
        <p>
          <input
            id="passphrase"
            ref="passphraseInput"
            type="password"
            class="form-control"
            autocomplete="off"
          >
        </p>
        <p>Confirm your vault's password</p>
        <p>
          <input
            id="confirm"
            ref="confirmInput"
            type="password"
            class="form-control"
            autocomplete="off"
          >
        </p>
        <button
          class="btn btn-success"
          @click="onSetUpVault()"
        >
          Set keys in the vault
        </button>
      </div>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Full explanation
    </h4>
    <div class="card-body">
      <p />
    </div>
  </div>
</template>
