<script setup>
import {
  ref, nextTick, defineProps, onMounted, onUnmounted,
} from 'vue';
import { storeToRefs } from 'pinia';
import { useConversationStore } from '@/stores';

const props = defineProps({
  at: {
    type: String,
    required: true,
  },
});

const conversationStore = useConversationStore();
const { current } = storeToRefs(conversationStore);
const chatArea = ref(null);
const typingArea = ref(null);

const canWrite = ref(false);

onMounted(() => {
  conversationStore.loadConvo(props.at)
    .then(async () => {
      canWrite.value = current.value.target.alert === null;
      await nextTick();
      chatArea.value.scrollTop = chatArea.value.scrollHeight;
    });
});

onUnmounted(() => {
  conversationStore.current = {};
});

async function sendMessage() {
  const txt = typingArea.value.value;
  await conversationStore.sendMail(props.at, txt);
  typingArea.value.value = '';
  await nextTick();
  chatArea.value.scrollTop = chatArea.value.scrollHeight;
}
</script>
<template>
  <h4 class="border-bottom">
    <router-link :to="`/conversations`">
      <i
        class="bi bi-arrow-left-circle-fill me-1"
        style="font-size: 1.4rem; color: grey;"
      />
    </router-link>
    Conversation with {{ props.at }}
  </h4>
  <div
    ref="chatArea"
    class="chat-area flex-grow-0 py-3 px-4"
  >
    <p
      v-for="(message, index) in current.messages"
      :key="index"
      class="message"
      :class="{ 'message-out': message.from === 'me', 'message-in': message.from !== 'me' }"
    >
      <span v-if="message.title">
        {{ message.title }} at {{ new Date(message.sentAt).toLocaleString() }}
      </span>
      <pre>{{ message.content }}</pre>
    </p>
  </div>
  <div class="flex-grow-0 py-3 px-4 border-top">
    <div class="input-group">
      <textarea
        ref="typingArea"
        class="form-control"
        placeholder="Type your message"
        :disabled="!canWrite"
      />
      <button
        class="btn btn-primary"
        :disabled="!canWrite"
        @click="sendMessage()"
      >
        Send
      </button>
    </div>
  </div>
</template>
<style scoped>
.chat-area {
  /* border: 1px solid #ccc; */
  /* background: white; */
  height: 50vh;
  padding: 1em;
  overflow: auto;
  /* max-width: 60%;
  margin: 0 auto 2em auto; */
}
.message {
  width: 45%;
  border-radius: 10px;
  padding: .5em;
/*   margin-bottom: .5em; */
  font-size: 1.0em;
}
.message-out {
  background: #407FFF;
  color: white;
  margin-left: 50%;
}
.message-in {
  background: #F1F0F0;
  color: black;
}
</style>
