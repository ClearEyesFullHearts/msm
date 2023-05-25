<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useMessagesStore } from '@/stores';

const authStore = useAuthStore();
const messagesStore = useMessagesStore();
messagesStore.message = {};
messagesStore.targetMessage = {};

const { user } = storeToRefs(authStore);
</script>

<template>
    <div v-if="user">
        <h1>Hi {{user.firstName}}!</h1>
        <p>You're logged in with Vue 3 + Pinia & JWT!!</p>
        <p><router-link to="/messages">Go to your inbox</router-link></p>
    </div>
</template>
