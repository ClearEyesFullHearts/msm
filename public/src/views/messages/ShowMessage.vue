<script setup>
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useMessagesStore } from '@/stores';

const messagesStore = useMessagesStore();
const router = useRouter();
const route = useRoute();
const id = route.params.id;
messagesStore.targetMessage = {};

let message = null;
({ message } = storeToRefs(messagesStore));
messagesStore.getMessage(id);

async function replyTo(from, reTitle) {
    messagesStore.targetMessage.at = from.substring(1);
    if(reTitle.length > 0) messagesStore.targetMessage.title = `Re: ${reTitle}`;
    await router.push('/messages/write');
}

async function download() {
  await messagesStore.downloadMessage();
}

</script>


<template>
  <router-link to="/messages" class="btn btn-link">Back to inbox</router-link>
    <main role="main" class="container">
      <div class="row">
        <div class="col-md-8 blog-main">
          <h3 class="pb-3 mb-4 font-italic border-bottom">
            {{ message.title }}
          </h3>
          <div class="blog-post">
            <h2 class="blog-post-title">{{ message.content }}</h2>
            <p class="blog-post-meta">{{ message.from }}, {{ new Date(message.sentAt).toLocaleString() }}</p>
          </div><!-- /.blog-post -->

        </div><!-- /.blog-main -->

      </div><!-- /.row -->

    </main>
    <div class="form-group">
        <a href="#" @click="replyTo(message.from, message.title)">Reply</a>
        <a class="float-right" href="#" @click="download()">Download</a>
    </div>
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
</style>