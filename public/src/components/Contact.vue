<script setup>
import { ref } from 'vue';
import { router } from '@/router';

const isShow = ref(false);

defineProps(['contact']);
const emit = defineEmits(['deleteContact', 'contactVerified']);

function removeUser(c) {
  emit('deleteContact', c);
}
function onVerify(c) {
  emit('contactVerified', c);
}

function goTalk(at) {
  router.push(`/conversations/${at}`);
}
</script>
<template>
  <div class="row mt-3">
    <div class="col-12 col-lg-4 text-truncate mt-2">
      <span
        class="badge me-1 mb-1"
        :class="contact.messages.length > 0
          ? 'bg-warning'
          : 'bg-secondary'"
        data-bs-toggle="tooltip"
        title="Messages waiting"
      >{{ contact.messages.length }}</span>
      <span
        style="cursor: pointer"
        @click="goTalk(contact.at)"
      >
        <b translate="no">{{ contact.at }}</b>
      </span>
      <i
        class="bi bi-arrow-right-circle-fill ms-2 float-end"
        style="font-size: 1.2rem; color: grey; cursor: pointer;"
        @click="goTalk(contact.at)"
      />
    </div>
    <div class="col-8 col-lg-4 d-flex align-items-center">
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
          style="font-size: 1.2rem;"
          :style="{ color: contact.auto !== 0 ? '#0d6efd' : 'grey' }"
          data-bs-toggle="tooltip"
          :title="contact.auto !== 0
            ? 'On-chain validation confirmed'
            : 'Waiting for on-chain validation'"
        />
        <i
          v-if="contact.verified && !!contact.store.signature"
          class="bi bi-fingerprint me-1"
          style="font-size: 1.2rem; color: #198754;"
          data-bs-toggle="tooltip"
          title="Signed and Trusted"
        />
        <i
          v-if="contact.verified
            && !contact.store.signature
            && !!contact.store.hash"
          class="bi bi-people me-1"
          style="font-size: 1.2rem; color: #198754;"
          data-bs-toggle="tooltip"
          title="Manually trusted"
        />
        <i
          v-if="!contact.verified"
          class="bi bi-question-circle me-1"
          style="font-size: 1.2rem; color: grey"
          data-bs-toggle="tooltip"
          data-bs-html="true"
          title="Status unknown<br>Make sure that the hash displayed here
              match your contact's profile page's hash before trusting them"
        />
        <i
          class="bi me-1"
          :class="contact.connected
            ? 'bi-wifi'
            : 'bi-wifi-off'"
          style="font-size: 1.2rem;"
          :style="{ color: contact.connected ? '#0d6efd' : 'grey' }"
          data-bs-toggle="tooltip"
          :title="contact.connected
            ? 'online'
            : 'offline'"
        />
      </span>
    </div>
    <div class="col-4 col-lg-4 d-flex align-items-center justify-content-end">
      <i
        class="bi bi-info-circle-fill"
        style="font-size: 1.2rem; color: #0d6efd; cursor: pointer;"
        title="Show contact's profile"
        @click="isShow = !isShow"
      />
    </div>
  </div>
  <Transition name="collapse1">
    <div
      v-if="isShow"
      :id="`profileCollapse-${contact.at.replaceAll(' ', '_')}`"
      class="row text-center"
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
            <label translate="no">Username:</label>
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
  </Transition>
</template>
