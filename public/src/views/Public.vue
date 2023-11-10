<script setup>
import config from '@/lib/config';

</script>

<template>
  <div class="container pt-4 pb-4">
    <div class="row justify-content-center">
      <div
        id="validationText"
      />
      <div class="col-md-10">
        <h1>Welcome to ySyPyA.</h1>
        <p>
          ySyPyA is an encrypted instant messaging app, letting you write and
          share messages that cannot be read by anyone except you and your recipients
          through cryptography.
        </p>
        <p>
          If you have no idea about what cryptography or "keys" are, we advise you to read that very
          short introduction:
          <a
            href="https://github.com/ClearEyesFullHearts/msm/blob/main/INTRODUCTION.md"
            target="_blank"
          >encrypted communication intro.</a>
        </p>
        <p>
          The "Engine" is a demo page of these cryptographic principles.
        </p>
        <h4>ySyPyA features:</h4>
        <ul>
          <li>
            <b>Messaging</b>
            <p>
              Write ephemeral messages to your contacts either instantly or as mail.<br>
              Nothing links a message to its sender and every message is deleted once read.
            </p>
          </li>
          <li>
            <b>Strong encryption</b>
            <p>
              Every piece of data exchanged between you and us is, at least, encrypted with
              a RSA 4096-bit key and signed with a RSA 1024-bit key.
            </p>
          </li>
          <li>
            <b>No record</b>
            <p>
              The only data we keep server side are your username, your public key,
              the unread encrypted messages and your encrypted contact list.<br>
              Nothing is stored out of memory client side so a simple page refresh makes
              all data disappear.<br>
            </p>
          </li>
          <li>
            <b>Users verification</b>
            <p>
              We offer 2 layers of users' integrity verification.<br>
              First, all users' public keys are certified through the Ethereum blockchain.<br>
              Second you can share a security file with your contact for a strong verification
              of your public keys.
            </p>
          </li>
          <li>
            <b>Password kill switch</b>
            <p>
              Enter your kill switch password on login and destroy all traces of your account.
            </p>
          </li>
          <li>
            <b>Site integrity</b>
            <p>
              A Chrome Extension is available for you to be sure that this website is what it claims
              to be, without external tampering.<br>
              You can find it in <a
                target="_blank"
                href="https://chrome.google.com/webstore/category/extensions?hl=fr"
              >Chrome Web Store</a>
              under the name "ySyPyA Verification Tool".
            </p>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <p class="text-center">
    Git commit: <span
      id="commitHash"
    >
      {{ config.COMMIT_HASH }}
    </span>
  </p>
</template>
