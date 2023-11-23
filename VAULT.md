
# Password & kill switch connection scheme
## Routes
```
GET /attic/:username
- header: client ECDH public key (CPK)
- Response:
    - salt: A 16 bytes random salt either from storage or generated (RS1)
    - key: a generated ECDH public key by the server (SPK)
```
`GET /attic/:username` always respond with a valid response even if the user doesn't exists or has no vault.  

```
PUT /vault
- header: Bearer token (JWT)
- Request:
    - passSalt: A 32 bytes random salt for password hashing (RS1)
    - sessionSalt: A 32 bytes random salt for key derivation (RS2)
    - iv: a 16 bytes random initialization vector for transport encryption (IV1)
    - vault: password and kill switch encrypted with a temporary key and IV1
```
```
GET /login/:username
- header: concantenation of a user input password encrypted with a temporary key (EHP), a 16 bytes iv (IV2) and a 32 bytes salt (RS3)
- Response:
    - iv: A 16 bytes random initialization vector for transport encryption (IV3)
    - salt: A 32 bytes random salt for key derivation (RS4)
    - token: the bearer token encrypted with a temporary key and IV3 (EBT)
```
## Algorithm
### Setting up the Vault
1. We have an identified user, a password (PSW) and a password kill switch (PKS)
2. We hash `PSW` through a PBKDF2 algorithm with a random salt (RS1) to get our encryption hash (HP1)
3. We hash `PKS` through a PBKDF2 algorithm with salt `RS1` to get our comparison kill switch hash (HKS)
4. We generate an ECDH key pair (CSK & CPK)
5. We asks the server for our attic with `CPK` in the header (GET /attic/:username)
6. The server gets no information from storage or session for us
7. The server generates an ECDH key pair (SSK & SPK)
8. It computes a shared secret with `CPK` and `SSK` to get (TSS)
9. It stores `SPK`, `TSS` and a minimum TTL (MIN) of 0 seconds, a maximum TTL of 5 seconds (MAX) and a usage of 1 (USE) in session
10. It sends back `SPK` to us with a random salt
11. We compute `TSS` with `SPK` and `CSK`
12. We derive an ecryption key (DEK) through a HKDF algorithm from `TSS` and a random salt (RS2)
13. We encrypt `HP1` and `HKS` with `DEK` and a random initialization vector (IV1) to get (VAULT)
14. We send `RS1`, `RS2`, `IV1` and `VAULT` to the server (PUT /vault)
15. The server gets `SPK`, `TSS`, `MIN`, `MAX`, `USE` from our session
16. The server checks that the current timestamp is less than `MAX` and `USE` is greater than 0
17. It set `USE` to 0
18. The server derives `DEK` from `TSS` and `RS2` through a HKDF algorithm
19. The server decrypts `VAULT` with `DEK` and `IV1` to get `HP1`, `HKS` back
20. It stores `RS1` in clear
21. It stores `HP1` and `HKS` encrypted
22. The server deletes the session information `SPK`, `TSS`, `MIN`, `MAX`, `USE`

### Connection
#### Using the Vault with the correct password
1. We have a username and a user input password `PSW`
2. We generate an ECDH key pair (CSK & CPK)
3. We asks the server for our attic with `CPK` in the header (GET /attic/:username)
4. The server gets `RS1` from storage and no session information
5. The server generates an ECDH key pair (SSK & SPK)
6. It computes a shared secret with `CPK` and `SSK` to get (TSS)
7. It stores `SPK`, `TSS` and a minimum TTL (MIN) of 0 seconds, a maximum TTL of 5 seconds (MAX) and a usage of 1 (USE) in session
8. It sends back `SPK` and `RS1`
9. We compute `TSS` with `SPK` and `CSK`
10. We derive an ecryption key (DEK1) through a HKDF algorithm from `TSS` and a random salt (RS3)
11. We hash `PSW` through a PBKDF2 algorithm with salt `RS1` to get our comparison hash `HP1`
12. We encrypt `HP1` with `DEK1` and a random initialization vector (IV2) to get (EHP)
13. We ask for the username's connection information with `EHP`, `IV2` and `RS3` in a header (GET /login/:username)
14. The server gets `SPK`, `TSS`, `MIN`, `MAX`, `USE` from our session
15. The server checks that the current timestamp is less than `MAX` and `USE` is greater than 0
16. It set `USE` to 0
17. The server derives `DEK1` from `TSS` and `RS3` through a HKDF algorithm
18. It then decrypts `EHP` with `DEK1` and `IV2` to get `HP1` back
19. The server get our vault from storage and decrypts it
20. It compares `HP1` to our vault's kill switch hash `HKS`, it fails
21. It comparse `HP1` to our vault's password hash `HP1`, it succeeds
22. The server generates a bearer token (JWT)
23. The server deletes the session information `SPK`, `TSS`, `MIN`, `MAX`, `USE`
24. The server derives an ecryption key (DEK2) through a HKDF algorithm from `TSS` and a random salt (RS4)
25. It encrypts `JWT` with `DEK2` and a random initialization vector (IV3) to get (EBT)
26. The server sends back `EBT`, `RS4` and `IV3`
27. We derive `DEK2` through a HKDF algorithm from `TSS` and `RS4`
28. We decrypts `EBT` with `DEK2` and `IV3` to get `JWT` back
29. We're connected  
  
Of course steps 24 to 28 make no sense without the particularity of this project, namely that we send back data encrypted by the password along the JWT. With that particularity, an attacker could observe the response from GET /login/:username and use it to brute force the password and that explains why the response need to be encrypted too.  
Alternatively you could keep `TSS` alive and use this mechanism for all client-server exchange afterward by sending request body encrypted with a salt and iv and responding the same way.  

