<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Tooltip } from 'bootstrap';
import { Autocomplete, Contact, Group } from '@/components';
import { router } from '@/router';
import { useContactsStore, useAuthStore, useConnectionStore } from '@/stores';
import FileHelper from '@/lib/fileHelper';

const contactsStore = useContactsStore();
const authStore = useAuthStore();
const connectionStore = useConnectionStore();

const { list } = storeToRefs(contactsStore);
const { isValidatedOnChain } = storeToRefs(authStore);
const { isConnected } = storeToRefs(connectionStore);
const verifyKeyInput = ref(null);
const verifyUploadBtn = ref(null);

onMounted(() => {
  new Tooltip(document.body, {
    selector: "[data-bs-toggle='tooltip']",
  });
});

async function addUser(user) {
  contactsStore.manualAdd(user)
    .then(() => {
      contactsStore.saveContactList(authStore.pem, authStore.signing);
    });
}
function removeUser(user) {
  contactsStore.removeUser(user.id);
  contactsStore.saveContactList(authStore.pem, authStore.signing);
}
function onVerify(contact) {
  contactsStore.verifyUser(contact.id);
  contactsStore.saveContactList(authStore.pem, authStore.signing);
}
async function onUploadVerify() {
  verifyKeyInput.value.click();
}
async function onVerifyFilePicked(evt) {
  const { files } = evt.target;
  const security = await FileHelper.loadTextFromFile(files);
  contactsStore.fileAdd(JSON.parse(security))
    .then(() => {
      contactsStore.saveContactList(authStore.pem, authStore.signing);
    });
}
function addGroup() {
  router.push('/groups');
}

</script>
<template>
  <div
    class="container-fluid"
  >
    <div class="row">
      <div class="col">
        <h1>
          Conversations
          <button
            v-if="!isConnected"
            class="btn btn-success btn-sm"
            type="button"
            :disabled="!isValidatedOnChain || connectionStore.isConnecting"
            @click="connectionStore.connect()"
          >
            <span
              v-show="connectionStore.isConnecting"
              class="spinner-border spinner-border-sm mt-1"
            />
            <i
              v-show="!connectionStore.isConnecting"
              class="bi bi-wifi-off"
              style="font-size: 1rem; color: white"
            />
            Connect
          </button>
          <button
            v-if="isConnected"
            class="btn btn-danger btn-sm"
            type="button"
            :disabled="!isValidatedOnChain"
            @click="connectionStore.disconnect()"
          >
            <i
              class="bi bi-wifi"
              style="font-size: 1rem; color: white"
            />
            Online
          </button>
        </h1>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-6 col-md-12">
        <Autocomplete @user-selected="addUser" />
      </div>
      <div class="col-lg-4 col-md-6 text-end d-flex flex-column mt-lg-1 mt-0">
        <button
          ref="verifyUploadBtn"
          class="btn btn-primary btn-sm mb-2"
          @click="onUploadVerify()"
        >
          <span class="d-none d-lg-inline">Add a contact by uploading its security file</span>
          <span class="d-inline d-lg-none">Upload security file</span>
        </button>
        <input
          ref="verifyKeyInput"
          hidden
          type="file"
          style="opacity: none;"
          @change="onVerifyFilePicked"
        >
      </div>
      <div class="col-lg-2 col-md-6 text-end d-flex flex-column  mt-lg-1 mt-0">
        <button
          ref="verifyUploadBtn"
          class="btn btn-primary btn-sm mb-2"
          @click="addGroup()"
        >
          New group
        </button>
      </div>
    </div>
  </div>

  <div
    v-if="list.length"
    class="container-fluid"
  >
    <div
      v-for="contact in list"
      :key="contact.id"
    >
      <Contact
        v-if="!contact.group"
        :contact="contact"
        @delete-contact="removeUser"
        @contact-verified="onVerify"
      />
      <Group
        v-if="contact.group"
        :group="contact"
      />
    </div>
  </div>
</template>
