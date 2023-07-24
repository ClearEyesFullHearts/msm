<script setup>
import { useAuthStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';

const authStore = useAuthStore();
const mycrypto = new CryptoHelper();

function downloadFile(at, text) {
  const a = window.document.createElement('a');
  a.href = window.URL.createObjectURL(new Blob([text]));
  a.download = `@${at}.signature.ysypya`;

  // Append anchor to body.
  document.body.appendChild(a);
  a.click();

  // Remove anchor from body
  document.body.removeChild(a);
}

async function signHash() {
  const at = authStore.user.user.username;
  const signature = await mycrypto.sign(authStore.signing, authStore.publicHash, true);
  const obj = {
    at,
    signature,
  };
  downloadFile(at, JSON.stringify(obj));
}

</script>

<template>
  <div class="card m-3">
    <h4 class="card-header">
      TL/DR
    </h4>
    <div class="card-body">
      <ul>
        <li>
          Send/show your security hash to the people who wants to verify your identity by comparing
          with what they have in their contact list
        </li>
        <li>
          Or download the verification file and send it to them to add you in their contact list
          and verify your identity at the same time.
        </li>
        <li>
          Use another channel for this sharing. Do not use ySyPyA to share that information.
          Use emails, whatsapp, signal or anything else but, I repeat, <b>do not</b> use
          this mail service for this operation.
        </li>
      </ul>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Profile
    </h4>
    <div class="card-body text-center">
      <label>Username:</label>
      <h4>@{{ authStore?.user?.user?.username }}</h4>
      <label>Security Hash:</label>
      <h4>{{ authStore?.publicHash }}</h4>
      <br>
      <button
        class="btn btn-primary"
        @click="signHash()"
      >
        Download a signed version of your security hash for sharing
      </button>
    </div>
  </div>

  <div class="card m-3">
    <h4 class="card-header">
      Full explanation
    </h4>
    <div
      class="card-body"
    >
      <p>
        To mitigate the risk of a man-in-the-middle attack (someone controlling our server
        and replacing user's public keys by its own to be able to read all the messages) we
        display here a hash of your own public keys.
      </p>
      <p>
        This hash is computed from your public keys, which are re-extracted
        from your private keys, each time you login.
      </p>
      <p>
        If someone share its hash with you and it matches the computed hash of
        the public keys coming from the server you can be sure that your communication is secured,
        even if the server is compromised.
      </p>
      <p>
        The contact list let's you see the hash (computed from the server's keys) of users
        so you can verify that it matches the one that a user you know has shared with you.
      </p>
      <p>
        You can also create a verifying file. This file contains a signed version of this hash and
        can be used in the contact list to add a user and verify them at the same time.
      </p>
      <p>
        Since the risk we try to mitigate assumes that the server is malicious, it follows
        that you need to share the verifying information through any other (safe) channel.
      </p>
    </div>
  </div>
</template>
