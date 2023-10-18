<script setup>
import { useAuthStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';

const authStore = useAuthStore();
const mycrypto = new CryptoHelper();

async function signHash() {
  const { id, username: at } = authStore.user.user;
  const signature = await mycrypto.sign(authStore.signing, authStore.publicHash, true);
  const obj = {
    id,
    at,
    hash: authStore.publicHash,
    signature,
  };
  FileHelper.download(`@${at}.signature.ysypya`, JSON.stringify(obj));
}

</script>

<template>
  <div class="row justify-content-center">
    <div class="col-md-8">
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
          <label translate="no">Username:</label>
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
            In order to minimize the risk of a man-in-the-middle attack,
            where an unauthorized entity controls our server and replaces users'
            public keys with their own to intercept messages,
            we provide a hash of your public keys here.
          </p>
          <p>
            This hash is derived from your public keys, which are extracted
            from your private keys each time you log in.
            If someone shares their hash with you and it matches the computed hash
            of the public keys from the server, you can be confident that your
            communication remains secure, even if the server is compromised.
          </p>
          <p>
            The contact list displays the hash (computed from the server's keys)
            of users, enabling you to verify that it matches the hash a known user
            has shared with you.
          </p>
          <p>
            You also have the option to create a verification file,
            containing a signed version of this hash, which can be used
            in the contact list to add a user and simultaneously verify their authenticity.
          </p>
          <p>
            Given that the risk we are addressing assumes a potentially malicious server,
            it is crucial to share verifying information through an alternative and secure channel.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