#### Using the Vault with the kill switch
- 1. We have a username and a user input kill switch `PKS`
- 2 to 19, `PKS` gives us `HKS` for our comparison hash
- 20. The server compares the user sent `HKS` to the vault's kill switch hash `HKS`, it succeeds
- 21. The account is deleted and the server send back a 400 HTTP error

#### Login failure
- 1. We have a username and a user input wrong password (WPS)
- 2 to 19, `WPS` gives us a wrong comparison hash (WCH)
- 20. The server compares the user sent `WCH` to the vault's kill switch hash `HKS`, it fails
- 21. The server compares the user sent `WCH` to the vault's password hash `HP1`, it fails
- 22. The server send back a 400 HTTP error
  
Note that in this case the session information is kept with `USE` set to 0.  

### Retries

#### First try  
- 1. We have a username and a user input wrong password (WPS)
- 2 to 20, `WPS` gives us a wrong comparison hash (WCH)
- 21. The server compares the user sent `WCH` to the vault's password hash `HP1`, it fails
- 22. The server send back a 400 HTTP error  
- The user repeat steps 13 (GET /login/:username) mutltiple times
- 23. (GET /login/:username)
- 24. The server gets `SPK`, `TSS`, `MIN`, `MAX`, `USE` from our session
- 25. `USE` is  0
- 26. The server send back a 400 HTTP error
- 27. (GET /login/:username)
- 28. The server gets `SPK`, `TSS`, `MIN`, `MAX`, `USE` from our session
- 29. timestamp is greater than `MAX`
- 30. The server send back a 400 HTTP error

#### Second try  
- 1. We have a username and a user input wrong password (WPS)
- 2. We generate an ECDH key pair (CSK & CPK)
- 3. We asks the server for our attic with `CPK` in the header (GET /attic/:username)
- 4. The server gets `RS1` from storage and the previous attempt session informations `SPK`, `TSS`, `MIN`, `MAX`, `USE`
- 5. The timestamp is greater than `MIN`
- 6. `USE` is 0
- 7. The server generates an ECDH key pair (SSK & SPK)
- 8. It computes a shared secret with `CPK` and `SSK` to get (TSS)
- 9. It calculates `MIN2` by adding x seconds from the previous attempt minimum TTL
- 10. It stores `SPK`, `TSS`, `MIN2`, a maximum TTL of 5 seconds (MAX) and a usage of 1 (USE) in session
- 11. It sends back `SPK` and `RS1`
- The password is wrong again, the user has not connected and the session is still present
- The user make multiple failed connection attempt
- Each (GET /attic/:username) call make the `MIN` timestamp be further in the future

#### Next try  
- 1. We have a username and a user input wrong password (WPS)
- 2. We generate an ECDH key pair (CSK & CPK)
- 3. We asks the server for our attic with `CPK` in the header (GET /attic/:username)
- 4. The server gets `RS1` from storage and the previous attempt session informations `SPK`, `TSS`, `MINx`, `MAX`, `USE`
- 5. The timestamp is smaller than `MINx`
- 6. The server generates an ECDH key pair (SSK & SPK)
- 7. The server generates a random salt (RSX)
- 8. It sends back `SPK` and `RSX`
- The user cannot connect with a wrong shared secret and a random salt `RSX`
- The user must wait for the `MINx` time to have elapsed to be able to connect  
  
## Attack vectors
Any password based connection scheme is by definition suceptible to a brute force attack and that's the main weakness we try to mitigate.  
The kill switch adds only one real issue in that you really do not want an attacker to be able to know if an input guess is the password or the kill switch before trying it. It's a simple statement but it adds a lot of complexity.  

### Brute forcing through the API
The session adjustable minimum TTL and maximum TTL let's you manage how you want to deal with repeated failed connection attempt to mitigate that risk.  
Infrastructure protection is supposed to take care of most of it anyway as well as DDoS attacks which is a real issue when your project is a communication channel like here.  
Note that with the kill switch enabled attackers have at least a 50% chance of destroying the account instead of finding the password with this technique.  

### Database leak
All sensitive information (the vault) is stored encrypted by a server side secret so there is no way to brute force passwords without knowing that secret.  
All users' personal data are supposed to be stored encrypted anyway because of GDPR so everyone should be able to encrypt any piece of data on a lawyer's notice and probably have an automatic encryption/decryption mechanism in their data layer.  

### Request / Response interception
Any piece of information travelling between the client and the server is encrypted, both during the vault creation and the connection attempts.  
This process turns both sides of the comparison algorithm we use as temporary and non deterministic pieces of data so that an observer cannot take those data and brute force the password or checks that a password extracted (under duress or by other means) from the user is indeed the password or the kill switch ahead of time.  
The TTL on the encryption secret and their limited usability makes sure that the headers cannot be used in a replay attack.  

### Server hijack
Having access to both the database and the server's secret, attackers can brute force any targeted password they want. The PBKDF2 hashing is there to make sure that it is a time consuming affair and probably impossible for the whole database if the number of users is big enough but not very hard if the number of accounts targeted is low.  
In this project the main risk of a server hijack is for the attacker to replace all stored keys but you can mitigate that risk by creating the account without the vault, wait for the on chain validation to be confirmed and only then set up the vault so that at least you'd be aware of any keys replacement.  
Still, with your secret key, the attacker could read any message you receive and all messages of groups you belong to.  
The best protection is to not use the vault, store your private key safely, use it directly to connect and never share it with the server.  