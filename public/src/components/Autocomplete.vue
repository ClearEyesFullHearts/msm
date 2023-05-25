<script setup>
import { storeToRefs } from 'pinia';
import { useUsersStore, useMessagesStore } from '@/stores';

const userStore = useUsersStore();
const messagesStore = useMessagesStore();
const { users } = storeToRefs(userStore);

userStore.users = [];
messagesStore.targetAt = [];

function onInputText(txt){
    if(txt.length > 2){
        userStore.getAll(txt);
    }else{
        userStore.users = [];
    }
}

function selectUser(user) {
    messagesStore.targetAt.push(user);
}

</script>

<template>
    <div class="bg-gray-50 min-w-screen min-h-screen flex justify-center items-center">
        <div class="max-w-xs relative space-y-3">
            <label for="search">
            search&nbsp;
            </label>

            <input type="text" id="search" @input="event => onInputText(event.target.value)" placeholder="Type here...">

            <ul v-if="users.length">
                <li
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