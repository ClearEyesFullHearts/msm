<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useUsersStore, useAlertStore, useAuthStore } from '@/stores';
import { router } from '@/router';

const usersStore = useUsersStore();
const alertStore = useAlertStore();
const authStore = useAuthStore();

const schema = Yup.object().shape({
  username: Yup.string()
    .required('User @ is required')
    .min(4, 'Your @ should be at least 4 characters long')
    .max(35, 'Your @ should not be longer than 35 characters'),
  passphrase: Yup.string()
    .min(8, 'Passphrase must be at least 8 characters')
    .required('Passphrase is required'),
  confirmPassphrase: Yup.string()
    .oneOf([Yup.ref('passphrase'), null], 'Passphrases must match')
    .required('Confirm Passphrase is required'),
});

async function onSubmit(values) {
  try {
    const { ESK, SSK } = await usersStore.createUser(values);
    await authStore.getIdentity(values.username);
    await authStore.login(ESK, SSK, true);
    await authStore.setVault(values.passphrase);

    router.push('/conversations');
  } catch (error) {
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
        <div class="form-row mt-2">
          <label>Confirm password</label>
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
            to="login"
            class="btn btn-link"
          >
            Cancel
          </router-link>
        </div>
      </Form>
    </div>
  </div>
</template>
