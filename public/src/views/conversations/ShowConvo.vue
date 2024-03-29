<script setup>
import {
  ref, nextTick, defineProps, onMounted, onUnmounted, watch, computed,
} from 'vue';
import { storeToRefs } from 'pinia';
import { useConversationStore, useConnectionStore, useAuthStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const mycrypto = new CryptoHelper();

const props = defineProps({
  at: {
    type: String,
    required: true,
  },
});

const conversationStore = useConversationStore();
const authStore = useAuthStore();
const connectionStore = useConnectionStore();

const { current } = storeToRefs(conversationStore);
const chatArea = ref(null);
const typingArea = ref(null);
const fileInput = ref(null);
const waitingMessages = ref([]);
const contentLength = ref(0);

const connectionState = computed(
  () => (connectionStore.isConnected ? 0 : 2) + (current.value?.target?.connected ? 0 : 1),
);

const canWrite = ref(false);

let stopWatch;
onMounted(() => {
  canWrite.value = current.value.target.alert === null;
  if (current.value.target.group) {
    canWrite.value = current.value.target.members.length > 0;
  }
  stopWatch = watch(current.value.messages, async () => {
    await nextTick();
    chatArea.value.scrollTop = chatArea.value.scrollHeight;
  });
  chatArea.value.scrollTop = chatArea.value.scrollHeight;
});

onUnmounted(() => {
  stopWatch();
  conversationStore.current = {
    target: {
      at: '',
      group: false,
    },
    messages: [],
  };
});

async function sendMessage() {
  if (typingArea.value.value.trim() === '') return;
  if (current.value.target.group) {
    const txt = typingArea.value.value;
    canWrite.value = false;
    conversationStore.sendGroupMail(txt)
      .then(() => {
        canWrite.value = true;
      });

    typingArea.value.value = '';
    contentLength.value = 0;
  } else if (connectionStore.isConnected) {
    const txt = typingArea.value.value;
    const requestId = mycrypto.uuidV4();
    waitingMessages.value.push({
      requestId,
      content: txt,
      title: 'Sending...',
    });
    conversationStore.sendFallbackMessage(current.value.target.at, txt, requestId)
      .then(async () => {
        const i = waitingMessages.value.findIndex((m) => m.requestId === requestId);
        waitingMessages.value.splice(i, 1);
      });
    typingArea.value.value = '';
    contentLength.value = 0;
    await nextTick();
    chatArea.value.scrollTop = chatArea.value.scrollHeight;
  } else {
    const txt = typingArea.value.value;
    await conversationStore.sendMail('Offline', txt);

    typingArea.value.value = '';
    contentLength.value = 0;
  }
}
function onInputText(str) {
  contentLength.value = (new TextEncoder().encode(conversationStore.encodeText(str))).length;
}
async function onLoadConvo(challenge) {
  const txt = await mycrypto.resolve(authStore.pem, JSON.parse(challenge));
  const conversation = JSON.parse(txt);
  if (conversation.at !== current.value.target.at) return;

  current.value.messages = conversation.messages;
  await nextTick();
  chatArea.value.scrollTop = chatArea.value.scrollHeight;
}
async function downloadConversation() {
  await conversationStore.downloadConversation();
}
async function uploadConversation() {
  fileInput.value.click();
}
async function onFilePicked(evt) {
  FileHelper.onFilePicked(evt, onLoadConvo);
}
</script>
<template>
  <h4>
    <router-link :to="`/conversations`">
      <i
        class="bi bi-arrow-left-circle-fill me-2"
        style="font-size: 1.4rem; color: grey;"
      />
    </router-link>
    <span translate="no">Conversation with {{ current.target.group ? current.target.id : current.target.at }}</span>
  </h4>
  <div class="text-truncate">
    <span
      v-if="current.target.group"
      style="font-size: 0.8rem; color: grey;"
    >
      Members: {{ current.target.members.map((m) => m.at).join(', ') }}
    </span>
  </div>
  <hr>
  <div
    ref="chatArea"
    class="chat-area flex-grow-0 py-3 px-4"
  >
    <div
      v-for="(message, index) in current.messages"
      :key="index"
      class="row"
      :class="{ 'justify-content-end': message.from === 'me', 'justify-content-start': message.from !== 'me' }"
    >
      <div
        class="col-10 col-md-8 my-1 message"
        :class="{ 'message-out': message.from === 'me', 'message-in': message.from !== 'me' }"
      >
        <span
          v-if="message.title"
          class="message-title"
        >
          {{ message.title }} at {{ new Date(message.sentAt).toLocaleString() }}
        </span>
        <pre class="message-content">{{ message.content }}</pre>
      </div>
    </div>
    <div
      v-for="(waiting, index) in waitingMessages"
      :key="index"
      class="row justify-content-end"
    >
      <div class="col-10 col-md-8 my-1 message message-out">
        <span
          v-if="waiting.title"
          class="message-title"
        >
          {{ waiting.title }}
        </span>
        <pre class="message-content">{{ waiting.content }}</pre>
      </div>
    </div>
  </div>
  <div class="flex-grow-0 py-3 px-4 border-top">
    <div class="input-group">
      <div
        class="form-control p-0"
        style="position: relative; border: none;"
      >
        <textarea
          ref="typingArea"
          class="form-control m-0"
          :placeholder="connectionState === 0 ? 'Chat away' :
            connectionState === 1 ? `Type here, ${current.target.group ? current.target.id : current.target.at} is not connected but you can still send them a message` : 'Type your message or connect to chat'"
          :disabled="!canWrite"
          @input="event => onInputText(event.target.value)"
        />
        <div style="position: absolute; bottom: 2%; right: 3%; color:#ccc">
          <span style="font-size: 0.8em">{{ contentLength }} / 446</span>
        </div>
      </div>
      <button
        class="btn btn-primary"
        :disabled="!canWrite"
        @click="sendMessage()"
      >
        <i
          class="bi"
          :class="connectionState < 2 ? 'bi-send' : 'bi-envelope'"
          style="font-size: 1.1rem; color: white"
        />
      </button>
    </div>
  </div>
  <div class="row">
    <div class="col-md-1 d-flex flex-column">
      <button
        v-if="current.messages.length > 0"
        class="btn btn-secondary btn-sm float-end mt-1"
        type="button"
        @click="downloadConversation()"
      >
        <i
          class="bi bi-download"
          style="font-size: 1rem; color: white"
        />
      </button>
    </div>
    <div class="col-md-10" />
    <div class="col-md-1 d-flex flex-column">
      <button
        class="btn btn-success btn-sm float-end mt-1"
        type="button"
        @click="uploadConversation()"
      >
        <i
          class="i bi-file-earmark-arrow-up-fill"
          style="font-size: 1rem; color: white"
        />
      </button>
      <input
        ref="fileInput"
        hidden
        multiple
        type="file"
        style="opacity: none;"
        @change="onFilePicked"
      >
    </div>
  </div>
</template>
<style scoped>
.chat-area {
  /* border: 1px solid #ccc; */
  /* background: white; */
  height: 65vh;
  padding: 1em;
  overflow: auto;
  width: 100%;
  /* max-width: 60%;
  margin: 0 auto 2em auto; */
}
.message {
  /* width: 45%; */
  border-radius: 10px;
  padding: .5em;
}
.message-out {
  background: #198754;
  color: white;
}
.message-in {
  background: #0d6efd;
  color: white;
}
.message-title {
  font-size: 0.8em;
}
.message-content {
  font-size: 1.2em;
  margin-bottom: 0em;
}

pre {
 white-space: pre-wrap;       /* css-3 */
 white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
 white-space: -pre-wrap;      /* Opera 4-6 */
 white-space: -o-pre-wrap;    /* Opera 7 */
 word-wrap: break-word;       /* Internet Explorer 5.5+ */
}
</style>
