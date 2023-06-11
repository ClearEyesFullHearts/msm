<script setup>
</script>

<template>
  <div class="container pt-4 pb-4">
    <div>
      <h1>Welcome to ySyPyA.</h1>
      <p>
        ySyPyA is an ecrypted message box, letting you write and
        share messages that cannot be read by anyone except you and your recipients
        through cryptography.
      </p>
      <p>
        If you have no idea about what are cryptography or "keys", we advise you to read that very
        short introduction:
        <a href="https://github.com/ClearEyesFullHearts/msm/blob/main/INTRODUCTION.md" target="_blank">encrypted communication intro.</a>
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
            like e-mails, Signal or Whatsapp.
          </p>
        </li>
        <li>
          <b>Free</b>
          <p>
            The free tier is when you create an account with us.<br>
            You access our messaging platform where we manage all accounts public keys
            so that you can search for other accounts and write encrypted messages to them
            as well as easily receive encrypted messages from others.<br>
            You still have to manage and secure your secret key.<br>
            For more informations on the free tier, click on "Register" in the top right corner and
            create an account by following the instructions then sign in and go to the home page.
          </p>
        </li>
        <li>
          <b>Paying (not available yet)</b>
          <p>
            The paying tier allows you to enjoy more mailbox-like functionalities like contacts list
            , block list, etc...<br>
            If you want we can also manage your secret key for you,
            making it available only through a password.<br>
            More informations on the paying tier will soon be available.
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>
