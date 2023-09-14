<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Tooltip } from 'bootstrap';
import { Autocomplete } from '@/components';
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

function addUser(user) {
  contactsStore.manualAdd(user)
    .then(() => {
      contactsStore.saveContactList(authStore.pem);
    });
}
function removeUser(user) {
  contactsStore.removeUser(user.id);
  contactsStore.saveContactList(authStore.pem);
}
function onVerify(contact) {
  contactsStore.verifyUser(contact.id);
  contactsStore.saveContactList(authStore.pem);
}
async function onUploadVerify() {
  verifyKeyInput.value.click();
}
async function onVerifyFilePicked(evt) {
  const { files } = evt.target;
  const security = await FileHelper.loadTextFromFile(files);
  contactsStore.fileAdd(JSON.parse(security))
    .then(() => {
      contactsStore.saveContactList(authStore.pem);
    });
}
</script>
<template>
  <div
    class="container-fluid"
  >
    <div class="row">
      <div class="col">
        <h1>Conversations</h1>
      </div>
      <div class="col text-end d-flex flex-column justify-content-center">
        <span v-if="!isValidatedOnChain">
          Connection status: waiting for the on-chain validation
        </span>
        <span v-if="isValidatedOnChain && !isConnected">
          Connection status: disconnected
        </span>
        <span v-if="isValidatedOnChain && isConnected">
          Connection status: connected
        </span>
      </div>
      <div class="col-1 d-flex flex-column justify-content-center">
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
            class="bi bi-wifi"
            style="font-size: 1rem; color: white"
          />
        </button>
        <button
          v-if="isConnected"
          class="btn btn-danger btn-sm"
          type="button"
          :disabled="!isValidatedOnChain"
          @click="connectionStore.disconnect()"
        >
          <i
            class="bi bi-wifi-off"
            style="font-size: 1rem; color: white"
          />
        </button>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-8 col-md-12">
        <Autocomplete @user-selected="addUser" />
      </div>
      <div class="col-lg-4 col-md-12 text-end d-flex flex-column">
        <button
          ref="verifyUploadBtn"
          class="btn btn-primary mb-2"
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
  </div>

  <div
    v-if="list.length"
    class="container-fluid"
  >
    <div
      v-for="contact in list"
      :key="contact.id"
    >
      <div class="row">
        <div class="col-6 mt-2">
          <span
            class="badge me-1 mb-1"
            :class="contact.messages.length > 0
              ? 'bg-warning'
              : 'bg-secondary'"
            data-bs-toggle="tooltip"
            title="Messages waiting"
          >{{ contact.messages.length }}</span>
          <span>
            <router-link :to="`/conversations/${contact.at}`">
              <b>{{ contact.at }}</b>
              <i
                class="bi bi-arrow-right-circle-fill ms-2 float-end"
                style="font-size: 1.2rem; color: grey;"
              />
            </router-link>
          </span>
        </div>
        <div class="col">
          <div
            v-if="contact.alert"
            class="alert alert-danger"
            role="alert"
          >
            <pre>{{ contact.alert }}</pre>
          </div>
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
            <i
              v-if="contact.connected"
              class="bi bi-wifi me-1"
              style="font-size: 1.8rem; color: #198754;"
              data-bs-toggle="tooltip"
              title="Connected"
            />
            <i
              v-if="!contact.connected"
              class="bi bi-wifi-off me-1"
              style="font-size: 1.8rem; color: grey"
              data-bs-toggle="tooltip"
              data-bs-html="true"
              title="Not connected"
            />
          </span>
        </div>
        <div class="col text-end">
          <button
            class="btn btn-primary btn-sm me-2"
            type="button"
            data-bs-toggle="collapse"
            :data-bs-target="`#profileCollapse-${contact.at.replaceAll(' ', '_')}`"
            aria-expanded="false"
            aria-controls="profileCollapse"
          >
            <i
              class="bi bi-eye"
              style="font-size: 1rem; color: white"
              data-bs-toggle="tooltip"
              title="Show contact's profile"
            />
          </button>
        </div>
      </div>
      <div
        :id="`profileCollapse-${contact.at.replaceAll(' ', '_')}`"
        class="row collapse text-center"
      >
        <div class="col">
          <div class="card m-3">
            <h4 class="card-header">
              {{ contact.at }}'s profile
            </h4>
            <div class="card-body text-center">
              <button
                class="btn btn-danger btn-sm mb-2"
                @click="removeUser(contact)"
              >
                Delete this conversation
              </button>
              <br>
              <label>Username:</label>
              <h4>@{{ contact.at }}</h4>
              <label>Security Hash:</label>
              <h4>{{ contact.store.hash || contact.server.hash }}</h4>
              <br><button
                v-if="!contact.verified && !contact.alert"
                class="btn btn-success btn-sm mb-2"
                @click="onVerify(contact)"
              >
                Validate this contact's security hash
              </button>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card m-3">
            <h4 class="card-header">
              Informations
            </h4>
            <div class="card-body text-start">
              <p>
                <i
                  class="bi me-1 bi-shield-fill-check"
                  style="font-size: 1.4rem; color: #0d6efd;"
                />
                appears if the user is validated through the blockchain
              </p>
              <p>
                <i
                  class="bi bi-people me-1"
                  style="font-size: 1.4rem; color: #198754;"
                />
                appears if the user has been manually validated by comparing the security hash
              </p>
              <p>
                <i
                  class="bi bi-fingerprint me-1"
                  style="font-size: 1.4rem; color: #198754;"
                />
                appears if the user has been validated through its security file
              </p>
              <p>
                <i
                  class="bi bi-wifi me-1"
                  style="font-size: 1.4rem; color: #0d6efd;"
                />
                appears if the user is connected and ready to chat
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
