<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useMessagesStore } from '@/stores';

const authStore = useAuthStore();
const messagesStore = useMessagesStore();
messagesStore.message = {};
messagesStore.targetMessage = {};

const { user } = storeToRefs(authStore);
</script>

<template>
  <div v-if="user">
    <h1>Hi @{{ user.user.username }}!</h1>
    <p>
      Welcome to ySyPyA.<br>
      ySyPyA is a safe and anonymous mail box, nothing more, nothing less.
    </p>
    <p>
      As you can see we respect too much the work of
      professional graphic designer to try and do it ourself. Sorry for the eyesore!
    </p>
    <hr>
    <h2>Mission statement</h2>
    <p>
      Privacy should be accessible to everyone for free and that's our purpose here:
      to empower you to take your privacy and security in your own hands.
    </p>
    <p>
      By leveraging well known cryptographic mechanism we offer you a platform to communicate
      with others in a private and anonymous manner. We don't know you,
      we don't know what you are talking about and we cannot know
      even if we did want to (or if we were asked by TPTB.)
    </p>
    <p>
      Your security is your responsability.
    </p>
    <h2>Principles</h2>
    <p>
      If you're unfamiliar with encryption, you can read a very short introduction
      <a
        href="https://github.com/ClearEyesFullHearts/oldies/blob/master/PKI-server-node/KNOWLEDGE.md"
        target="_blank"
      >here</a>
    </p>
    <p>
      <ul>
        <li>
          The account's owner is the owner of the Secret Key,
          the file that you downloaded when you created the account.<br>
          There is no recovery mechanism, if you lose the SK, the account is lost.<br>
        </li>
        <li>
          You will be asked to log to your account (re-upload the SK) every 15 minutes.<br>
          The remaining time until you do is diplayed in the top right corner.
        </li>
        <li>
          Once a message content is read it is deleted from our side after 2 minutes.
        </li>
        <li>
          Every part of the messages is encrypted on your side
          and re-encrypted on our side for storage.<br>
          No message information is transported or stored in clear text.
        </li>
        <li>
          If your account hasn't been active (hasn't opened a message) for 30 days,
          it will be incinerated
        </li>
        <li>
          If you press the big red button up top (and confirm), your account will be
          incinerated and nothing will remain on our side.
        </li>
      </ul>
    </p>
    <br>
    <h1>FAQ</h1>
    <hr>
    <h4>What is the MemoryBox?</h4>
    <h4>Why can't I see the messages I sent?</h4>
    <h4>What kind of data do you keep?</h4>
    <h4>What next?</h4>
    <p>
      <router-link to="/messages">
        Go to your inbox
      </router-link>
    </p>
  </div>
</template>
