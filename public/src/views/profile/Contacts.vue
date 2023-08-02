<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Tooltip } from 'bootstrap';
import { Autocomplete } from '@/components';
import { useContactsStore, useAuthStore } from '@/stores';
import FileHelper from '@/lib/fileHelper';

const contactsStore = useContactsStore();
const authStore = useAuthStore();
const { list, dirty } = storeToRefs(contactsStore);
const verifyKeyInput = ref(null);
const verifyUploadBtn = ref(null);

onMounted(() => {
  new Tooltip(document.body, {
    selector: "[data-bs-toggle='tooltip']",
  });
});

function addUser(user) {
  contactsStore.manualAdd(user);
}
function removeUser(user) {
  contactsStore.removeUser(user.id);
}
function onVerify(contact) {
  contactsStore.verifyUser(contact.id);
}
function save() {
  contactsStore.saveContactList(authStore.pem);
}
async function onUploadVerify() {
  verifyKeyInput.value.click();
}
async function onVerifyFilePicked(evt) {
  const { files } = evt.target;
  const security = await FileHelper.loadTextFromFile(files);
  contactsStore.fileAdd(JSON.parse(security));
}
</script>
<template>
  <h1>Contacts</h1>
  <Autocomplete @user-selected="addUser" />

  <button
    ref="verifyUploadBtn"
    class="btn btn-primary mb-2"
    @click="onUploadVerify()"
  >
    Upload security file
  </button>
  <input
    ref="verifyKeyInput"
    hidden
    type="file"
    style="opacity: none;"
    @change="onVerifyFilePicked"
  >
  <button
    class="btn btn-success mb-2 float-end"
    @click="save()"
  >
    Save Contact list
  </button>
  <div
    v-if="dirty"
    class="alert alert-warning text-center"
    role="alert"
  >
    <p>Reminder:</p>
    <p>
      Any change done on the contact list has to be saved
      by clicking on the "Save Contact List" button on the right.
    </p>
    <p>
      Any change that is not saved will be lost.
    </p>
  </div>
  <table class="table table-striped">
    <thead>
      <tr>
        <th style="width: 50%">
          User
        </th>
        <th style="width: 25%">
          Status
        </th>
        <th style="width: 25%" />
      </tr>
    </thead>
    <tbody>
      <template v-if="list.length">
        <tr
          v-for="contact in list"
          :key="contact.id"
        >
          <td>
            <label class="label">{{ contact.at }}</label><br>
            <b>{{ contact.store.hash || contact.server.hash }}</b>
          </td>
          <td>
            <div
              v-if="contact.alert"
              class="alert alert-danger"
              role="alert"
            >
              <pre>{{ contact.alert }}</pre>
            </div>
            <div v-if="!contact.alert">
              <i
                class="bi bi-server me-1"
                style="font-size: 1.8rem;"
                :style="{ color: contact.auto === 1 ? 'green' : 'grey' }"
                data-bs-toggle="tooltip"
                :title="contact.auto === 1 ? 'Validated' : 'Waiting for validation'"
              />
              <i
                v-if="contact.verified && contact.store.signature !== null"
                class="bi bi-fingerprint me-1"
                style="font-size: 1.8rem; color: green;"
                data-bs-toggle="tooltip"
                title="Signed and Trusted"
              />
              <i
                v-if="contact.verified
                  && contact.store.signature === null
                  && contact.store.hash !== null"
                class="bi bi-people me-1"
                style="font-size: 1.8rem; color: green;"
                data-bs-toggle="tooltip"
                title="Trusted"
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
            </div>
          </td>
          <td>
            <div class="float-end">
              <button
                v-if="!contact.verified && !contact.alert"
                class="btn btn-success btn-sm me-2"
                @click="onVerify(contact)"
              >
                <i
                  class="bi bi-check-circle"
                  style="font-size: 1rem; color: white"
                  title="Trust this user"
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
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>
