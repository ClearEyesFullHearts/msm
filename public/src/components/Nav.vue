<script setup>
import { storeToRefs } from 'pinia';
import { useAuthStore, useUsersStore } from '@/stores';

const authStore = useAuthStore();
const usersStore = useUsersStore();
const { countDownMsg } = storeToRefs(authStore);

async function incinerate() {
  if (window.confirm('Do you really want to burn this account?')) {
    await usersStore.destroy(authStore.user.user.id);
    authStore.logout();
  }
}

</script>

<template>
  <nav
    v-if="authStore.user"
    class="navbar navbar-expand navbar-dark bg-dark"
  >
    <div class="navbar-nav mr-auto">
      <router-link
        to="/"
        class="nav-item nav-link"
      >
        Home
      </router-link>
      <router-link
        to="/messages"
        class="nav-item nav-link"
      >
        Inbox
      </router-link>
      <router-link
        to="/memory"
        class="nav-item nav-link"
      >
        MemoryBox
      </router-link>
    </div>
    <div class="navbar-nav mr-auto">
      <button
        class="btn btn-outline-danger"
        @click="incinerate()"
      >
        Incinerate @{{ authStore?.user?.user?.username }}
      </button>
    </div>
    <div>
      <span class="navbar-text">Your session will expire in {{ countDownMsg }}</span>
            &nbsp;
      <button
        class="btn btn-outline-light"
        @click="authStore.logout()"
      >
        Logout
      </button>
    </div>
  </nav>
</template>
