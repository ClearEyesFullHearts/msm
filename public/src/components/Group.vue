<script setup>
import { router } from '@/router';

defineProps(['group']);

function showDetail(groupId) {
  router.push(`/group/${groupId}`);
}
</script>
<template>
  <div class="row">
    <div class="col-8 col-lg-4 mt-2">
      <span
        class="badge me-1 mb-1"
        :class="group.messages.length > 0
          ? 'bg-warning'
          : 'bg-secondary'"
        data-bs-toggle="tooltip"
        title="Messages waiting"
      >{{ group.messages.length }}</span>
      <span>
        <router-link :to="`/conversations/${group.id}`">
          <b translate="no">{{ group.at }}</b>
          <i
            class="bi bi-arrow-right-circle-fill ms-2 float-end"
            style="font-size: 1.2rem; color: grey;"
          />
        </router-link>
      </span>
    </div>
    <div class="col-8 col-lg-4">
      <div
        v-if="group.alert"
        class="alert alert-danger"
        role="alert"
      >
        <pre>{{ group.alert }}</pre>
      </div>
      <div v-if="!group.alert">
        {{ group.members.length }} members
      </div>
    </div>
    <div class="col-4 col-lg-4 text-end">
      <button
        class="btn btn-primary btn-sm me-2"
        type="button"
        @click="showDetail(group.id)"
      >
        <i
          class="bi bi-eye"
          style="font-size: 1rem; color: white"
          title="Show group's detail"
        />
      </button>
    </div>
  </div>
</template>
