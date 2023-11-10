<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useUsersStore, useAlertStore } from '@/stores';
import { router } from '@/router';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const usersStore = useUsersStore();
const alertStore = useAlertStore();

const schema = Yup.object().shape({
  username: Yup.string()
    .required('User @ is required')
    .min(4, 'Your @ should be at least 4 characters long')
    .max(35, 'Your @ should not be longer than 35 characters'),
});

async function onSubmit(values) {
  try {
    const { ESK, SSK } = await usersStore.createUser(values);
    const skFileContent = `${ESK}${CryptoHelper.SEPARATOR}${SSK}`;
    FileHelper.download(`@${values.username}.pem`, skFileContent);

    usersStore.newUsername = values.username;
    router.push('/login');
  } catch (error) {
    // console.log(error);
    alertStore.error(error);
  }
}
</script>

<template>
  <div class="card m-3">
    <h4 class="card-header">
      Register
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
            Register
          </button>
          <router-link
            to="create"
            class="btn btn-link"
          >
            Cancel
          </router-link>
        </div>
      </Form>
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
        On account creation a key pair is generated and the public part is sent to the server.
      </p>
      <p>
        The secret part is set into a file that is automatically downloaded on your device.
      </p>
      <p>
        You'll use that file to connect.
      </p>
    </div>
  </div>
</template>
