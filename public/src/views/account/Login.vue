<script setup>
import { ref, onMounted } from 'vue';

import { useUsersStore, useAuthStore, useAlertStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const authStore = useAuthStore();
const alertStore = useAlertStore();

const loginInput = ref(null);
const fileInput = ref(null);
const passphraseInput = ref(null);
const hasVault = ref(false);
const isSubmitting = ref(false);

onMounted(() => {
  const usersStore = useUsersStore();
  if (usersStore.newUsername) {
    loginInput.value.value = usersStore.newUsername;
    usersStore.newUsername = null;
  }
});

async function onSubmit(keys) {
  const [key, signKey] = keys.split(CryptoHelper.SEPARATOR);

  await authStore.login(key, signKey);
}

async function onFilePicked(evt) {
  FileHelper.onFilePicked(evt, onSubmit);
}
async function onKeyFileNeeded() {
  fileInput.value.click();
}
async function onLog() {
  if (!loginInput.value.value.length || loginInput.value.value.length < 3) {
    return;
  }
  try {
    isSubmitting.value = true;
    await authStore.getIdentity(loginInput.value.value);
    hasVault.value = authStore.hasVault;
    if (!authStore.hasVault) {
      onKeyFileNeeded();
    }
    isSubmitting.value = false;
  } catch (error) {
    isSubmitting.value = false;
    alertStore.error(error);
  }
}
async function openVault() {
  try {
    const keyFile = await authStore.openVault(passphraseInput.value.value);
    const [key, signKey] = keyFile.split(CryptoHelper.SEPARATOR);
    await authStore.login(key, signKey);
  } catch (err) {
    if (err.message === 'WRONG_PASSWORD') {
      try {
        const keyFile = await authStore.openKillSwitch(passphraseInput.value.value);
        const [key, signKey] = keyFile.split(CryptoHelper.SEPARATOR);
        await authStore.kill(key, signKey);
      } catch (exc) {
        onKeyFileNeeded();
      }
    } else {
      onKeyFileNeeded();
    }
  }
}
</script>

<template>
  <div class="card m-3">
    <h4 class="card-header">
      TL/DR
    </h4>
    <div class="card-body">
      <ul>
        <li>Enter your username</li>
        <li>Click on "Login", it will open a window for you to choose a file</li>
        <li>
          Look for the file that was downloaded during the registration process,
          i.e. "@[your username].pem" in the download folder if you haven't done anything
        </li>
        <li>
          If you're on mobile you may have to choose an app to pick the file,
          choose "Files" or something similar, then pick the file.
        </li>
        <li>You will be connected and redirected to your InBox</li>
        <li>
          If it's the first time you log in,
          click on the "@do not reply to this message" conversation to open it and read
          the welcoming message this will activate your account
        </li>
      </ul>
    </div>
  </div>
  <div class="card m-3">
    <h4 class="card-header">
      Login
    </h4>
    <div class="card-body">
      <form>
        <div class="form-group">
          <div class="input-group mb-3">
            <div class="input-group-prepend">
              <span
                id="basic-addon1"
                class="input-group-text"
              >@</span>
            </div>
            <input
              id="search"
              ref="loginInput"
              type="text"
              class="form-control"
              autocomplete="off"
              placeholder="Your username"
            >
          </div>
        </div>
      </form>
      <div v-show="!hasVault">
        <button
          class="btn btn-primary"
          @click="onLog()"
        >
          <span
            v-show="isSubmitting"
            class="spinner-border spinner-border-sm me-1"
          />
          Login
        </button>
        <router-link
          to="register"
          class="btn btn-link"
        >
          Register
        </router-link>
      </div>
      <div v-show="hasVault">
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
        <button
          class="btn btn-success me-1"
          @click="openVault()"
        >
          Validate
        </button>
        <button
          class="btn btn-primary ms-1"
          @click="hasVault = !hasVault"
        >
          Cancel
        </button>
        <p>
          <a
            href="#"
            role="button"
            @click="onKeyFileNeeded()"
          >
            Forgot my password
          </a>
        </p>
      </div>
    </div>
    <input
      ref="fileInput"
      hidden
      type="file"
      style="opacity: none;"
      @change="onFilePicked"
    >
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Full explanation
    </h4>
    <div
      class="card-body"
    >
      <p>
        When you click on the "Login" button, the browser request connection informations
        for that username. The response is encrypted with that user's Public Key.
      </p>
      <p>
        If you set up your private keys in your vault, you will be asked to enter your password.
        If not, you will be prompted to pick your secret key file.
      </p>
      <p>
        Either way your Secret Key is used to decrypt the server's response.
        Once decrypted we use the JWT from the connection information to identify with the
        server.
      </p>
    </div>
  </div>
</template>
