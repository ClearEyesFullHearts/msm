<script setup>
import { Nav, Alert, Toaster } from '@/components';
import { useAuthStore, useWorkerStore } from '@/stores';

const authStore = useAuthStore();

if (Notification.permission === 'granted') {
  const workerStore = useWorkerStore();
  workerStore.start();
}
</script>

<template>
  <div
    class="app-container"
    :class="authStore.user && 'bg-light'"
  >
    <Nav />
    <Alert />
    <Toaster />
    <router-view />
  </div>
</template>

<style>
@import '@/assets/base.css';
</style>
