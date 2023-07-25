<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { Autocomplete } from '@/components';
import { useMessagesStore, useAlertStore, useUsersStore } from '@/stores';

const router = useRouter();

const messageStore = useMessagesStore();
const alertStore = useAlertStore();
const userStore = useUsersStore();

const title = 'Write a Message';
const { targetMessage, contentLength, targetAt } = storeToRefs(messageStore);
messageStore.contentLength = 0;
messageStore.targetAt = [];

const schema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .max(125, 'Title size is limited to 125 characters'),
  content: Yup.string()
    .required('Message text is required')
    .max(470, 'Message size is limited to 446 basic characters'),
});

if (messageStore.targetMessage.at) {
  userStore.returnOne(messageStore.targetMessage.at)
    .then((target) => {
      messageStore.targetAt.push(target);
    })
    .catch((err) => {
      alertStore.error(`${err}`);
    });
}

async function onSubmit(values) {
  try {
    const {
      title: msgTitle,
      content,
    } = values;

    const result = {
      success: [],
      failure: [],
    };
    messageStore.targetAt.forEach(async ({ at, key }) => {
      try {
        await messageStore.write(at, key, msgTitle, content);
        result.success.push(at);
      } catch (err) {
        result.failure.push({ at, err });
      }

      if (result.success.length === messageStore.targetAt.length) {
        await router.push('/messages');
        alertStore.success('Your message has been sent');
      }

      if (result.failure.length > 0) {
        let errorMessage = '';
        result.failure.forEach(({ at: name, err }) => {
          errorMessage += `Message to @${name} has not been sent:\n${err}\n`;
        });
        alertStore.error(errorMessage);
      }
    });
  } catch (error) {
    alertStore.error(error);
  }
}
function onInputText(str) {
  messageStore.contentLength = (new TextEncoder().encode(messageStore.encodeText(str))).length;
}
function removeUser(user) {
  const i = messageStore.targetAt.findIndex((el) => el.at === user.at);
  messageStore.targetAt.splice(i, 1);
}
function addUser(user) {
  messageStore.targetAt.push(user);
}
</script>

<template>
  <h1>{{ title }}</h1>
  <template v-if="true">
    <Form
      v-slot="{ errors, isSubmitting }"
      :validation-schema="schema"
      :initial-values="targetMessage"
      @submit="onSubmit"
    >
      <div class="form-row">
        <div class="form-group col">
          <Autocomplete @user-selected="addUser" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group col">
          <div>
            Send to:
          </div>
          <div>
            <span
              v-for="user in targetAt"
              class="badge badge-info mr-1 pointer"
              @click="removeUser(user)"
            >{{ `@${user.at}` }}</span>
          </div>
        </div>
        <div class="form-group col">
          <label>Message Title</label>
          <Field
            name="title"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.title }"
          />
          <div class="invalid-feedback">
            {{ errors.title }}
          </div>
        </div>
      </div>
      <div v-if="targetMessage.quote">
        <label>Reply to:</label>
        <pre>{{ targetMessage.quote }}</pre>
      </div>
      <div class="form-row">
        <div class="form-group col">
          <label>Message text</label>
          <Field
            name="content"
            as="textarea"
            cols="30"
            rows="10"
            class="form-control"
            :class="{ 'is-invalid': errors.content }"
            @input="event => onInputText(event.target.value)"
          />
          <span class="limiter">{{ contentLength }} / 446</span>
          <div class="invalid-feedback">
            {{ errors.content }}
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
          Send
        </button>
        <router-link
          to="/messages"
          class="btn btn-link"
        >
          Back to inbox
        </router-link>
      </div>
    </Form>
  </template>
</template>

<style>

pre {
    white-space: pre-wrap;       /* Since CSS 2.1 */
    white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
    white-space: -pre-wrap;      /* Opera 4-6 */
    white-space: -o-pre-wrap;    /* Opera 7 */
    word-wrap: break-word;       /* Internet Explorer 5.5+ */
}
.pointer {
    cursor: pointer;
}
</style>
