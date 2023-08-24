<script setup>
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { Tooltip } from 'bootstrap';
import { useAuthStore, useUsersStore } from '@/stores';

const authStore = useAuthStore();
const usersStore = useUsersStore();
const { countDownMsg } = storeToRefs(authStore);

onMounted(() => {
  new Tooltip(document.body, {
    selector: "[data-bs-toggle='tooltip']",
  });
});

async function incinerate() {
  if (window.confirm('Do you really want to burn this account?')) {
    await usersStore.destroy(authStore.user.user.username);
    authStore.logout();
  }
}

</script>

<template>
  <nav
    v-if="!authStore.user"
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
        to="/account/login"
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
        to="/account/register"
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
    v-if="authStore.user"
    class="navbar navbar-expand-lg navbar-dark bg-dark"
  >
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarSupportedContent"
      aria-controls="navbarSupportedContent"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon" />
    </button>
    <div
      id="navbarSupportedContent"
      class="collapse navbar-collapse"
    >
      <ul class="navbar-nav me-auto">
        <li class="nav-item active">
          <router-link
            to="/home"
            class="nav-item nav-link"
          >
            Home
          </router-link>
        </li>
        <li class="nav-item dropdown">
          <a
            id="navbarDropdown"
            class="nav-link dropdown-toggle"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Messages
          </a>
          <div
            class="dropdown-menu dropdown-menu-dark"
            aria-labelledby="navbarDropdown"
          >
            <router-link
              to="/messages"
              class="dropdown-item"
            >
              InBox
            </router-link>
            <router-link
              to="/memory"
              class="dropdown-item"
            >
              MemoryBox
            </router-link>
            <div class="dropdown-divider" />
            <router-link
              to="/messages/write"
              class="dropdown-item"
            >
              New
            </router-link>
          </div>
        </li>
      </ul>
      <div class="navbar-nav m-1 me-auto">
        <button
          class="btn btn-outline-danger"
          @click="incinerate()"
        >
          Incinerate
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
          >
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
              to="/contacts"
              class="dropdown-item"
            >
              Contacts
            </router-link>
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
          </div>
        </li>
      </ul>
    </div>
  </nav>
</template>
