<script setup>
import { storeToRefs } from 'pinia';
import {
  ref, nextTick, defineProps, onMounted, onUnmounted, watch, computed,
} from 'vue';
import { useGroupStore } from '@/stores';
import { Autocomplete } from '@/components';
import { router } from '@/router';

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
  groupStore.current = {
    members: [],
  };
});

function groupAdd(user) {
  groupStore.addMember(user);
}
function setAdmin(contact) {
  groupStore.setAdmin(contact);
}
function revoke(contact) {
  if (window.confirm('Revoking a user can lead to some unreadable messages for other users, do you want to proceed?')) {

  }
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
    <i
      v-if="current.isAdmin"
      class="bi bi-star-fill ms-1 me-1"
      style="color: #FFD700;"
    />
    <span translate="no">{{ current.at }}</span>
  </h4>
  <hr>
  <div>
    <Autocomplete
      v-if="current.isAdmin"
      @user-selected="groupAdd"
    />
  </div>
  <div
    v-if="current.members.length"
    class="container-fluid"
  >
    <div
      v-for="contact in current.members"
      :key="contact.id"
    >
      <div class="row mb-1">
        <div class="col-12 col-lg-4 mt-2">
          <i
            v-if="contact.isAdmin"
            class="bi bi-star-fill me-1"
            style="color: #FFD700;"
            data-bs-toggle="tooltip"
            title="Is an admin"
          />
          <b translate="no">{{ contact.at }}</b>
        </div>
        <div class="col-12 col-lg-8">
          <div
            v-if="contact.alert"
            class="alert alert-danger"
            role="alert"
          >
            <pre>{{ contact.alert }}</pre>
          </div>
          <span v-if="!contact.alert && !contact.isAdmin && current.isAdmin">
            <button
              class="btn btn-primary btn-sm me-2"
              type="button"
              @click="setAdmin(contact)"
            >
              <i
                class="bi bi-star"
                style="font-size: 1rem; color: white"
                title="Makes it an admin"
              />
            </button>
          </span>
          <span v-if="!contact.alert && !contact.isAdmin && current.isAdmin">
            <button
              class="btn btn-danger btn-sm me-2"
              type="button"
              @click="revoke(contact)"
            >
              <i
                class="bi bi-person-dash"
                style="font-size: 1rem; color: white"
                title="Remove that contact from the group"
              />
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
