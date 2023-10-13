<script setup>
import { storeToRefs } from 'pinia';
import {
  ref, nextTick, defineProps, onMounted, onUnmounted, watch, computed,
} from 'vue';
import { useGroupStore } from '@/stores';
import { Autocomplete } from '@/components';

const groupStore = useGroupStore();

const { current } = storeToRefs(groupStore);

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});
onMounted(() => {
  groupStore.getCurrentGroup(props.id)
    .then((group) => {
      console.log('current group mounted');
    });
});
onUnmounted(() => {
  groupStore.current = { users: [] };
});

function groupAdd(user) {
  groupStore.addMember(user).then(() => {
    // console.log(current.value);
  });
}
function privateTalk(user) {
  // go to `/conversations/${contact.at}`
}
</script>
<template>
  <h4>
    <router-link :to="`/conversations`">
      <i
        class="bi bi-arrow-left-circle-fill me-1"
        style="font-size: 1.4rem; color: grey;"
      />
    </router-link>
    <span translate="no">{{ current.at }}</span>
  </h4>
  <hr>
  <div>
    <Autocomplete @user-selected="groupAdd" />
  </div>
  <div
    v-if="current.users.length"
    class="container-fluid"
  >
    <div
      v-for="contact in current.users"
      :key="contact.id"
    >
      <div class="row">
        <div class="col-8 col-lg-4 mt-2">
          <a
            href="#"
            @click="privateTalk(contact)"
          >
            <b translate="no">{{ contact.at }}</b>
            <i
              class="bi bi-arrow-right-circle-fill ms-2 float-end"
              style="font-size: 1.2rem; color: grey;"
            />
          </a>
        </div>
        <div class="col-8 col-lg-4">
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
              class="bi me-1"
              :class="contact.connected
                ? 'bi-wifi'
                : 'bi-wifi-off'"
              style="font-size: 1.8rem;"
              :style="{ color: contact.connected ? '#0d6efd' : 'grey' }"
              data-bs-toggle="tooltip"
              :title="contact.connected
                ? 'online'
                : 'offline'"
            />
          </span>
        </div>
        <div class="col-4 col-lg-4 text-end">
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
    </div>
  </div>
</template>
