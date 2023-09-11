<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Tooltip } from 'bootstrap';
import { Autocomplete } from '@/components';
import { useContactsStore, useAuthStore } from '@/stores';
import FileHelper from '@/lib/fileHelper';

const contactsStore = useContactsStore();
const authStore = useAuthStore();

const { list } = storeToRefs(contactsStore);
const verifyKeyInput = ref(null);
const verifyUploadBtn = ref(null);

onMounted(() => {
  new Tooltip(document.body, {
    selector: "[data-bs-toggle='tooltip']",
  });
});

function addUser(user) {
  contactsStore.manualAdd(user);
  contactsStore.saveContactList(authStore.pem);
}
function removeUser(user) {
  contactsStore.removeUser(user.id);
  contactsStore.saveContactList(authStore.pem);
}
function showProfile(contact) {
  console.log('showProfile', contact);
}
async function onUploadVerify() {
  verifyKeyInput.value.click();
}
async function onVerifyFilePicked(evt) {
  const { files } = evt.target;
  const security = await FileHelper.loadTextFromFile(files);
  contactsStore.fileAdd(JSON.parse(security));
  contactsStore.saveContactList(authStore.pem);
}
</script>
<template>
  <div class="row">
    <div class="col">
      <h1>Conversations</h1>
    </div>
    <div class="col text-end">
      <button
        ref="verifyUploadBtn"
        class="btn btn-primary mt-2"
        @click="onUploadVerify()"
      >
        Add a contact by uploading its security file
      </button>
      <input
        ref="verifyKeyInput"
        hidden
        type="file"
        style="opacity: none;"
        @change="onVerifyFilePicked"
      >
    </div>
  </div>

  <Autocomplete @user-selected="addUser" />
  <div class="container-fluid">
    <template v-if="list.length">
      <div
        v-for="contact in list"
        :key="contact.id"
        class="row"
      >
        <div class="col-sm-6 col-md-2 mt-2">
          <span
            class="badge me-1 mb-1"
            :class="contact.messages.length > 0
              ? 'bg-warning'
              : 'bg-secondary'"
            data-bs-toggle="tooltip"
            title="Messages waiting"
          >{{ contact.messages.length }}</span>
          <span>{{ contact.at }}</span>
        </div>
        <div class="col">
          <span
            v-if="contact.alert"
            class="alert alert-danger"
            role="alert"
          >
            <pre>{{ contact.alert }}</pre>
          </span>
          <span v-if="!contact.alert">
            <i
              class="bi me-1"
              :class="contact.auto !== 0
                ? 'bi-shield-fill-check'
                : 'bi-shield-slash-fill'"
              style="font-size: 1.8rem;"
              :style="{ color: contact.auto !== 0 ? '#0d6efd' : 'grey' }"
              data-bs-toggle="tooltip"
              :title="contact.auto !== 0
                ? 'On-chain validation confirmed'
                : 'Waiting for on-chain validation'"
            />
            <i
              v-if="contact.verified && contact.store.signature !== null"
              class="bi bi-fingerprint me-1"
              style="font-size: 1.8rem; color: #198754;"
              data-bs-toggle="tooltip"
              title="Signed and Trusted"
            />
            <i
              v-if="contact.verified
                && contact.store.signature === null
                && contact.store.hash !== null"
              class="bi bi-people me-1"
              style="font-size: 1.8rem; color: #198754;"
              data-bs-toggle="tooltip"
              title="Manually trusted"
            />
            <i
              v-if="!contact.verified"
              class="bi bi-question-circle me-1"
              style="font-size: 1.8rem; color: grey"
              data-bs-toggle="tooltip"
              data-bs-html="true"
              title="Status unknown<br>Make sure that the hash displayed here
              match your contact's profile page's hash before trusting them"
            />
          </span>
        </div>
        <div class="col text-end">
          <button
            class="btn btn-primary btn-sm me-2"
            @click="showProfile(contact)"
          >
            <i
              class="bi bi-eye"
              style="font-size: 1rem; color: white"
              title="Show profile"
            />
          </button>
          <button
            class="btn btn-danger btn-sm"
            @click="removeUser(contact)"
          >
            <i
              class="bi bi-x-circle"
              style="font-size: 1rem; color: white"
              title="Remove user"
            />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
