<script setup>
import { storeToRefs } from 'pinia';
import { Autocomplete } from '@/components';
import { useContactsStore } from '@/stores';

const contactsStore = useContactsStore();
const { list } = storeToRefs(contactsStore);

function addUser(user) {
  contactsStore.manualAdd(user);
}
function onVerify(contact) {
  contactsStore.verifyUser(contact.id);
}
</script>
<template>
  <h1>Contacts</h1>
  <Autocomplete @user-selected="addUser" />

  <table class="table table-striped">
    <thead>
      <tr>
        <th style="width: 50%">
          User
        </th>
        <th style="width: 5%">
          Status
        </th>
        <th style="width: 10%">
          Auto validation
        </th>
        <th style="width: 10%">
          Hash validation
        </th>
        <th style="width: 10%">
          Signature validation
        </th>
        <th style="width: 5%" />
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
            <b>{{ contact.hash }}</b>
          </td>
          <td>{{ contact.verified ? 'validated' : 'N/A' }}</td>
          <td>{{ contact.verification.auto ? 'validated' : 'N/A' }}</td>
          <td>{{ contact.verification.hash ? 'validated' : 'N/A' }}</td>
          <td>{{ contact.verification.signature ? 'validated' : 'N/A' }}</td>
          <td>
            <button
              v-if="!contact.verified"
              ref="verifyBtn"
              class="btn btn-success btn-sm"
              @click="onVerify(contact)"
            >
              Verify
            </button>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>
