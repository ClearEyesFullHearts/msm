<script setup>
import { Form, Field } from 'vee-validate';
import { ref, onMounted } from 'vue';
import * as Yup from 'yup';

import { useAlertStore, useAuthStore, useUsersStore } from '@/stores';
import { router } from '@/router';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const alertStore = useAlertStore();
const authStore = useAuthStore();

const schema = Yup.object().shape({
  username: Yup.string()
    .required('User @ is required')
    .min(3, 'Your @ should be at least 3 characters long')
    .max(35, 'Your @ should not be longer than 35 characters'),
});
let loginInput = '';
const fileInput = ref(null);

onMounted(() => {
  const usersStore = useUsersStore();
  if (usersStore.newUsername) {
    loginInput = usersStore.newUsername;
    usersStore.newUsername = null;
  }
});

async function onUpload(keys) {
  const [key, signKey] = keys.split(CryptoHelper.SEPARATOR);
  try {
    await authStore.connect(loginInput, key, signKey);

    router.push('/conversations');
  } catch (error) {
    // console.log(error);
    alertStore.error(error);
  }
}

async function onFilePicked(evt) {
  FileHelper.onFilePicked(evt, onUpload);
}

async function onSubmit() {
  fileInput.value.click();
}

</script>
<template>
  <div class="card m-3">
    <h4 class="card-header">
      Login
    </h4>
    <div class="card-body">
      <Form
        v-slot="{ values, errors, isSubmitting }"
        :validation-schema="schema"
        @submit="onSubmit"
      >
        <div class="form-group">
          <label>Username</label>
          <div class="input-group mb-3">
            <div class="input-group-prepend">
              <span
                id="basic-addon1"
                class="input-group-text"
              >@</span>
            </div>
            <Field
              v-model="loginInput"
              name="username"
              autocomplete="off"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': errors.username }"
            />
            <div class="invalid-feedback">
              {{ errors.username }}
            </div>
          </div>
        </div>
        <div class="form-group mt-2">
          <button
            class="btn btn-primary"
            :disabled="isSubmitting"
          >
            <span
              v-show="isSubmitting"
              class="spinner-border spinner-border-sm me-1"
            />
            Login
          </button>
          <router-link
            to="connect"
            class="btn btn-link"
          >
            Cancel
          </router-link>
        </div>
      </Form>
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
      What's happening
    </h4>
    <div
      class="card-body"
    >
      <p>
        Upon logging in, the server provides your encrypted identity.
      </p>
      <p>
        When prompted you provide your secret key as a file.
      </p>
      <p>
        This secret key then decrypts your identity, allowing you to successfully connect.
      </p>
    </div>
  </div>
</template>
