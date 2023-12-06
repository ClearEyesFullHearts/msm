<script setup>
import { storeToRefs } from 'pinia';
import {
  ref, defineProps, onMounted, onUnmounted,
} from 'vue';
import {
  useAlertStore, useGroupStore, useContactsStore, useAuthStore,
} from '@/stores';
import { Autocomplete, ClickAndEdit } from '@/components';
import { router } from '@/router';

const alertStore = useAlertStore();
const groupStore = useGroupStore();
const contactsStore = useContactsStore();
const authStore = useAuthStore();

const { current } = storeToRefs(groupStore);

const isEditing = ref(false);
const editableGroupName = ref(null);

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

function stopEditing(event) {
  if (event.target.id !== 'editableTextInput') {
    isEditing.value = false;
    editableGroupName.value.cancelEditing();
  }
}

onMounted(() => {
  groupStore.getCurrentGroup(props.id)
    .then(() => {
      if (current.value.isAdmin) {
        window.addEventListener('click', stopEditing);
      }
    });
});
onUnmounted(() => {
  window.removeEventListener('click', stopEditing);
  groupStore.current = {
    id: '',
    isAdmin: false,
    members: [],
  };
});

function groupAdd(user) {
  try {
    groupStore.addMember(user);
  } catch (err) {
    alertStore.error(err);
  }
}
function setAdmin(contact) {
  try {
    groupStore.setAdmin(contact);
  } catch (err) {
    alertStore.error(err);
  }
}
function revoke(contact) {
  if (window.confirm('Revoking a user can lead to some unreadable messages for other users, do you want to proceed?')) {
    try {
      groupStore.revoke(contact);
    } catch (err) {
      alertStore.error(err);
    }
  }
}
async function quit() {
  const group = await groupStore.quitGroup();
  if (group) {
    contactsStore.removeUser(group.id);
    contactsStore.saveContactList(authStore.pem);
    router.push('/conversations');
  }
}
async function deleteGroup() {
  const group = await groupStore.deleteGroup();
  if (group) {
    contactsStore.removeUser(group.id);
    contactsStore.saveContactList(authStore.pem);
    router.push('/conversations');
  }
}

function onChangeName(newName) {
  isEditing.value = false;
  groupStore.setName(newName);
}
function onNameEdit() {
  isEditing.value = true;
}

</script>
<template>
  <h4>
    <router-link :to="`/conversations`">
      <i
        v-if="!isEditing"
        class="bi bi-arrow-left-circle-fill me-2"
        style="font-size: 1.4rem; color: grey;"
      />
    </router-link>
    <ClickAndEdit
      ref="editableGroupName"
      :text-value="current.id"
      :editable="current.isAdmin"
      @save-edit="onChangeName"
      @is-editing="onNameEdit"
    />
  </h4>
  <span
    v-if="current.isAdmin"
    style="font-size: 0.8rem; color: grey;"
  ><i
    class="bi me-1 bi bi-star-fill"
    style="color: #FFD700;font-size: 0.8rem;"
  />Group admin</span>
  <span
    v-if="!current.isAdmin"
    style="font-size: 0.8rem; color: grey;"
  >Member</span>
  <hr>
  <div v-if="current.isAdmin">
    <Autocomplete
      @user-selected="groupAdd"
    />
    <hr>
  </div>
  <div
    v-if="current.members.length"
    class="container-fluid"
  >
    <div
      v-for="contact in current.members"
      :key="contact.at"
    >
      <div class="row mb-1">
        <div class="col-8 mt-2">
          <h5
            class="text-break"
            translate="no"
          >
            {{ contact.at }}
          </h5>
          <span
            v-if="contact.isAdmin"
            style="font-size: 0.8rem; color: grey;"
          ><i
            class="bi me-1 bi bi-star-fill"
            style="color: #FFD700;font-size: 0.8rem;"
          />Group admin</span>
          <span
            v-if="!contact.isAdmin"
            style="font-size: 0.8rem; color: grey;"
          >Member</span>
        </div>
        <div class="col-4">
          <div
            v-if="contact.alert"
            class="alert alert-danger"
            role="alert"
          >
            <pre>{{ contact.alert }}</pre>
          </div>
          <span v-if="!contact.alert && !contact.isAdmin && current.isAdmin">
            <button
              class="btn btn-danger btn-sm me-2 float-end"
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
          <span v-if="!contact.alert && !contact.isAdmin && current.isAdmin">
            <button
              class="btn btn-warning btn-sm me-2 float-end"
              type="button"
              @click="setAdmin(contact)"
            >
              <i
                class="bi bi-star"
                style="font-size: 1rem; color: white"
                title="Make them an admin"
              />
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
  <hr v-if="current.members.length">
  <div class="text-end d-flex flex-column">
    <button
      v-if="groupStore.canQuit"
      class="btn btn-dark mt-1"
      @click="quit()"
    >
      Quit group
    </button>
  </div>

  <div class="text-end d-flex flex-column mt-2">
    <button
      v-if="current.isAdmin"
      ref="verifyUploadBtn"
      class="btn btn-danger mt-1"
      @click="deleteGroup()"
    >
      Delete group
    </button>
  </div>
</template>
