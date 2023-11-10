# Most Secured Mailbox
In this age of mass surveillance this project aims to offer an easy way to communicate privately thanks to cryptography.  
https://beta.ysypya.com/  

## Project
The main component of the project is actually the (very ugly) client side (powered by Vue.js v3) thanks to the [SubtleCrypto API](https://developer.mozilla.org/fr/docs/Web/API/SubtleCrypto) present in all browsers, that allows us to create RSA key pairs and encrypt/decrypt data without sharing any information in clear text with the back-end as is demonstrated by the "Engine" part of the website.  
It's a Progressive Web App that can be installed as a native app on most platform.  
The client side code is in the `./public` folder.  
  
The front-end is hosted in a public AWS S3 bucket as a static website.  
  
The back-end (powered by Node.JS) mostly manage users and their public key as well as encrypted messages delivery and some specific behaviors.  
The back-end code is in the `./apps/` and `./shared/` folder.  
`./apps/main` contains the REST API as the main entry point. The OpenAPI file describing the API is in `./apps/main/src/spec/`.  
`./apps/sns/notification` is a lambda triggered by an SNS event that try to notify users when they received a message, through web socket or web push.  
`./apps/sns/validation` is a lambda triggered by an SNS event that start the on-chain user validation.  
`./apps/clean/daily` contains cleanup code triggered once a day to removed dead data from the datalayer.  
`./apps/clean/account` and `./apps/clean/message` are lambdas triggered by the EventBridge scheduler to remove inactive account and read messages respectively.  
`./apps/ws` contains the lambdas that manage the web socket server.  
The datalayer uses DynamoDB with Single Table Design and [Dynamoose](https://www.npmjs.com/package/dynamoose), the code is in the `./shared/dynamolayer` folder.  
The docker files for the back-end are in `./docker/files`.  
  
The back-end is hosted by AWS through API Gateways for the main REST server and the web socket side, deployed through the master CloudFormation template in `./aws/templates`.  
What is not created by the templates are:
- The secrets managed by AWS Secret Manager and used in `./shared/secrets`
- The Docker containers in the AWS container registry.
- The hosted zone and the certificates used to create the domain names  
  
The deployment script is in `./aws/scripts`.  
  
Everything is traced through X-Ray, using a small wrapper in `./shared/tracing`.  

The smart contract (written in Solidity) used for automatic validation is in `./trust/chainValidation`. It is still using the Sepolia testnet for the moment and not the Ethereum mainnet.  
  
The code of the Chrome extension to verify the public client integrity is in `./trust/extension`.  
  
The whole system is tested through integration tests written in Gherkin on a test stack deployed in AWS that matches exactly the "production" stack.   
The tests can be found in `./integration`  
  
## Implementation
### Lexicon
#### key pair
We use a system of double key pairs, one pair for encryption/decryption and one pair for signing/verifying.  
The "Secret key" file is actually both secret keys appended one after the other separated by `----- SIGNATURE -----`. The first key is the decryption key and the second one is the signing key.  

#### challenge
A challenge is the main object that is shared between the client and the back-end.  
This is the result of hybrid encryption of the piece of data you want to send. The process is simple:  
- Generate a random password and initialization vector.
- encrypt the data with this password and the vector. (this is symmetric encryption)
- encrypt the password with the target public key. (this is asymmetric encryption)
- send the encrypted data (the token), the encrypted password (the passphrase) and the vector (the iv).
  
To "resolve" the challenge you go through those steps in reverse:
- decrypt the passphrase with your secret key, to get the password.
- use this password (and the iv) to decrypt the token, to get the data.

### User account
A user is created with its username, its encryption public key, its verifying public key and the signed hash of those keys.  
Users are created as inactive and deleted after 10 minutes of inactivity.  
The only activity we keep on an account is the last time it opened a message or opened a web socket connection, which is why the new users have to open the first system message to activate their account.  
The only metadata available on an account are related to the messages it receives and the user groups membership, we don't keep any informations on messages sent.  
The contact list is only stored as a challenge.  
Those minimal data are completed by the content of the vault and the attic (see below).  
Once a day every account that has never been activated or without activity for the last 30 days are destroyed with every data related to it.  
When an activated account is destroyed its username is unusable for 90 days, just to avoid too many username collisions and mistaken identity.  

### Authentication
Authentication is achieved through a simple bearer token mechanism that is computed on the server side and sent to anyone trying to log for a username as a challenge, ensuring that only the owner of the secret key can decrypt and use the token.  
The secret used for that computation is one of only two secrets really managed on the back-end side and as such is a big security risk.  
We mitigate that risk by verifying the user signature for all actions on its account (all PUT, POST and DELETE request) to be sure that regardless of our authentication mechanism the user has access to the secret key relative to its account.  

### The Vault & the Attic
The vault is designed to offer the possibility to store a user's Secret Key as securely as possible and enable the possibility to connect through a simple username/password scheme. It is also designed to allow the use of a password kill switch.  
The attic is the recipient of the public informations needed to allow this connection scheme.  

#### Setting up the Vault
- We have a password (PSW) and a password kill switch (PKS) and our Secret Key
- We hash `PSW` through a PBKDF2 algorithm with a random salt (RS1) to get our encryption hash (HP1)
- We hash `PSW` through a PBKDF2 algorithm with a random salt (RS2) to get our comparison hash (HP2)
- We hash `PKS` through a PBKDF2 algorithm with salt `RS2` to get our comparison kill switch hash (HKS)
- We encrypt our Secret Key with `HP1` as key and a random initialization vector (IV1) resulting in (ESK)
- We generate a random proof (RP)
- We encrypt `RP` with `HP2` as key and a random initialization vector (IV2) resulting in (EUP)
- We encrypt `RP` with `HKS` as key and vector `IV2` resulting in (EUK)
- We use our Secret Key to get the signature of `EUP` as (SUP)
- We use our Secret Key to get the signature of `EUK` as (SUK)
- We send `ESK`, `RS1`, `RS2`, `IV1`, `IV2`, `RP`, `SUP` and `SUK` to the server  
  
The server stores `RS2`, `IV2` and `RP` in clear in the attic.  
The server stores `ESK`, `RS1`, `IV1`, `SUP` and `SUK` in the vault. All data in the vault are encrypted server side with the other secret managed by the back end.  

#### Using the Vault
- We have a username and a password (PSW)
- We first ask the server for the username's attic, we get `RS2`, `IV2` and `RP`
- We hash `PSW` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash (HPU)
- We encrypt `RP` with `HPU` as key and vector `IV2` resulting in (EUU)
- We ask for the username's connection information with `EUU` in a header
- The server verifies `EUU` against the `SUK` signature using the user's Public Key
- If it matches, `PSW` was the kill switch and the user's account is deleted, if not we continue
- The server verifies `EUU` against `SUP` using the user's Public Key
- If it matches, `PSW` was the password and we get `ESK`, `RS1`, and `IV1` and the connection information encrypted using the user's Public Key (JWT)
- We hash `PSW` through a PBKDF2 algorithm with salt `RS1` to get our encryption hash (HP1)
- Using `HP1` We decrypt `ESK` with vector `IV1` to get our Secret Key back
- We then decrypt `JWT` with it to get our connection information  
  
### Messages
The client is supposed to send 3 pieces of information to send a message:
- the target username in clear text
- the title of the message encrypted
- the content of the message encrypted
  
We add the sender identification information (the "From" part) to the message during our own encryption.  
We cannot be sure that a joker wouldn't try to send anything in clear text to us though so we have some mechanism to be sure not to store any information we do not want to have.  
First the format of the title and the content of the message is highly controlled. Since the public key of the target is directly used to encrypt those informations we know that the resulting data should be a base64 encoded string with exactly 684 characters, for both. (unfortunately or not it also limits the size of the content that can be sent to 446 bytes.)  
Second every messages are separated as a header and a full object, each stored as a challenge, ensuring that everything is encrypted at least once.  
The header contains only the sender information, the title of the message and the time it was sent and is used for display in the inbox. The full object adds the content of the message and once it has been requested by the user it triggers the deletion of the message after some time.  

### Verification system
What we want to verify is that the Public Keys users use to encrypt and send messages to each other are really each others' keys, so that whatever happen to the messages only the owner of the secret key will be able to open them.  
For that goal we've set up a dual verification system:  
First we offer the chance for users to compare directly their Public Keys by displaying the hash of their keys in each account profile and of every other account in the contact list. The hash in the profile page is taken from the public keys that are re-extracted from the Private Keys on login, the ones in the contact list comes from the Public Keys stored on the server side. If a user show/send you its security hash and that it matches the one you see in your contact list, you can be sure that both set of Keys are the same.  
If you validate the match (in the contact list) every time you send a message to this user the keys you receive from the server will be verified again.  
Second when an account is validated (on the first time it opens a message), it sends its security hash to the Ethereum blockchain for recording.  
Every account verifies that the hash recorded on the blockchain matches its own Public Keys and so can trust that this hash can be trusted to verify every other accounts Public Keys when writing them a message.  

#### A personal note on the blockchain
The blockchain technology is a developer wet dream offering algorithmic trust and ownership in an adversarial system where you can't trust anything and everyone is a thief.  
The problem is that these problems have been resolved for centuries now through the rule of law in liberal systems of government and the power of coercion of the state by illiberal ones. The internet doesn't change that you own something because the law recognize you as the sole owner of that thing and not because a computer says so.  
Hence the only use case for that technology is when you want to escape the power of the state or at least can't trust or rely on it, so mostly for criminal or political activities.  
The crypto currency part of it is just stupid and only exists to scam and defraud people.  

### Instant messaging
The instant messaging capability is achieved thanks to a Web Socket server.  
It uses the same authentication mechanism than the REST API (JWT + signature) to establish the connection and all messages are client-side encrypted. Obviously they are never recorded on the server side.  
Soon it will only be the fallback mechanism if a peer to peer connection is impossible.  
  
## Trust issues
If you have read everything up to here you probably have some trust issues and I can't blame you. You shouldn't trust me.  
Like I said in the project description the heavy lifting is done on the client side, the Secret Key is never shared, never stored out of the memory and the messages are at no point sent in clear text, so I wrote a simple script for you to be able to use the client code directly from your machine:  
- `git clone https://github.com/ClearEyesFullHearts/msm.git`
- Get the commit hash of the online version in `./public/README.md`
- At the root of the project, checkout the code with this hash
```
git checkout [commit hash]
```
- Review the code in `./public` folder, be confident that it does what I say it does.
- go to the `./public` folder and build the project with the script there
```
./builder.sh
```
- Go to http://localhost:3000 in your browser and then you can be sure that the client code has not been tampered with.

I also created a Chrome Extension validating that the files you use in your browser match exactly those that are produced during the build phase of the client.  
You can find and download that extension by going to the [Chrome Web Store](https://chrome.google.com/webstore/category/extensions) and searching for "ySyPyA Verification Tool". Once it's installed you can go to the ySyPyA Home Page and follow the instructions.  
Chrome on mobile doesn't let you install extensions so you'll need to use the [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) that let's you do it.  
  
For the truly paranoid, you can always copy the reader and writer code available in `./public/offline` to encrypt your messages on an air-gapped computer. ;)  
  
## What's next
- performance improvements
- security
- easy spawning