<script setup>
import { router } from '@/router';

defineProps(['group']);

function showDetail(groupId) {
  router.push(`/group/${groupId}`);
}
function goTalk(at) {
  router.push(`/conversations/${at}`);
}
</script>
<template>
  <div class="row mt-3">
    <div class="col-12 col-lg-4 text-truncate mt-2">
      <span
        class="badge me-1 mb-1"
        :class="group.messages.length > 0
          ? 'bg-warning'
          : 'bg-secondary'"
        data-bs-toggle="tooltip"
        title="Messages waiting"
      >{{ group.messages.length }}</span>
      <span
        style="cursor: pointer"
        @click="goTalk(group.at)"
      >
        <b translate="no">{{ group.id }}</b>
      </span>
      <i
        class="bi bi-arrow-right-circle-fill ms-2 float-end"
        style="font-size: 1.2rem; color: grey; cursor: pointer;"
        @click="goTalk(group.at)"
      />
    </div>
    <div class="col-8 col-lg-4 d-flex align-items-center">
      <div
        v-if="group.alert"
        class="alert alert-danger"
        role="alert"
      >
        <pre>{{ group.alert }}</pre>
      </div>
      <div v-if="!group.alert">
        <div class="d-flex align-items-center">
          <i
            class="bi me-2"
            :class="group.isAdmin
              ? 'bi bi-star-fill'
              : 'bi bi-star'"
            style="font-size: 1.2rem;"
            :style="{ color: group.isAdmin ? '#FFD700' : 'grey' }"
            data-bs-toggle="tooltip"
            :title="group.isAdmin
              ? 'You\'re an admin'
              : 'You\'re just a member'"
          />
          <span style="font-size: 0.8rem; color: grey;">You and {{ group.members.length }} members</span>
        </div>
      </div>
    </div>
    <div class="col-4 col-lg-4 d-flex align-items-center justify-content-end">
      <i
        class="bi bi-info-circle-fill"
        style="font-size: 1.2rem; color: #0d6efd; cursor: pointer;"
        title="Show group's detail"
        @click="showDetail(group.at)"
      />
    </div>
  </div>
</template>
