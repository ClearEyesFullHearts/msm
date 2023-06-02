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
</template>
