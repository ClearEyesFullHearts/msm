<script setup>
import { storeToRefs } from 'pinia';

import { useAlertStore } from '@/stores';

const alertStore = useAlertStore();
const { alert } = storeToRefs(alertStore);
</script>

<template>
    <div v-if="alert" class="container">
        <div class="m-3">
            <div class="alert alert-dismissable" :class="alert.type">
                <button @click="alertStore.clear()" class="btn btn-link close">&times;</button>
                <pre>{{alert.message}}</pre>
            </div>
        </div>
    </div>
</template>