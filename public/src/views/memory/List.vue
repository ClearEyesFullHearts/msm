<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useMemoryStore, useMessagesStore } from '@/stores';
import FileHelper from '@/lib/fileHelper';

const router = useRouter();
const memoryStore = useMemoryStore();
const messagesStore = useMessagesStore();
const { messages } = storeToRefs(memoryStore);
const fileInput = ref(null);

function uploadFiles() {
  fileInput.value.click();
}

async function onFilePicked(evt) {
  const { files } = evt.target;
  const promises = [];
  for (let i = 0; i < files.length; i += 1) {
    promises.push(FileHelper.loadTextFromFile([files[i]]));
  }
  const results = await Promise.all(promises);
  const loaded = results.map((result) => JSON.parse(result));

  for (let i = 0; i < loaded.length; i += 1) {
    await memoryStore.readMessage(loaded[i]);
  }
}
function clear() {
  memoryStore.messages = [];
}
function clearMessage(index) {
  memoryStore.messages.splice(index, 1);
}
async function replyTo(from, reTitle) {
  messagesStore.targetMessage.at = from.substring(1);
  if (reTitle.length > 0) messagesStore.targetMessage.title = `Re: ${reTitle}`;
  await router.push('/messages/write');
}
</script>

<template>
  <h1>MemoryBox</h1>
  <button
    class="btn btn-sm btn-secondary"
    @click="uploadFiles()"
  >
    <span>Upload</span>
  </button>
  <input
    ref="fileInput"
    hidden
    multiple
    type="file"
    style="opacity: none;"
    @change="onFilePicked"
  >
  <button
    class="btn btn-sm btn-success mb-2 float-right"
    @click="clear()"
  >
    <span>Clear All</span>
  </button>
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
    <tbody
      v-if="messages.length"
    >
      <template
        v-for="(msg, index) in messages"
        :key="msg.id"
      >
        <tr>
          <td>
            <a
              href="#"
              @click="replyTo(msg.from, '')"
            >{{ msg.from }}</a>
          </td>
          <td>{{ msg.title }}</td>
          <td>{{ new Date(msg.sentAt).toLocaleString() }}</td>
          <td style="white-space: nowrap">
            <button
              class="btn btn-sm btn-primary mr-1"
              @click="clearMessage(index)"
            >
              <span>Clear</span>
            </button>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <pre>{{ msg.content }}</pre>
          </td>
        </tr>
      </template>
      <tr v-if="messages.error">
        <td colspan="4">
          <div class="text-danger">
            Error loading headers: {{ messages.error }}
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
