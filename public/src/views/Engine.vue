<script setup>
import { ref } from 'vue';
import CryptoHelper from '@/lib/cryptoHelper';

const mycrypto = new CryptoHelper();

const publicKeyInput = ref(null);
const publicUploadBtn = ref(null);
const signatureKeyInput = ref(null);
const signatureUploadBtn = ref(null);
const contentText = ref(null);
const extractKeyInput = ref(null);
const secretKeyInput = ref(null);
const secretUploadBtn = ref(null);
const challengeKeyInput = ref(null);
const challengeUploadBtn = ref(null);
const verifyKeyInput = ref(null);
const verifyUploadBtn = ref(null);
const targetText = ref(null);
let publicKey;
let secretKey;
let signingKey;
let challenge;
let verifyKey;

function encodeText(str) {
  return str.split('')
    .map((char) => {
      const charCode = char.charCodeAt(0);
      return charCode > 127 ? encodeURIComponent(char) : char;
    })
    .join('');
}
function decodeText(str) {
  return decodeURIComponent(str);
}
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
  const { PK: signPK, SK: signSK } = await mycrypto.generateSignatureKeyPair();
  const skFileContent = `${SK}${CryptoHelper.SEPARATOR}${signSK}`;
  const pkFileContent = `${PK}${CryptoHelper.SEPARATOR}${signPK}`;
  downloadFile('private.pem', skFileContent);
  downloadFile('public.pem', pkFileContent);
}
async function onExtractKey() {
  extractKeyInput.value.click();
}
async function onExtractFilePicked(evt) {
  const { files } = evt.target;
  const keys = await loadTextFromFile(files);
  const [key, signKey] = keys.split(CryptoHelper.SEPARATOR);
  const pk = await mycrypto.getPublicKey(key);
  let pkFileContent = pk;
  if (signKey) {
    const signPk = await mycrypto.getSigningPublicKey(signKey);
    pkFileContent = `${pk}${CryptoHelper.SEPARATOR}${signPk}`;
  }
  downloadFile('public.pem', pkFileContent);
}

async function onWritingSubmit() {
  const content = contentText.value.value;

  const { passphrase, iv, token } = await mycrypto.symmetricEncrypt(encodeText(content));
  const clearPass = window.atob(passphrase);
  const cryptedPass = await mycrypto.publicEncrypt(publicKey, clearPass);

  const message = {
    iv,
    passphrase: cryptedPass,
    token,
  };
  if (signingKey) {
    const signature = await mycrypto.sign(signingKey, content);
    message.signature = signature;
  }

  downloadFile('message.ysypya', JSON.stringify(message));
}
async function onUploadPublic() {
  publicKeyInput.value.click();
}
async function onPublicFilePicked(evt) {
  const { files } = evt.target;
  const keys = await loadTextFromFile(files);
  const [key] = keys.split(CryptoHelper.SEPARATOR);
  publicKey = key;
  publicUploadBtn.value.disabled = true;
  const [{ name }] = files;
  publicUploadBtn.value.innerHTML = `${name} loaded!`;
}

async function onUploadSignature() {
  signatureKeyInput.value.click();
}
async function onSignatureFilePicked(evt) {
  const { files } = evt.target;
  const keys = await loadTextFromFile(files);
  const [_, signKey] = keys.split(CryptoHelper.SEPARATOR);
  signingKey = signKey;
  signatureUploadBtn.value.disabled = true;
  const [{ name }] = files;
  signatureUploadBtn.value.innerHTML = `${name} loaded!`;
}

