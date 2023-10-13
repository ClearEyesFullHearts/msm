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
    const { id } = await groupStore.create(values);

    contactsStore.addGroup({
      groupId: id,
      groupName: values.groupName,
    });
    contactsStore.saveContactList(authStore.pem);
    // router.push(`/group/${groupId}`);
    router.push('/conversations');
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
      <label>New Group Name</label>
      <div class="input-group mb-3">
        <div class="input-group-prepend">
          <span
            id="basic-addon1"
            class="input-group-text"
          >@</span>
        </div>
        <Field
          name="groupName"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': errors.groupName }"
        />
        <div class="invalid-feedback">
          {{ errors.groupName }}
        </div>
      </div>
      <div class="form-group mt-2">
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
</template>
