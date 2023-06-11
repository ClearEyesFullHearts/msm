<script setup>
import { ref } from 'vue';

import { useAuthStore } from '@/stores';

const loginInput = ref(null);
const fileInput = ref(null);

async function loadTextFromFile(ev) {
  return new Promise((resolve) => {
    const file = ev[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.readAsText(file);
  });
}

async function onSubmit(values) {
  const authStore = useAuthStore();
  const { username, secret } = values;
  const key = await loadTextFromFile(secret);
  await authStore.login(username, key);
}

async function onFilePicked(evt) {
  const { files } = evt.target;
  const secret = files;
  const username = loginInput.value.value;

  await onSubmit({ username, secret });
}
async function onLog() {
  if (!loginInput.value.value.length || loginInput.value.value.length < 3) {
    return;
  }
  fileInput.value.click();
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
        <div class="form-group" />
      </form>
      <div>
        <button
          class="btn btn-primary"
          @click="onLog()"
        >
          Login
        </button>
        <router-link
          to="register"
          class="btn btn-link"
        >
          Register
        </router-link>
      </div>
      <input
        ref="fileInput"
        hidden
        type="file"
        style="opacity: none;"
        @change="onFilePicked"
      >
    </div>
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
        The file you pick is your Secret Key and is used to decrypt the server's response.
        Once decrypted we use the JWT from the connection information to identify with the
        server.
      </p>
    </div>
  </div>
</template>
