# Most Secured Mailbox
In this age of mass surveillance this project aims to offer an easy way to communicate privately thanks to cryptography.  

## Project
The main component of the project is actually the (very ugly) client side (powered by Vue.js v3) thanks to the [SubtleCrypto API](https://developer.mozilla.org/fr/docs/Web/API/SubtleCrypto) present in all browsers, that allows us to create RSA key pairs and encrypt/decrypt data without sharing any information in clear text with the back-end as is demonstrated by the "Engine" part of the website.  
The client side (very ugly) code is in the `./public` folder.  
The back-end (powered by Node.JS) mostly manage users and their public key as well as encrypted messages delivery and some specific behaviors.  
The back-end code is in the `./apps/main` folder.  
The datalayer uses MongoDB but will probably migrate to DynamoDB soon, the code is in the `./shared/datalayer` folder  

## Implementation
### Lexicon
#### key pair
We use a system of double key pairs, one pair for encryption/decryption and one pair for signing/verifying.  
The "Secret key" file is actually both secret keys appended one after the other separated by `----- SIGNATURE -----`. The first key is the decryption key and the second one is the signing key.  

#### challenge
A challenge is the main object that is shared between the client and the back-end.  
This is the result of hybrid encryption of the piece of data you want to send. The process is simple:  
- Generate a random password and initialization vector.
- encrypt the data with this password. (this is symmetric encryption)
- encrypt the password with the target public key. (this is asymmetric encryption)
- send the encrypted data (the token), the encrypted password (the passphrase) and the vector (the iv).
  
To "resolve" the challenge you go through those steps in reverse:
- decrypt the passphrase with your secret key, to get the password.
- use this password (and the iv) to decrypt the token, to get the data.

### Authentication
Authentication is achieved through a simple bearer token mechanism that is computed on the server side and sent to anyone trying to log for a username as a challenge, ensuring that only the owner of the secret key can decrypt and use the token.  
The secret used for that computation is the only secret really managed on the back-end side and as such is a big security risk.  
We mitigate that risk by verifying the user signature for all actions on its account (all PUT, POST and DELETE request.) to be sure that regarless of our authentication mechanism the user has access to the secret key relative to its account.  

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

## What's next
- Write tests lol
- Change datalayer to use dynamoDB
- Create the "Official" tier
- implement donations through coinbase (if it still exists)
- Use a lambda to for once a day cleaning