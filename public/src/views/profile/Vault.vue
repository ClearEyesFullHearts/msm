<script setup>
import { ref, onMounted } from 'vue';
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAuthStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const authStore = useAuthStore();

const hasVault = ref(false);

const schema = Yup.object().shape({
  passphrase: Yup.string()
    .min(16, 'Passphrase must be at least 16 characters')
    .required('Passphrase is required'),
  confirmPassphrase: Yup.string()
    .oneOf([Yup.ref('passphrase'), null], 'Passphrases must match')
    .required('Confirm Passphrase is required'),
});

onMounted(() => {
  hasVault.value = authStore.hasVault;
});

async function onSetUpVault(values) {
  await authStore.setVault(values.passphrase);
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
        <li>
          Enter a pass phrase (minimum 16 characters) to encrypt your secret key and send it to us.
          You'll then be able to login with that pass phrase instead of your secret key file
        </li>
        <li>
          You can get rid of your secret key file but be aware that there is no retrieval
          mechanism if you forget your pass phrase, except for this file.
        </li>
        <li>
          You'll always be able to connect with your secret key file
          and you can download it here again if you need to
        </li>
      </ul>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Vault
    </h4>
    <div class="card-body">
      <div v-show="hasVault">
        <p>
          You can get a copy of your secret key here if you need it:
        </p>
        <button
          class="btn btn-primary mb-3"
          @click="onDownloadSK()"
        >
          Download SK
        </button>
        <p>
          Empty your vault to get back to managing your secret key yourself:
        </p>
        <button
          class="btn btn-danger"
          @click="onEmptyVault()"
        >
          Empty vault
        </button>
      </div>
      <div v-show="!hasVault">
        <Form
          v-slot="{ errors }"
          :validation-schema="schema"
          @submit="onSetUpVault"
        >
          <div class="form-row">
            <label>Pass phrase</label>
            <Field
              name="passphrase"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.passphrase }"
            />
            <div class="invalid-feedback">
              {{ errors.passphrase }}
            </div>
          </div>
          <div class="form-row mt-2">
            <label>Confirm pass phrase</label>
            <Field
              name="confirmPassphrase"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.confirmPassphrase }"
            />
            <div class="invalid-feedback">
              {{ errors.confirmPassphrase }}
            </div>
          </div>
          <div class="form-row form-group mt-2">
            <button
              type="submit"
              class="btn btn-primary mr-1"
            >
              Set keys in the vault
            </button>
          </div>
        </Form>
      </div>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Full explanation
    </h4>
    <div class="card-body">
      <p>
        The vault let's you entrust us with your secret key in as safe as possible a manner
        so that you don't have to manage it yourself.
      </p>
      <p>
        For that we encrypt your private key through symmetric encryption
        with a hash of your pass phrase as a password and store the result,
        so that, on login, instead of uploading your secret key
        you open your vault, get your secret key and process as usual.
      </p>
      <p>
        Once your vault is set up you theorically can get rid of your secret key file but
        you should know that since your secret key encryption (with your passphrase)
        is entirely done on the client side, there can be no retrieval mechanism.
        If you forget your pass phrase the only way to connect to your account is
        with your secret key file.
      </p>
      <p>
        You can always empty your vault, but be sure to have a copy of your secret key file
        before doing so.
      </p>
    </div>
  </div>
</template>
