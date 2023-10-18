<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useWorkerStore } from '@/stores';

const authStore = useAuthStore();
const wokerStore = useWorkerStore();
const { user } = storeToRefs(authStore);
const { installable, installed } = storeToRefs(wokerStore);

function installApp() {
  wokerStore.install();
}
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
          <h1 translate="no">
            Hi @{{ user.user.username }}!
          </h1>
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
            We believe that everyone should have access to privacy at no cost,
            and that's precisely our mission:
            to enable you to assume control of your own privacy and security.
          </p>
          <p>
            Through the utilization of established cryptographic methods,
            we provide you with a platform for confidential and anonymous communication.
            We remain entirely unaware of your identity, the content of your discussions,
            and would not be able to gain such knowledge even if we were compelled to do so
            (by any authoritative entity).
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
          <h3>Installation</h3>
          <p v-if="!installed && installable">
            You can opt to install this service as an app if you like.
            <button
              class="btn btn-success ms-1"
              @click="installApp()"
            >
              Install ySyPyA
            </button>
          </p>
          <p v-if="!installed && !installable">
            If you activate notifications in the top right corner,
            you may become eligible to install this service as an application.<br>
            We are unable to ascertain whether your browser and operating system combination
            allows for the installation of this app. To find out if your specific setup can
            accommodate a Progressive Web App and how to do so,
            you'll need to search for information online.<br>
            It's possible that you've already successfully installed this app on your device.
            If that's the case, congratulations, and thank you!
          </p>
          <p v-if="installed">
            Congratulations and thank you for installing this app.
          </p>
          <h3>The obvious</h3>
          <p>
            <ul>
              <li>
                In the top right corner are all pages related to your account.<br>
                There you'll find your own profile data to be verified by others
                and your vault.<br>
                Start by visiting your profile, download your own security file,
                go back to the home page and upload it to verify yourself.<br>
                The Incinerate button deletes your account.
              </li>
              <li>
                In your vault you can download your secret key as a file, this file can be used
                instead of your password.
                (you'll be prompted to upload this file if you fail to write the right password)<br>
                If you empty your vault you'll be able to change your password and set
                a password killswitch up.<br>
                If you empty your vault without replacing your password
                the secret key file is the only way to connect.<br>
              </li>
              <li>
                The "Connect" button on the home page allows you to receive
                and send instant messages to other connected users.<br>
                You need to be validated on-chain to be able to connect.<br>
                If you are not connected you can only send or receive "mail" messages.
              </li>
              <li>
                The "Accept Notifications" switch enables us to send you notifications even
                if you're not connected or even logged in. When enabled it will prompt you
                to block or allow notifications for this site, click "Allow".
              </li>
              <li>
                All conversations are temporary and are lost as soon as you log out.<br>
                "Mail" messages are kept encrypted on our side until you read them after which
                they are deleted (after 30 seconds),
                instant messages are never kept on our side.<br>
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
            RSA encryption is <i>as far as we know</i> unbreakable, and we do not retain
            any data that could establish a connection between you and your account
            or the individuals you are communicating with.
          </p>
          <p>
            It means that if someone wants to know who you're talking to
            and what you say, it is far easier to have physical surveillance or hack
            into your devices. To prevent that is your responsability. :)
          </p>
          <h4>What's all this with verification?</h4>
          <p>
            The most vulnerable point of attack is the potential compromise of our system
            by an unauthorized party who could replace the public keys we issue with their own,
            thereby gaining the ability to decrypt all communication.
          </p>
          <p>
            To fortify security, we employ an automatic verification system that embeds
            your public keys in an immutable medium, such as the blockchain.
            This ensures that each time you connect to our platform,
            you can verify that the public keys provided by the server match
            those that were originally inscribed and are consistent with your own keys.<br>
            The same rigorous process applies to all user accounts.
          </p>
          <p>
            Individuals independently validate their keys,
            fostering mutual trust among all participants.
          </p>
          <p>
            In addition to the automatic verification, we have also implemented
            a manual verification system. You can share a security code directly with your contacts
            or through a security file.
            If the security code you transmit matches the code in the contact list
            of the recipients, you can be confident that your conversation remains secure.
          </p>
          <h4>Why can't I write longer messages?</h4>
          <p>
            It gives us better control about what transit through our system.
          </p>
          <p>
            The maximum size itself (446 ASCII characters) comes from the number of Bytes
            you can encrypt with a 4096 RSA public key.
          </p>
          <h4>I've allowed/blocked notifications and I changed my mind?</h4>
          <p>
            On Chrome go to "Settings > Privacy & security > Site settings > Notifications",
            find beta.ysypya.com and change the setting to what you want.
          </p>
          <p>
            On Firefox go to "Settings > Privacy & security > Permissions:Notifications",
            click on settings, find beta.ysypya.com and change the setting to what you want.
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
                Group chat
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
