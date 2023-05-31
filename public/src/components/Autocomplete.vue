<script setup>
import { storeToRefs } from 'pinia';
import { useUsersStore, useMessagesStore } from '@/stores';
import { ref } from 'vue'

const userStore = useUsersStore();
const messagesStore = useMessagesStore();
const { users } = storeToRefs(userStore);

userStore.users = [];
messagesStore.targetAt = [];
const searchinput = ref(null)

function onInputText(txt){
    if(txt.length > 2){
        userStore.getAll(txt);
    }else{
        userStore.users = [];
    }
}

function selectUser(user) {
    messagesStore.targetAt.push(user);
    
    searchinput.value.value = '';
    userStore.users = [];
}

</script>

<template>
    <div class="bg-gray-50 min-w-screen min-h-screen flex justify-center items-center">
        <div class="max-w-xs relative space-y-3">
            <label for="search">
            search&nbsp;
            </label>
            <div class="input-group mb-3">
                <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon1">@</span>
                </div>
                <input type="text" id="search" ref="searchinput" class="form-control" autocomplete="off" placeholder="Username" @input="event => onInputText(event.target.value)">
            </div>
            <ul v-if="users.length" class="list-group list-group-flush">
                <li
                    class="list-group-item pointer"
                    v-for="user in users"
                    :key="user.at"
                    @click="selectUser(user)"
                >
                    {{ user.at }}
                </li>
            </ul>
        </div>
    </div>
</template>

<style>
.pointer {
    cursor: pointer;
}
</style>