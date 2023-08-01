<script setup>
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useMessagesStore } from '@/stores';

const messagesStore = useMessagesStore();
const router = useRouter();
const route = useRoute();
const { id } = route.params;
messagesStore.targetMessage = {};

let message = null;
({ message } = storeToRefs(messagesStore));
messagesStore.getMessage(id);

async function replyTo(from, reTitle, content) {
  messagesStore.targetMessage.at = from.substring(1);
  messagesStore.targetMessage.title = `Re: ${reTitle}`;
  messagesStore.targetMessage.quote = content;
  await router.push('/messages/write');
}

async function download() {
  await messagesStore.downloadMessage();
}

async function forceDelete() {
  await messagesStore.deleteMessage(id);
  await router.push('/messages');
}

</script>

<template>
  <main
    role="main"
    class="container-sm"
  >
    <div class="row justify-content-center">
      <div class="col-md-8 blog-main">
        <router-link
          to="/messages"
          class="btn btn-link p-0"
        >
          Back to inbox
        </router-link>
        <h3 class="pb-3 mb-4 font-italic border-bottom">
          {{ message.title }}
          <button
            class="btn btn-danger float-end"
            @click="forceDelete()"
          >
            Delete
          </button>
        </h3>

        <div class="blog-post">
          <h2 class="blog-post-title">
            <pre>{{ message.content }}</pre>
          </h2>
          <p class="blog-post-meta">
            {{ message.from }}, {{ new Date(message.sentAt).toLocaleString() }}
          </p>
        </div><!-- /.blog-post -->

        <div class="form-group">
          <a
            class="btn btn-link p-0"
            href="#"
            @click="replyTo(message.from, message.title, message.content)"
          >Reply</a>
          <a
            class="btn btn-link p-0 float-end"
            href="#"
            @click="download()"
          >Download</a>
        </div>
      </div><!-- /.blog-main -->
    </div><!-- /.row -->
  </main>
</template>

<style>
.blog-post {
  margin-bottom: 4rem;
}
.blog-post-title {
  margin-bottom: .25rem;
  font-size: 2.5rem;
}
.blog-post-meta {
  margin-bottom: 1.25rem;
  color: #999;
}
pre {
    white-space: pre-wrap;       /* Since CSS 2.1 */
    white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
    white-space: -pre-wrap;      /* Opera 4-6 */
    white-space: -o-pre-wrap;    /* Opera 7 */
    word-wrap: break-word;       /* Internet Explorer 5.5+ */
}
</style>
