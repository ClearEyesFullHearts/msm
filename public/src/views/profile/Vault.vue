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
            The vault provides you with a secure method to entrust us with your secret key,
            relieving you of the responsibility of managing it independently.
          </p>
          <p>
            To achieve this, we employ symmetric encryption to encrypt your private key,
            using a hash of your passphrase as the password, and store the encrypted result.
            This same process is applied to the kill switch if provided.
          </p>
          <p>
            Upon logging in, instead of uploading your secret key,
            you open your vault with your passphrase, retrieve your secret key,
            and proceed as usual. In the event that this process fails,
            we attempt to activate the kill switch.
            If successful, we obtain your secret key and use it to delete your account.
          </p>
          <p>
            It's important to note that the kill switch is a feature unique to this client,
            so it should not be used unless you are certain you are on this site.
          </p>
          <p>
            Once your vault is set up, you can theoretically discard your secret key file.
            However, please be aware that because the encryption of your secret key
            (using your passphrase) is entirely performed on the client side,
            there is no recovery mechanism. If you forget your passphrase,
            the sole means of accessing your account will be through your secret key file.
          </p>
          <p>
            You have the option to empty your vault at any time,
            but make sure to retain a copy of your secret key file before doing so.
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
