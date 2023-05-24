<script setup>
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();
const { countDownMsg } = storeToRefs(authStore);

</script>

<template>
    <nav v-show="authStore.user" class="navbar navbar-expand navbar-dark bg-dark">
        <div class="navbar-nav mr-auto">
            <router-link to="/" class="nav-item nav-link">Home</router-link>
            <router-link to="/messages" class="nav-item nav-link">Inbox</router-link>
        </div>
        <div>
            <span class="navbar-text">Your session will expire in {{ countDownMsg }}</span>
            &nbsp;
            <button @click="authStore.logout()" class="btn btn-outline-light">Logout</button>
        </div>
    </nav>
</template>