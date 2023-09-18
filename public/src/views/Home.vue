<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

const { user } = storeToRefs(authStore);
</script>

<template>
  <div class="container pt-4 pb-4">
    <div class="row justify-content-center">
      <div class="col-md-10">
        <div v-if="user">
          <p>
            <router-link to="/conversations">
              Go to your conversations
            </router-link>
          </p>
          <h1>Hi @{{ user.user.username }}!</h1>
          <p>
            Welcome to ySyPyA.<br>
            ySyPyA is a secured, private and anonymous instant messaging system,
            nothing more, nothing less.
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
          <h2>Features</h2>
          <p>
            If you're unfamiliar with encryption, you can read a very short introduction
            <a
              href="https://github.com/ClearEyesFullHearts/msm/blob/main/INTRODUCTION.md"
              target="_blank"
            >here</a>
          </p>
          <h3>The obvious</h3>
          <p>
            <ul>
              <li>
                The account's owner is the owner of the Secret Key,
                the file that you downloaded when you created the account.<br>
                There is no recovery mechanism, if you lose the SK, the account is lost.<br>
                Everyone who has access to a copy of the SK shares the account.<br>
              </li>
              <li>
                In the top right corner are all pages related to your account.<br>
                There you'll find your own profile data to be verified by others
                and your vault to upgrade to an official account.<br>
                Start by visiting your profile, download your own security file,
                go back to the home page and upload it to verify yourself.<br>
                The Incinerate button deletes your account.
              </li>
              <li>
                The "Connect" button on the home page allows you to receive
                and send instant messages to other connected users.<br>
                You need to be validated on-chain to be able to connect.<br>
                If you are not connected you can only send or receive "mail" messages.
              </li>
              <li>
                All conversations are temporary and are lost as soon as you log out.<br>
                "Mail" messages are kept encrypted on our side until you read them after which
                they are deleted (after 2 minutes), instant messages are never kept on our side.<br>
                No message information is transported or stored in clear text.
              </li>
            </ul>
          </p>

          <h3>The less obvious</h3>
          <p>
            <ul>
              <li>
                If your account hasn't been active (hasn't opened a message) for 30 days,
                it will be deleted.
              </li>
              <li>
                You can download an entire conversation in an encrypted format by clicking
                on the grey button in the top right of any conversation.<br>
                You'll then be able to reload it by clicking on the green button next to it.
              </li>
              <li>
                On log-in your credentials are only valid for 15 minutes after which you will be
                logged out.<br>
                You can reset the time by clicking on the countdown in the top right menu or
                directly activate the auto-reconnection.
              </li>
              <li>
                We've put in place an automatic verification system by leveraging
                the Ethereum blockchain.<br>
                By engraving a signed hash of your public keys on the blockchain
                everyone can easily check that you are the only one that can read messages
                sent to you using these keys.<br>
                The small shield next to your @ in the top right corner will appear in green once
                it is done.<br>
                Don't panic if it is not green, this process can be long or fail.
                As long as it is not successful, it will be retried each time you
                open a message.<br>
                If the shield is red, <b>do panic and contact an admin</b>.
              </li>
              <li>
                Your contacts will have a blue shield once they are validated.
              </li>
              <li>
                You can also validate the integrity of this website thanks to a Chrome Extension.
                <br>
                Got to https://chrome.google.com/webstore/category/extensions and search for
                "ySyPyA Verification Tool". Once installed you'll be able to check that no one
                interfered with the code you use.<br>
                You'll need to install "Kiwi Browser" if you're on Android.
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
          <h4>What's all this with verification?</h4>
          <p>
            The most obvious way we could be attacked is for someone to take control
            of our system to then replace the public keys you receive from us
            with their own, to be able to decrypt all messages.
          </p>
          <p>
            The automatic verification system consist of engraving your public keys in something
            immutable (the blockchain) so that each time you connect here,
            you check that the public keys you receive from the server
            are the same ones that were engraved and match yours.<br>
            Same thing for all the other accounts.
          </p>
          <p>
            Everyone checks its own keys, so that everyone can trust each other keys.
          </p>
          <p>
            We've also added a manual verification system where you can share a security code
            (directly or via a security file) with your contacts. If the security code that you send
            match the security code in the contact list of the people you sent it to,
            you can be sure that your conversation is secure.
          </p>
          <h4>Why can't I write longer messages?</h4>
          <p>
            It gives us better control about what transit through our system.
          </p>
          <p>
            The maximum size itself (446 ASCII characters) comes from the number of Bytes
            you can encrypt with a 4096 RSA public key.
          </p>
          <h4>What kind of data do you keep?</h4>
          <p>
            Someone with full access to our database can only know your @,
            the last day you read a message, your public keys, the number of messages in your Inbox,
            the number of "mail" messages you ever received and if you're online.
            We keep no other information.
          </p>
          <h4>What next?</h4>
          <p>
            <ul>
              <li>
                Peer to peer chat
              </li>
              <li>
                Password kill switch
              </li>
            </ul>
          </p>
          <p>
            <router-link to="/conversations">
              Go to your conversations
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
