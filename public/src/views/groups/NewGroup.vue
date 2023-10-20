<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import {
  useGroupStore, useAlertStore, useContactsStore, useAuthStore,
} from '@/stores';
import { router } from '@/router';

const groupStore = useGroupStore();
const contactsStore = useContactsStore();
const authStore = useAuthStore();
const alertStore = useAlertStore();

const schema = Yup.object().shape({
  groupName: Yup.string()
    .required('Group name is required')
    .min(5, 'The group name should be at least 5 characters long')
    .max(125, 'The group name should not be longer than 125 characters'),
});

async function onSubmit(values) {
  try {
    const newGroup = await groupStore.create(values);
    contactsStore.list.unshift(newGroup);
    contactsStore.dirty = true;

    contactsStore.saveContactList(authStore.pem);
    router.push(`/group/${newGroup.at}`);
  } catch (error) {
    alertStore.error(error);
  }
}
</script>
<template>
  <Form
    v-slot="{ values, errors, isSubmitting }"
    :validation-schema="schema"
    @submit="onSubmit"
  >
    <div class="form-group">
      <router-link :to="`/conversations`">
        <i
          class="bi bi-arrow-left-circle-fill me-2"
          style="font-size: 1.4rem; color: grey;"
        />
      </router-link>
      <label><h4>New Group Name</h4></label>

      <Field
        name="groupName"
        type="text"
        class="form-control"
        :class="{ 'is-invalid': errors.groupName }"
      />
      <div class="invalid-feedback">
        {{ errors.groupName }}
      </div>
      <div class="form-group mt-3 mb-1">
        <button
          class="btn btn-primary"
          :disabled="isSubmitting"
        >
          <span
            v-show="isSubmitting"
            class="spinner-border spinner-border-sm me-1"
          />
          Create
        </button>
      </div>
    </div>
  </Form>
  <div class="card mt-3">
    <h4 class="card-header">
      What's happening
    </h4>
    <div
      class="card-body"
    >
      <p>
        When you create a group, a randomly generated secret key is produced.
        This key is shared among all members of the group.
      </p>
      <p>
        The secret key is stored in an encrypted form, along with your group membership,
        using your public key.
      </p>
      <p>
        When you send a message to the group, you decrypt the group key using your personal
        secret key and then use that group key to encrypt your message.<br>
        Reading messages from the group follows the same process,
        involving the decryption of the group key and the subsequent decryption of the message.
      </p>
      <p>
        Whenever you, or another group administrator, adds a new member,
        the group key is encrypted with that user's public key to securely provide access to them.
      </p>
      <p>
        In cases where you, or another group administrator, remove a member from the group,
        a new group key is generated. This new key is encrypted with the public keys
        of all remaining members and then shared accordingly.
      </p>
    </div>
  </div>
</template>
