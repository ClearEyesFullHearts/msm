<script setup>
import { storeToRefs } from 'pinia';

import { useMessagesStore } from '@/stores';

const messagesStore = useMessagesStore();
const { headers } = storeToRefs(messagesStore);

messagesStore.getHeaders();
</script>

<template>
    <h1>Inbox</h1>

    <button @click="messagesStore.getHeaders()" class="btn btn-sm btn-secondary" :disabled="headers.loading">
        <span v-if="headers.loading" class="spinner-border spinner-border-sm"></span>
        <span v-else>Refresh</span>
    </button>
    <router-link to="/messages/write" class="btn btn-sm btn-success mb-2 float-right">Write a message</router-link>
    <table class="table table-striped">
        <thead>
            <tr>
                <th style="width: 30%">From</th>
                <th style="width: 30%">Title</th>
                <th style="width: 30%">Sent at</th>
                <th style="width: 10%"></th>
            </tr>
        </thead>
        <tbody>
            <template v-if="headers.length">
                <tr v-for="msg in headers" :key="msg.id">
                    <td>{{ msg.from }}</td>
                    <td>{{ msg.title }}</td>
                    <td>{{ new Date(msg.sentAt).toLocaleString() }}</td>
                    <td style="white-space: nowrap">
                        <router-link :to="`/messages/show/${msg.id}`" class="btn btn-sm btn-primary mr-1">Decrypt</router-link>
                        <!-- <button @click="usersStore.delete(user.id)" class="btn btn-sm btn-danger btn-delete-user" :disabled="user.isDeleting">
                            <span v-if="user.isDeleting" class="spinner-border spinner-border-sm"></span>
                            <span v-else>Delete</span>
                        </button> -->
                    </td>
                </tr>
            </template>
            <tr v-if="headers.loading">
                <td colspan="4" class="text-center">
                    <span class="spinner-border spinner-border-lg align-center"></span>
                </td>
            </tr>
            <tr v-if="headers.error">
                <td colspan="4">
                    <div class="text-danger">Error loading users: {{headers.error}}</div>
                </td>
            </tr>            
        </tbody>
    </table>
</template>
