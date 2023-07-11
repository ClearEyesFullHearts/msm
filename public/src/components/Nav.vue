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
    v-if="!authStore.user"
    class="navbar navbar-expand navbar-dark bg-dark"
  >
    <div class="navbar-nav mr-auto">
      <router-link
        to="/"
        class="nav-item nav-link"
      >
        ySyPyA
      </router-link>
      <router-link
        to="/engine"
        class="nav-item nav-link"
      >
        Engine
      </router-link>
    </div>
    <div>
      <router-link
        v-slot="{href, navigate}"
        to="/account/login"
      >
        <button
          :href="href"
          class="btn btn-outline-light"
          @click="navigate"
          disabled
        >
          Login
        </button>
      </router-link>
      &nbsp;
      <router-link
        v-slot="{href, navigate}"
        to="/account/register"
      >
        <button
          :href="href"
          class="btn btn-outline-light"
          @click="navigate"
          disabled
        >
          Register
        </button>
      </router-link>
    </div>
  </nav>
  <nav
    v-if="authStore.user"
    class="navbar navbar-expand-lg navbar-dark bg-dark"
  >
    <button
      class="navbar-toggler"
      type="button"
      data-toggle="collapse"
      data-target="#navbarTogglerDemo01"
      aria-controls="navbarTogglerDemo01"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon" />
    </button>
    <div
      id="navbarTogglerDemo01"
      class="collapse navbar-collapse"
    >
      <div class="navbar-nav mr-auto">
        <router-link
          to="/home"
          class="nav-item nav-link"
        >
          Home
        </router-link>
        <router-link
          to="/messages"
          class="nav-item nav-link"
        >
          InBox
        </router-link>
        <router-link
          to="/memory"
          class="nav-item nav-link"
        >
          MemoryBox
        </router-link>
      </div>

      <div class="navbar-nav m-1 mr-auto">
        <button
          class="btn btn-outline-danger"
          @click="incinerate()"
        >
          Incinerate @{{ authStore?.user?.user?.username }}
        </button>
      </div>
      <div class="navbar-nav m-1">
        <button
          class="btn btn-outline-light"
          @click="authStore.logout()"
        >
          Logout
        </button>
      </div>
    </div>
    <div>
      <span class="navbar-text">Your session will expire in {{ countDownMsg }}</span>
    </div>
  </nav>
</template>