async function onReadingSubmit() {
  if (!challenge || !challenge.length || !secretKey || !secretKey.length) return;

  const objChallenge = JSON.parse(challenge);
  const clearText = await mycrypto.resolve(secretKey, objChallenge);
  let decodedText = decodeText(clearText);

  if (!objChallenge.signature) {
    decodedText = `Anonymous, there's no signature!\n\n${decodedText}`;
  }

  if (objChallenge.signature && verifyKey) {
    const { signature } = objChallenge;
    const isItSigned = await mycrypto.verify(verifyKey, decodedText, signature);
    if (isItSigned) {
      decodedText = `Signature check out!\n\n${decodedText}`;
    } else {
      decodedText = `Signature don't match your key!\n\n${decodedText}`;
    }
  }

  targetText.value.innerHTML = decodedText;
}
async function onUploadSecret() {
  secretKeyInput.value.click();
}
async function onSecretFilePicked(evt) {
  const { files } = evt.target;
  const keys = await loadTextFromFile(files);
  const [key] = keys.split(CryptoHelper.SEPARATOR);
  secretKey = key;
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
async function onUploadVerify() {
  verifyKeyInput.value.click();
}
async function onVerifyFilePicked(evt) {
  const { files } = evt.target;
  const keys = await loadTextFromFile(files);
  const [_, verifKey] = keys.split(CryptoHelper.SEPARATOR);
  verifyKey = verifKey;
  verifyUploadBtn.value.disabled = true;
  const [{ name }] = files;
  verifyUploadBtn.value.innerHTML = `${name} loaded!`;
}

</script>

<template>
  <div class="container-fluid">
    <h1 class="text-center">
      ySyPyA
    </h1>
    <h2 class="text-center">
      RSA Encryption/Decryption Engine
    </h2>
    <div class="card-body text-center">
      <p>
        If you don't have a key pair, click on "Generate Keys"
        and send the "public.pem" file to everyone that wants to
        communicate safely with you
      </p>
      <p>
        If you only have your Secret Key, from our registering process for example,
        click on "Extract PK from SK"
        to get your Public Key
      </p>
      <p>
        If you have no idea what we are talking about here, report to the home page
        or read that very short introduction:
        <a
          href="https://github.com/ClearEyesFullHearts/msm/blob/main/INTRODUCTION.md"
          target="_blank"
        >encrypted communication intro.</a>
      </p>
      <button
        class="btn btn-sm btn-success"
        @click="onGenerateKey()"
      >
        Generate Keys
      </button>&nbsp;
      <button
        class="btn btn-sm btn-success"
        @click="onExtractKey()"
      >
        Extract PK from SK
      </button>

      <input
        ref="extractKeyInput"
        hidden
        type="file"
        style="opacity: none;"
        @change="onExtractFilePicked"
      >
    </div>
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
                  <li>
                    Click on "Upload Target Public Key" and choose your
                    recipient's Public Key file
                  </li>
                  <li>Write your text</li>
                  <li>
                    If you want to add your signature to the message,
                    click on "Upload your Secret Key to sign" and choose your own
                    Secret Key file ("secret.pem")
                  </li>
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
                <div class="form-group">
                  <div>
                    <div>
                      <button
                        ref="publicUploadBtn"
                        class="btn btn-primary btn-block"
                        @click="onUploadPublic()"
                      >
                        Upload Target Public Key
                      </button>
                      <input
                        ref="publicKeyInput"
                        hidden
                        type="file"
                        style="opacity: none;"
                        @change="onPublicFilePicked"
                      >
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <div>
                    <div>
                      <textarea
                        ref="contentText"
                        autocomplete="off"
                        cols="30"
                        rows="10"
                        class="form-control"
                      />
                      <!-- <Field
                        ref="contentText"
                        name="contentText"
                        autocomplete="off"
                        cols="30"
                        rows="10"
                        class="form-control"
                      /> -->
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <div>
                    <div>
                      <button
                        ref="signatureUploadBtn"
                        class="btn btn-primary btn-block"
                        @click="onUploadSignature()"
                      >
                        (optional) Upload your Secret Key to sign
                      </button>
                      <input
                        ref="signatureKeyInput"
                        hidden
                        type="file"
                        style="opacity: none;"
                        @change="onSignatureFilePicked"
                      >
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <button
                    class="btn btn-success"
                    @click="onWritingSubmit()"
                  >
                    Encrypt
                  </button>
                </div>
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
          <div class="card-body">
            <div class="card m-3">
              <h4 class="card-header">
                Process
              </h4>
              <div class="card-body">
                <ul>
                  <li>
                    Click on "Upload your Secret Key" and choose your Secret Key
                    file ("secret.pem")
                  </li>
                  <li>
                    Click on "Upload Message File" and
                    choose the encrypted message file ("message.ysypya")
                  </li>
                  <li>
                    If you want to verify that the sender is really
                    who they say they are, click on "Upload the sender's Public Key"
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
                <div class="form-group">
                  <div>
                    <div>
                      <button
                        ref="secretUploadBtn"
                        class="btn btn-primary btn-block"
                        @click="onUploadSecret()"
                      >
                        Upload your Secret Key
                      </button>
                      <input
                        ref="secretKeyInput"
                        hidden
                        type="file"
                        style="opacity: none;"
                        @change="onSecretFilePicked"
                      >
                    </div>
                    <div>
                      <button
                        ref="challengeUploadBtn"
                        class="btn btn-primary mt-2 btn-block"
                        @click="onUploadChallenge()"
                      >
                        Upload Message File
                      </button>
                      <input
                        ref="challengeKeyInput"
                        hidden
                        type="file"
                        style="opacity: none;"
                        @change="onChallengeFilePicked"
                      >
                    </div>
                    <div>
                      <button
                        ref="verifyUploadBtn"
                        class="btn btn-primary mt-2 btn-block"
                        @click="onUploadVerify()"
                      >
                        (optional) Upload the sender's Public Key
                      </button>
                      <input
                        ref="verifyKeyInput"
                        hidden
                        type="file"
                        style="opacity: none;"
                        @change="onVerifyFilePicked"
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
                    @click="onReadingSubmit()"
                  >
                    Decrypt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
