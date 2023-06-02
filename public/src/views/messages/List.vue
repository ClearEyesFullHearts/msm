<script setup>
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { useMessagesStore } from '@/stores';

const router = useRouter();

const messagesStore = useMessagesStore();
const { headers } = storeToRefs(messagesStore);
messagesStore.targetMessage = {};
messagesStore.message = {};

messagesStore.getHeaders();

async function replyTo(from, reTitle) {
  messagesStore.targetMessage.at = from.substring(1);
  if (reTitle.length > 0) messagesStore.targetMessage.title = `Re: ${reTitle}`;
  await router.push('/messages/write');
}
</script>

<template>
  <h1>InBox</h1>
  <button
    class="btn btn-sm btn-secondary"
    :disabled="headers.loading"
    @click="messagesStore.getHeaders()"
  >
    <span
      v-if="headers.loading"
      class="spinner-border spinner-border-sm"
    />
    <span v-else>Refresh</span>
  </button>
  <router-link
    to="/messages/write"
    class="btn btn-sm btn-success mb-2 float-right"
  >
    Write a message
  </router-link>
  <table class="table table-striped">
    <thead>
      <tr>
        <th style="width: 30%">
          From
        </th>
        <th style="width: 30%">
          Title
        </th>
        <th style="width: 30%">
          Sent at
        </th>
        <th style="width: 10%" />
      </tr>
    </thead>
    <tbody>
      <template v-if="headers.length">
        <tr
          v-for="msg in headers"
          :key="msg.id"
        >
          <td>
            <a
              href="#"
              @click="replyTo(msg.from, '')"
            >{{ msg.from }}</a>
          </td>
          <td>{{ msg.title }}</td>
          <td>{{ new Date(msg.sentAt).toLocaleString() }}</td>
          <td style="white-space: nowrap">
            <router-link
              :to="`/messages/show/${msg.id}`"
              class="btn btn-sm btn-primary mr-1"
            >
              Decrypt
            </router-link>
          </td>
        </tr>
      </template>
      <tr v-if="headers.loading">
        <td
          colspan="4"
          class="text-center"
        >
          <span class="spinner-border spinner-border-lg align-center" />
        </td>
      </tr>
      <tr v-if="headers.error">
        <td colspan="4">
          <div class="text-danger">
            Error loading headers: {{ headers.error }}
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
