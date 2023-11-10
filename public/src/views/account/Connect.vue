<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAlertStore, useAuthStore } from '@/stores';
import { router } from '@/router';

const alertStore = useAlertStore();
const authStore = useAuthStore();

const schema = Yup.object().shape({
  username: Yup.string()
    .required('User @ is required')
    .min(3, 'Your @ should be at least 3 characters long')
    .max(35, 'Your @ should not be longer than 35 characters'),
  passphrase: Yup.string()
    .min(8, 'Passphrase must be at least 8 characters')
    .required('Passphrase is required'),
});

async function onSubmit(values) {
  try {
    await authStore.connectWithPassword(values.username, values.passphrase, false);

    router.push('/conversations');
  } catch (error) {
    // console.log(error);
    alertStore.error(error);
  }
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
        <div class="form-row">
          <label>Password</label>
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
            to="create"
            class="btn btn-link"
          >
            Register
          </router-link>
        </div>
        <div class="form-group text-end">
          <router-link
            to="login"
            class="btn btn-link"
          >
            Connect with your key file
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
        Upon logging in, the server provides your encrypted identity
        along with the contents of your vault.
      </p>
      <p>
        Your password functions as the decryption key for your vault, which houses your secret key.
      </p>
      <p>
        This secret key then decrypts your identity, allowing you to successfully connect.
      </p>
    </div>
  </div>
</template>
