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
          ySyPyA is an ecrypted instant messaging app, letting you write and
          share messages that cannot be read by anyone except you and your recipients
          through cryptography.
        </p>
        <p>
          If you have no idea about what are cryptography or "keys", we advise you to read that very
          short introduction:
          <a
            href="https://github.com/ClearEyesFullHearts/msm/blob/main/INTRODUCTION.md"
            target="_blank"
          >encrypted communication intro.</a>
        </p>
        <h4>ySyPyA is organized around three tiers:</h4>
        <ul>
          <li>
            <b>Public</b>
            <p>
              The public tier is our "Engine" page (top left).<br>
              From there you can encrypt and decrypt messages but you have to manage your own key pair
              and all your potential recipients' public keys, yourself.<br>
              Your encrypted messages have to be transported through another messaging service,
              like e-mails, Signal or Whatsapp.<br>
              This is mostly just for fun and help the public understand how encryption works.
            </p>
          </li>
          <li>
            <b>Burner</b>
            <p>
              The "burner" tier is when you create a simple account with us.<br>
              You access our messaging platform where we manage all accounts public keys
              so that you can search for other accounts and write encrypted messages to them
              as well as easily receive encrypted messages from others.<br>
              You still have to manage and secure your secret key.<br>
              Use it to have just one important conversation or topic
              for a limited time and then burn it.<br>
              For more informations on the "burner" tier, click on "Register"
              in the top right corner
              and create an account by following the instructions
              then sign in and go to the home page.
            </p>
          </li>
          <li>
            <b>Official</b>
            <p>
              The Official tier will allow you to trust us with your secret key's management,
              and be able to connect to your account with a simple password.<br>
              Your official account is there to stay and keep in touch with your contacts
              through the contact list and our verification system.<br>
              You'll be able to upgrade any account from "burner" to official freely.<br>
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
