<script setup>
import { Form, Field } from 'vee-validate';
import { ref } from 'vue';
import * as Yup from 'yup';

import { useUsersStore, useAlertStore } from '@/stores';
import { router } from '@/router';

const gotKey = ref(false);

const schema = Yup.object().shape({
  username: Yup.string()
    .required('User @ is required')
    .min(3, 'Your @ should be at least 3 characters long')
    .max(125, 'Your @ should not be longer than 125 characters'),
});

async function onSubmit(values) {
  const usersStore = useUsersStore();
  const alertStore = useAlertStore();

  try {
    await usersStore.register(values);
    await router.push('/account/login');
    alertStore.success('Registration successful');
  } catch (error) {
    alertStore.error(error);
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
        <li>Enter the username you want to use</li>
        <li>Click the "Register" button</li>
        <li>
          A file named "@[your username].pem" is automatically downloaded in your "Download" folder
          (even you don't see it, believe us it did)
        </li>
        <li>Use that file when prompted on Login</li>
        <li>You have 10 minutes to activate your account by opening the "Welcome" message</li>
      </ul>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Register
    </h4>
    <div class="card-body">
      <Form
        v-slot="{ errors, isSubmitting }"
        :validation-schema="schema"
        @submit="onSubmit"
      >
        <div class="form-group">
          <label>User @</label>
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

          <div>
            <p>
              <a
                href="#"
                role="button"
                @click="gotKey = !gotKey"
              >
                I got my own key
              </a>
            </p>
            <div v-show="gotKey">
              <p>Paste your public key here:</p>
              <Field
                name="publicKey"
                autocomplete="off"
                as="textarea"
                cols="30"
                rows="10"
                class="form-control"
              />
            </div>
          </div>
        </div>
        <div class="form-group">
          <button
            class="btn btn-primary"
            :disabled="isSubmitting"
          >
            <span
              v-show="isSubmitting"
              class="spinner-border spinner-border-sm mr-1"
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

  <div class="card m-3">
    <h4 class="card-header">
      Full explanation
    </h4>
    <div
      class="card-body"
    >
      <p>
        When you click on the Register button the browser will create an RSA key pair
        and send the Public Key (PK) to us while dowloading the Secret Key (SK) on your machine.
      </p>
      <p>
        Keep your SK somewhere safe, like an USB stick,
        and do not ever leave it on a public machine, it is the only way to access your account
        (you will be asked to upload it each time you want to connect) but
        anyone who has this file can access it.
      </p>
      <p>
        Your SK is never shared with us, the login process only read it
        and save it in memory to use it the time of your session.
      </p>
      <p>
        The registration process being so simple, you'll have to activate your account in less
        than 10 minutes or it will be destroyed.
        We send you a message when we create your account and you'll have to open it
        to activate your account. After that you can start sending and receiving messages.
      </p>
      <p>
        If you don't trust the browser or the machine you're using for the keys creation
        you can also create and use your own key pair.
        Here are the openssl commands to create a compatible key pair:<br>
        <code>
          openssl genrsa -out key.pem 4096<br>
          openssl rsa -in key.pem -outform PEM -pubout -out public.pem<br>
        </code>
      </p>
      <p>
        Once you have created your keys, click on the "I got my own key" link and paste the content
        of your PK (i.e. public.pem in our example) in the text input. Once your account is created
        you will be able to use your SK (i.e. key.pem in our example) to connect.
      </p>
    </div>
  </div>
</template>
