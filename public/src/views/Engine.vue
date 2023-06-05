<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { ref } from 'vue';
import CryptoHelper from '@/lib/cryptoHelper';

const mycrypto = new CryptoHelper();

const writingSchema = Yup.object().shape({
  content: Yup.string()
    .required('Message text is required'),
});
const publicKeyInput = ref(null);
const publicUploadBtn = ref(null);
const secretKeyInput = ref(null);
const secretUploadBtn = ref(null);
const challengeKeyInput = ref(null);
const challengeUploadBtn = ref(null);
const targetText = ref(null);
let publicKey;
let secretKey;
let challenge;

async function loadTextFromFile(ev) {
  return new Promise((resolve) => {
    const file = ev[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.readAsText(file);
  });
}

function downloadFile(name, text) {
  const a = window.document.createElement('a');
  a.href = window.URL.createObjectURL(new Blob([text]));
  a.download = name;

  // Append anchor to body.
  document.body.appendChild(a);
  a.click();

  // Remove anchor from body
  document.body.removeChild(a);
}

async function onGenerateKey() {
  const { PK, SK } = await mycrypto.generateKeyPair();
  downloadFile('private.pem', SK);
  downloadFile('public.pem', PK);
}

async function onWritingSubmit(values) {
  const { content } = values;

  const { passphrase, iv, token } = await mycrypto.symmetricEncrypt(content);
  const clearPass = window.atob(passphrase);
  const cryptedPass = await mycrypto.publicEncrypt(publicKey, clearPass);

  const message = {
    iv,
    passphrase: cryptedPass,
    token,
  };

  downloadFile('message.ysypya', JSON.stringify(message));
}
async function onUploadPublic() {
  publicKeyInput.value.click();
}
async function onPublicFilePicked(evt) {
  const { files } = evt.target;
  publicKey = await loadTextFromFile(files);
  publicUploadBtn.value.disabled = true;
  const [{ name }] = files;
  publicUploadBtn.value.innerHTML = `${name} loaded!`;
}

async function onReadingSubmit() {
  if (!challenge || !challenge.length || !secretKey || !secretKey.length) return;

  const objChallenge = JSON.parse(challenge);
  const clearText = await mycrypto.resolve(secretKey, objChallenge);

  targetText.value.innerHTML = clearText;
}
async function onUploadSecret() {
  secretKeyInput.value.click();
}
async function onSecretFilePicked(evt) {
  const { files } = evt.target;
  secretKey = await loadTextFromFile(files);
  secretUploadBtn.value.disabled = true;
  const [{ name }] = files;
  secretUploadBtn.value.innerHTML = `${name} loaded!`;
}
async function onUploadChallenge() {
  challengeKeyInput.value.click();
}
async function onChallengeFilePicked(evt) {
  const { files } = evt.target;
  challenge = await loadTextFromFile(files);
  challengeUploadBtn.value.disabled = true;
  const [{ name }] = files;
  challengeUploadBtn.value.innerHTML = `${name} loaded!`;
}

</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col">
        <div class="card m-3">
          <h4 class="card-header">
            Writing
          </h4>
          <div class="card-body">
            <div class="card m-3">
              <h4 class="card-header">
                Process
              </h4>
              <div class="card-body">
                <ul>
                  <li>Click on "Upload Key" and choose your recipient's Public Key file</li>
                  <li>Write your text</li>
                  <li>Click on "Encrypt"</li>
                  <li>Send the resulting (downloaded) file to your recipient</li>
                </ul>
              </div>
            </div>
            <div class="card m-3">
              <h4 class="card-header">
                Encrypt message
              </h4>
              <div class="card-body">
                <Form
                  v-slot="{ errors, isSubmitting }"
                  :validation-schema="writingSchema"
                  @submit="onWritingSubmit"
                >
                  <div class="form-group">
                    <div>
                      <div>
                        <button
                          ref="publicUploadBtn"
                          class="btn btn-primary"
                          @click="onUploadPublic()"
                        >
                          Upload target Public Key
                        </button>
                        <input
                          ref="publicKeyInput"
                          hidden
                          type="file"
                          style="opacity: none;"
                          @change="onPublicFilePicked"
                        >
                        <div class="invalid-feedback">
                          {{ errors.publicKey }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <div>
                      <div>
                        <Field
                          name="content"
                          autocomplete="off"
                          as="textarea"
                          cols="30"
                          rows="10"
                          class="form-control"
                        />
                        <div class="invalid-feedback">
                          {{ errors.content }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <button
                      class="btn btn-success"
                      :disabled="isSubmitting"
                    >
                      <span
                        v-show="isSubmitting"
                        class="spinner-border spinner-border-sm mr-1"
                      />
                      Encrypt
                    </button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card m-3">
          <h4 class="card-header">
            Reading
          </h4>
          <div class="card-body text-center">
            <p>
              If you don't have a key pair, click on "Generate Keys"
              and send the "public.pem" file to everyone that wants to
              communicate safely with you
            </p>
            <button
              class="btn btn-sm btn-success"
              @click="onGenerateKey()"
            >
              Generate Keys
            </button>
          </div>
          <div class="card-body">
            <div class="card m-3">
              <h4 class="card-header">
                Process
              </h4>
              <div class="card-body">
                <ul>
                  <li>Click on "Upload Key" and choose your Secret Key file ("secret.pem")</li>
                  <li>
                    Click on "Upload Message" and
                    choose the encrypted message file ("message.ysypya")
                  </li>
                  <li>Click on "Decrypt"</li>
                  <li>Read the message and refresh the page (hit F5) to clear it</li>
                </ul>
              </div>
            </div>
            <div class="card m-3">
              <h4 class="card-header">
                Decrypt message
              </h4>
              <div class="card-body">
                <Form
                  v-slot="{ isSubmitting }"
                  @submit="onReadingSubmit"
                >
                  <div class="form-group">
                    <div>
                      <div>
                        <button
                          ref="secretUploadBtn"
                          class="btn btn-primary"
                          @click="onUploadSecret()"
                        >
                          Upload Key
                        </button>
                        <input
                          ref="secretKeyInput"
                          hidden
                          type="file"
                          style="opacity: none;"
                          @change="onSecretFilePicked"
                        >
                        <button
                          ref="challengeUploadBtn"
                          class="btn btn-primary float-right"
                          @click="onUploadChallenge()"
                        >
                          Upload Message
                        </button>
                        <input
                          ref="challengeKeyInput"
                          hidden
                          type="file"
                          style="opacity: none;"
                          @change="onChallengeFilePicked"
                        >
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <p>
                      <pre ref="targetText" />
                    </p>
                    <button
                      class="btn btn-success"
                      :disabled="isSubmitting"
                    >
                      <span
                        v-show="isSubmitting"
                        class="spinner-border spinner-border-sm mr-1"
                      />
                      Decrypt
                    </button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
