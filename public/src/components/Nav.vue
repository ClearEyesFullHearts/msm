<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { Tooltip } from 'bootstrap';
import {
  useAuthStore, useUsersStore, useConnectionStore, useWorkerStore,
} from '@/stores';

const authStore = useAuthStore();
const usersStore = useUsersStore();
const connectionStore = useConnectionStore();
const workerStore = useWorkerStore();
const { countDownMsg } = storeToRefs(authStore);
const { isConnected } = storeToRefs(connectionStore);

const isAllowed = ref(true);
const isDisabled = ref(false);

onMounted(() => {
  new Tooltip(document.body, {
    selector: "[data-bs-toggle='tooltip']",
  });

  isAllowed.value = !!window.Notification && window.Notification.permission === 'granted';
  isDisabled.value = window.Notification.permission !== 'default' || !window.Notification;
});

async function incinerate() {
  if (window.confirm('Do you really want to burn this account?')) {
    await usersStore.destroy(authStore.user.user.username);
    authStore.logout();
  }
}

async function acceptNotification() {
  if (!isAllowed.value && !isDisabled.value) {
    await workerStore.start();
    await workerStore.subscribe(true);
    isAllowed.value = !!window.Notification && window.Notification.permission === 'granted';
    isDisabled.value = window.Notification.permission !== 'default' || !window.Notification;
  }
}

</script>

<template>
  <nav
    v-if="!authStore.idIsSet"
    class="navbar navbar-expand navbar-dark bg-dark"
  >
    <div class="navbar-nav me-auto">
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
    <div class="me-2">
      <router-link
        v-slot="{href, navigate}"
        to="/connect"
      >
        <button
          :href="href"
          class="btn btn-outline-light"
          @click="navigate"
        >
          Login
        </button>
      </router-link>
      &nbsp;
      <router-link
        v-slot="{href, navigate}"
        to="/create"
      >
        <button
          :href="href"
          class="btn btn-outline-light"
          @click="navigate"
        >
          Register
        </button>
      </router-link>
    </div>
  </nav>
  <nav
    v-if="authStore.idIsSet"
    class="navbar navbar-expand-lg navbar-dark bg-dark"
  >
    <div class="navbar-nav mx-lg-auto mx-2">
      <button
        class="btn btn-outline-light"
        @click="authStore.logout()"
      >
        Logout
      </button>
    </div>
    <ul class="navbar-nav">
      <li class="nav-item dropdown">
        <a
          id="navbarDropdown"
          class="nav-link dropdown-toggle"
          href="#"
          role="button"
          data-bs-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
          translate="no"
        >

          <i
            v-if="!isConnected"
            class="bi bi-wifi-off me-2"
            style="font-size: 1rem; color: grey"
            data-bs-toggle="tooltip"
            title="Disconnected"
          />
          <i
            v-if="isConnected"
            class="bi bi-wifi me-2"
            style="font-size: 1rem; color: #198754"
            data-bs-toggle="tooltip"
            title="Connected"
          />
          <i
            v-if="!authStore?.isValidatedOnChain"
            class="bi bi-shield-slash-fill"
            style="font-size: 1rem; color: grey"
            data-bs-toggle="tooltip"
            title="No on-chain validation yet"
          />
          <i
            v-if="authStore?.isValidatedOnChain"
            class="bi bi-shield-fill-check"
            style="font-size: 1rem; color: #198754"
            data-bs-toggle="tooltip"
            title="On-chain validation confirmed"
          />
          @{{ authStore?.user?.user?.username }}
        </a>
        <div
          class="dropdown-menu dropdown-menu-dark dropdown-menu-end"
          aria-labelledby="navbarDropdown"
        >
          <div class="dropdown-item">
            <div class="form-check form-switch">
              <input
                id="flexSwitchCheckNotification"
                :checked="isAllowed"
                class="form-check-input"
                type="checkbox"
                :disabled="isDisabled"
                @change="acceptNotification()"
              >
              <label
                class="form-check-label"
                for="flexSwitchCheckNotification"
              >Accept Notifications</label>
            </div>
          </div>
          <div class="dropdown-item">
            <div class="form-check form-switch">
              <input
                id="flexSwitchCheckDefault"
                v-model="authStore.autoConnect"
                class="form-check-input"
                type="checkbox"
              >
              <label
                class="form-check-label"
                for="flexSwitchCheckDefault"
              >Stay connected</label>
            </div>
          </div>
          <div
            class="dropdown-item"
            style="cursor: pointer"
            @click="authStore.relog()"
          >
            Session ends in {{ countDownMsg }}
          </div>
          <div class="dropdown-divider" />
          <router-link
            to="/profile"
            class="dropdown-item"
          >
            Profile
          </router-link>
          <router-link
            to="/vault"
            class="dropdown-item"
          >
            The Vault
          </router-link>
          <div class="dropdown-divider" />
          <router-link
            to="/home"
            class="dropdown-item"
          >
            About us
          </router-link>
          <div class="dropdown-divider" />
          <button
            class="btn btn-outline-danger ms-3"
            @click="incinerate()"
          >
            Incinerate
          </button>
        </div>
      </li>
    </ul>
  </nav>
</template>
