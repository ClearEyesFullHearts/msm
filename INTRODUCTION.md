# BASICS

### Encryption/Decryption
Encryption is the process of converting a text into a version that is unreadable by anyone. Decryption is the reverse process. 

### Keys
A key is a piece of data (a random number, a password, a text etc...) that is used for encryption and/or decryption.  

# How that works

## Symmetric key encryption
With symmetric keys encryption, the same key is used to encrypt and decrypt the message. Think of it as a shared password between you and your target. It implies that more than one entity (you and every one you want to talk to in our case) are responsible for keeping the key actually secret, which is quite problematic for long lasting communications.

## Asymmetric key encryption
Asymmetric keys are composed of 2 parts, a secret key (SK) and a public key (PK). As the name implies a SK is secret and is never shared with anyone, that responsibility is only on the owner of the SK, while a PK is public and shared with everyone.
The PK is used to encrypt the message and then it can only be decrypted by the SK. The method to talk to someone is easy, get its PK, encrypt your message and send it to them. The owner of the SK is the only one able to decrypt it. When they want to reply to you they get your PK, encrypt their message and send it to you and you are, then, the only one able to decrypt their message with your SK. 

# ySyPyA
By now you should have understood that ySyPyA use asymmetric key encryption (well a mix of symmetric and asymmetric actually, called hybrid encryption) to ensure the privacy of your conversation.  
With the public engine you can generate asymmetric keys (a key pair) and use them to allow anyone to write to you in a secured way.  
Our free tier is mostly a public keys directory with added tools to make the sharing of messages easier. The file that is created and downloaded when you create your account is your Secret Key, it is not shared with us and you are responsible for its integrity and security.  
  
If you're interested in more technical details, visit the README (coming soon)