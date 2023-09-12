<script setup>
import {
  ref, nextTick, defineProps, onMounted,
} from 'vue';
import { storeToRefs } from 'pinia';
import { useConversationStore } from '@/stores';

const props = defineProps({
  at: {
    type: String,
    required: true,
  },
});

// const messages = ref([]);
const conversationStore = useConversationStore();
const { current } = storeToRefs(conversationStore);
const chatArea = ref(null);
const typingArea = ref(null);

onMounted(() => {
  conversationStore.loadConvo(props.at)
    .then(async () => {
      await nextTick();
      chatArea.value.scrollTop = chatArea.value.scrollHeight;
    });
});

async function sendMessage() {
  const txt = typingArea.value.value;
  await conversationStore.sendMail(props.at, txt);
//   current.value.messages.push({ content: txt, from: 'me' });
  await nextTick();
  chatArea.value.scrollTop = chatArea.value.scrollHeight;
}
</script>
<template>
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
      />
      <button
        class="btn btn-primary"
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
