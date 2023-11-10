<script setup>
import { ref, onMounted } from 'vue';
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAuthStore, useUsersStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const authStore = useAuthStore();
const usersStore = useUsersStore();

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
  await usersStore.setVault(values.passphrase, values.killswitch);
  hasVault.value = true;
  authStore.hasVault = true;
}

async function onEmptyVault() {
  await usersStore.emptyVault();
  hasVault.value = false;
  authStore.hasVault = false;
}

function onDownloadSK() {
  const itemValue = `${authStore.pem}${CryptoHelper.SEPARATOR}${authStore.signing}`;
  FileHelper.download(`@${authStore.user.user.username}.pem`, itemValue);
}
</script>

<template>
  <div class="row justify-content-center">
    <div class="col-md-8">
      <p>
        <router-link to="/conversations">
          Go to your conversations
        </router-link>
      </p>
      <div class="card m-3">
        <h4 class="card-header">
          TL/DR
        </h4>
        <div class="card-body">
          <ul>
            <li>
              Download your Secret Key file and empty your vault to be able to change your password
              and set up your optional password kill switch.
            </li>
            <li>
              Your password should be as strong as possible.
              Your security will only be as strong as your password.
            </li>
            <li>
              If you don't set up your password again you will only be able to connect directly
              with your Secret Key file.
            </li>
            <li>
              There is no retrieval mechanism if you forget your password,
              except for your Secret Key file.
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
              Empty your vault to change your password or use your
              Secret Key file as a loggin mechanism:
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
              v-slot="{ values, errors, isSubmitting }"
              :validation-schema="schema"
              @submit="onSetUpVault"
            >
              <div class="form-row">
                <label class="starlabel">Password</label>
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
                <label class="starlabel">Confirm password</label>
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
                <label>Confirm kill switch</label>
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
                  :disabled="isSubmitting"
                >
                  <span
                    v-show="isSubmitting"
                    class="spinner-border spinner-border-sm me-1"
                  />
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
            Your vault securely stores your secret key,
            which is encrypted using a strong hash of your password.
          </p>
          <p>
            Upon creating your account or setting up your vault, we calculate a hash of your
            password and kill switch. Your secret key is then encrypted with the former,
            and both your encrypted secret key
            and the signatures of an encrypted random proof by both hashes are stored in your vault.
          </p>
          <p>
            Every piece of data in your vault is encrypted on the server side for storage.
          </p>
          <p>
            When you log in, you transmit the computed encrypted random proof by the hash of
            your password to us, which is
            cross-verified against the signatures of your kill switch and password.<br>
            If you provide your kill switch password, your account is immediately deleted.<br>
            If you provide your connection password,
            we respond by sending your vault and connection data, which is encrypted.
          </p>
          <p>
            Upon receiving your encrypted connection information, you can decrypt your vault using
            the hashed password to access your secret key.
            You can then decrypt your connection data with that key, allowing you to log in.
          </p>
          <p>
            You can always connect with your username and your secret key file
            through the login page.
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
