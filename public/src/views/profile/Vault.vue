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
    .min(8, 'Passphrase must be at least 8 characters')
    .required('Passphrase is required'),
  confirmPassphrase: Yup.string()
    .oneOf([Yup.ref('passphrase'), null], 'Passphrases must match')
    .required('Confirm Passphrase is required'),
  killswitch: Yup.string()
    .min(8, 'Killswitch must be at least 8 characters')
    .notOneOf([Yup.ref('passphrase')], 'Killswitch must be different than your passphrase'),
  confirmKillswitch: Yup.string()
    .oneOf([Yup.ref('killswitch'), null], 'Killswitches must match'),
});

onMounted(() => {
  hasVault.value = authStore.hasVault;
});

async function onSetUpVault(values) {
  await authStore.setVault(values.passphrase, values.killswitch);
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
  <div class="row justify-content-center">
    <div class="col-md-8">
      <div class="card m-3">
        <h4 class="card-header">
          TL/DR
        </h4>
        <div class="card-body">
          <ul>
            <li>
              Enter a pass phrase (minimum 8 characters) to encrypt your secret key
              and send it to us.
              You'll then be able to login with that pass phrase instead of your secret key file
            </li>
            <li>
              You can also add a "Kill Switch" pass phrase that will burn your account
              if you use it to login. This is optional.
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
                <label class="starlabel">Pass phrase</label>
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
                <label class="starlabel">Confirm pass phrase</label>
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
              <div class="form-row">
                <label>Kill switch</label>
                <Field
                  name="killswitch"
                  type="password"
                  class="form-control"
                  :class="{ 'is-invalid': errors.killswitch }"
                />
                <div class="invalid-feedback">
                  {{ errors.killswitch }}
                </div>
              </div>
              <div class="form-row mt-2">
                <label>Confirm Kill switch</label>
                <Field
                  name="confirmKillswitch"
                  type="password"
                  class="form-control"
                  :class="{ 'is-invalid': errors.confirmKillswitch }"
                />
                <div class="invalid-feedback">
                  {{ errors.confirmKillswitch }}
                </div>
              </div>
              <div class="form-row form-group mt-2">
                <button
                  type="submit"
                  class="btn btn-primary me-1"
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
            The vault let's you entrust us with your secret key in as safe a manner as possible
            so that you don't have to manage it yourself.
          </p>
          <p>
            For that we encrypt your private key through symmetric encryption
            with a hash of your pass phrase as a password and store the result.<br>
            We do the same with the kill switch if provided.<br>
            On login, instead of uploading your secret key
            you open your vault with your passphrase, get your secret key and process as usual.<br>
            If this doesn't work we then try to open the kill switch, if it works we get your secret
            key and use it to delete the account.
          </p>
          <p>
            The kill switch is a trick in this client, do not try to use it if you're not sure
            to be on this site.
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
    </div>
  </div>
</template>
<style>
.starlabel::after {
  content:" *";
  color: red;
}
</style>