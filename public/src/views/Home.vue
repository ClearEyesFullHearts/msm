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
  <div class="container pt-4 pb-4">
    <div class="row justify-content-center">
      <div class="col-md-10">
        <div v-if="user">
          <p>
            <router-link to="/messages">
              Go to your inbox
            </router-link>
          </p>
          <h1>Hi @{{ user.user.username }}!</h1>
          <p>
            Welcome to ySyPyA.<br>
            ySyPyA is a secured, private and anonymous mail box, nothing more, nothing less.
          </p>
          <p>
            As you can see we respect too much the work of
            professional graphic designers to try and do it ourself. Sorry for the eyesore!
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
              href="https://github.com/ClearEyesFullHearts/msm/blob/main/INTRODUCTION.md"
              target="_blank"
            >here</a>
          </p>
          <p>
            <ul>
              <li>
                The account's owner is the owner of the Secret Key,
                the file that you downloaded when you created the account.<br>
                There is no recovery mechanism, if you lose the SK, the account is lost.<br>
                Everyone who has access to a copy of the SK shares the account.<br>
              </li>
              <li>
                You will be asked to log to your account (re-upload the SK) every 15 minutes.<br>
                The remaining time until you have to is diplayed in the top right corner.
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
          <p>
            If you want more technical details about what we do, go
            <a
              href="https://github.com/ClearEyesFullHearts/msm/blob/main/README.md"
              target="_blank"
            >there</a>
          </p>
          <br>
          <h1>FAQ</h1>
          <hr>
          <h4>Why do you insist that my security is my responsibility?</h4>
          <p>
            RSA encryption is <i>as far as we know</i> unbreakable, and we keep no informations
            that could link you to your account or the accounts you're messaging with.
          </p>
          <p>
            It means that if someone wants to know who you're talking to
            and what you say, it is far easier to have physical surveillance or hack
            into your devices. To prevent that is your responsability. :)
          </p>
          <h4>What is the MemoryBox?</h4>
          <p>
            We understand that the "burnt after reading" character of the messages can be annoying
            and we cannot stop you from doing something dumb to circonvene it,
            like taking picture of the screen or some other stuff like that, so we provide you with
            a way to store messages as securely as possible should you want to.
          </p>
          <p>
            When you read a message you can download it as an ecrypted file
            that you can later upload in the memory box so that you can locally recreate your InBox.
            Only your Secret Key can decrypt those files.
          </p>
          <p>
            Obviously you shouldn't store those encrypted messages in the same place as your Secret Key.
          </p>
          <p>
            You can also decrypt those files from the ySyPyA public home page
            and create fake ones if you need to for whatever reasons.
          </p>
          <h4>Why can't I write longer messages?</h4>
          <p>
            Paedophiles, that's why.
          </p>
          <p>
            We want to ensure that no paedo-pornographic material transit directly through our system
            and the best way to do this is to limit the size of the messages.
          </p>
          <p>
            The maximum size itself (446 ASCII characters) comes from the number of Bytes
            you can encrypt with a 4096 RSA public key.
          </p>
          <h4>Why can't I see the messages I sent?</h4>
          <p>
            Because we don't keep track of that information.
            The sender data that you see in the messages you receive is added and encrypted
            just like the rest of the message's informations.
          </p>
          <p>
            You will soon be able to download a draft version before you send it and
            load it in the MemoryBox or load it up and send it from the regular place.
          </p>
          <h4>What kind of data do you keep?</h4>
          <p>
            Someone with full access to our database can only know your @,
            the last time you read a message, your public key and the number of messages in your Inbox.
            We keep no other information.
          </p>
          <p>
            An attacker with access to our system could know whose @ is sending messages to whom
            at the time it happens, since the sender information is added on our side before
            the final message encryption.
          </p>
          <p>
            An attacker with network surveillance capability could link your IP address
            to your @ on login, maybe?
          </p>
          <h4>What next?</h4>
          <p>
            <ul>
              <li>
                Lower the cost of hosting this thing.
              </li>
              <li>
                Adding the official tier.
              </li>
              <li>
                Enable donations through coinbase.
              </li>
            </ul>
          </p>
          <p>
            <router-link to="/messages">
              Go to your inbox
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
