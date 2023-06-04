<script setup>

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
                TL/DR
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
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card m-3">
          <h4 class="card-header">
            Reading
          </h4>
          <div class="card-body">
            <p>
              If you don't have a key pair, click on "Generate Keys"
              and send the "public.pem" file to anyone you want to communicate with
            </p>
            <button
              class="btn btn-sm btn-success"
            >
              Generate Keys
            </button>
          </div>
          <div class="card-body">
            <div class="card m-3">
              <h4 class="card-header">
                TL/DR
              </h4>
              <div class="card-body">
                <ul>
                  <li>Click on "Upload Key" and choose your Secret Key file ("secret.pem")</li>
                  <li>Click on "Upload Message" and choose the encrypted message file</li>
                  <li>Click on "Decrypt"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
