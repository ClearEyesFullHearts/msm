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
      data-toggle="collapse"
      data-target="#navbarSupportedContent"
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
      <ul class="navbar-nav mr-auto">
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
            data-toggle="dropdown"
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
      <div class="navbar-nav m-1 mr-auto">
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
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            @{{ authStore?.user?.user?.username }}
          </a>
          <div
            class="dropdown-menu dropdown-menu-dark dropdown-menu-right"
            aria-labelledby="navbarDropdown"
          >
            <div class="dropdown-item">
              Session ends in {{ countDownMsg }}
            </div>
            <div class="dropdown-divider" />
            <router-link
              to="/profile/contacts"
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
              to="/profile/vault"
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
