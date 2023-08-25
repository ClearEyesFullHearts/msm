# Most Secured Mailbox
In this age of mass surveillance this project aims to offer an easy way to communicate privately thanks to cryptography.  
https://beta.ysypya.com/  

## Project
The main component of the project is actually the (very ugly) client side (powered by Vue.js v3) thanks to the [SubtleCrypto API](https://developer.mozilla.org/fr/docs/Web/API/SubtleCrypto) present in all browsers, that allows us to create RSA key pairs and encrypt/decrypt data without sharing any information in clear text with the back-end as is demonstrated by the "Engine" part of the website.  
The client side code is in the `./public` folder.  
  
The front-end is hosted in a public AWS S3 bucket as a static website.  
  
The back-end (powered by Node.JS) mostly manage users and their public key as well as encrypted messages delivery and some specific behaviors.  
The back-end code is in the `./apps/main` folder.  
The datalayer uses DynamoDB with [Dynamoose](https://www.npmjs.com/package/dynamoose), the code is in the `./shared/dynamolayer` folder.  
The docker file for the back-end is in `./docker/files`.  
  
The back-end is hosted by AWS in ECS Fargate, deployed through the Cloud Formation template in `./aws`.  
What is not created by the template are:
- The dynamoDB Table
- The secrets managed by AWS Secret Manager and used in `./shared/secrets`
- The Docker Image in the public AWS container registry.
- The Route 53 DNS "A" record to the Load Balancer (which I should add) 

The smart contract (written in Solidity) used for automatic validation is in `./chainValidation`. It is still using the Sepolia testnet for the moment and not the Ethereum mainnet.  
The user validation code used in the back-end is in `./shared/validator`.  

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

### Authentication
Authentication is achieved through a simple bearer token mechanism that is computed on the server side and sent to anyone trying to log for a username as a challenge, ensuring that only the owner of the secret key can decrypt and use the token.  
The secret used for that computation is the only secret really managed on the back-end side and as such is a big security risk.  
We mitigate that risk by verifying the user signature for all actions on its account (all PUT, POST and DELETE request.) to be sure that regardless of our authentication mechanism the user has access to the secret key relative to its account.  

### User account
A user is created with its username, its encryption public key and its verifying public key.  
The user creation is easy and the login mechanism is not intuitive for first timer as such we expect a lot of lost account, so users are created as inactive and deleted after 10 minutes of inactivity.  
The only activity we keep on an account is the last time it opened a message which is why the new users have to open the first system message to activate their account.  
The only metadata available on an account are related to the messages it receives, we don't keep any informations on messages sent.  
Once a day every account that has never been activated or without activity for the last 30 days are destroyed with every data related to it.  
When an activated account is destroyed its username is unusable for 90 days, just to avoid too many username collisions and mistaken identity.  

### Messages
The client is supposed to send 3 pieces of information to send a message:
- the target username in clear text
- the title of the message encrypted
- the content of the message encrypted
  
We add the sender identification information (the "From" part) to the message during our own encryption.  
We cannot be sure that a joker wouldn't try to send anything in clear text to us though so we have some mechanism to be sure not to store any information we do not want to have.  
First the format of the title and the content of the message is highly controlled. Since the public key of the target is directly used to encrypt those informations we know that the resulting data should be a base64 encoded string with exactly 684 characters, for both. (unfortunately or not it also limits the size of the content that can be sent to 446 bytes.)  
Second every messages are separated as a header and a full object, each stored as a challenge, ensuring that everything is encrypted at least once.  
The header contains only the sender information, the title of the message and the time it was sent and is used for display in the inbox. The full object adds the content of the message and once it has been requested by the user it triggers the deletion of the message after 2 minutes.  

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
- go to the `./public` folder and setup the project by creating a `.env.production` file
```
cd public/
npm install
touch .env.production
```
- add the environment variables in the file
```
VITE_API_URL=https://api.ysypya.com
VITE_CHAIN_NETWORK=sepolia
VITE_CHAIN_API_KEY=hZOfL11C3G4een-0wzE5lCsRn2o-EAN9
VITE_CHAIN_CONTRACT=0xeCb67f9705110bf703a0E34CA04749e46823c3be
```
- build the project with the script there
```
./builder.sh
```
- go to the `./trust` folder and start the serve.js script
```
cd ../trust/
node serve.js
```
- Go to http://localhost:3000 in your browser and then you can be sure that the client code has not been tampered with.

I think it should be possible to write a Chrome and/or a Firefox extension to automatically validate that the files coming from the server in the browser match the repository, which would really help to use the site on mobile. I need to dig deeper into that.  
  
For the truly paranoid, you can always copy the reader and writer code available in `./public/offline` to encrypt your messages on an air-gapped computer. ;)  
  
## What's next
- Use a lambda for once-a-day cleaning
- Create a password "kill switch"