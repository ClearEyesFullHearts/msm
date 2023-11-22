
## The Vault & the Attic
The vault is designed to offer the possibility to store a user's Secret Key as securely as possible and enable the possibility to connect through a simple username/password scheme. It is also designed to allow the use of a password kill switch.  
The attic is the recipient of the public informations needed to allow this connection scheme.  

### The Vault

#### Setting up the Vault
- We have a password (PSW) and a password kill switch (PKS) and our Secret Key
- We hash `PSW` through a PBKDF2 algorithm with a random salt (RS1) to get our encryption hash (HP1)
- We hash `PSW` through a PBKDF2 algorithm with a random salt (RS2) to get our comparison hash (HP2)
- We hash `PKS` through a PBKDF2 algorithm with salt `RS2` to get our comparison kill switch hash (HKS)
- We encrypt our Secret Key with `HP1` as key and a random initialization vector (IV1) resulting in (ESK)
- We use our Secret Key to get the signature of `HP2` as (SHP)
- We use our Secret Key to get the signature of `HKS` as (SHK)
- We then ask the server for the username's attic, it gives us a temporary shared secret (TSS)
- We encrypt `ESK` with `TSS` to get (EESK)
- We encrypt `RS1` with `TSS` to get (ERS1)
- We encrypt `IV1` with `TSS` to get (EIV1)
- We encrypt `SHP` with `TSS` to get (ESHP)
- We encrypt `SHK` with `TSS` to get (ESHK)
- We send `RS2`, `EESK`, `ERS1`, `EIV1`, `ESHP`, `ESHK` to the server
- The server decrypt `EESK`, `ERS1`, `EIV1`, `ESHP`, `ESHK` with `TSS` to get `ESK`, `RS1`, `IV1`, `SHP` and `SHK` back  
  
The server stores `RS2` in clear in the attic.  
The server stores `ESK`, `RS1`, `IV1`, `SHP` and `SHK` in the vault. All data in the vault are encrypted server side with a secret managed by the back end.  

#### Using the Vault with the correct password
- We have a username and a password `PSW`
- We ask the server for the username's attic, it gives us `RS2` and a temporary shared secret (TSS)
- We hash `PSW` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash `HP2`
- We encrypt `HP2` with `TSS` to get (EHP)
- We ask for the username's connection information with `EHP` in a header
- The server decrypt `EHP` with `TSS`, it gets `HP2`
- The server verifies `HP2` against the vault's kill switch comparison signature `SHK` using the user's Public Key
- `PSW` is not the kill switch so it doesn't verify
- The server verifies `HP2` against the vault's password comparison signature `SHP` using the user's Public Key
- `PSW` is the password so it verifies
- The server send back `ESK`, `RS1`, and `IV1` encrypted with `TSS` (EESK, ERS1 and EIV1) and the connection information encrypted using the user's Public Key (JWT)
- We decrypt `EESK`, `ERS1` and `EIV1` with `TSS` to get back `ESK`, `RS1`, and `IV1`
- We hash `PSW` through a PBKDF2 algorithm with salt `RS1` to get our encryption hash `HP1`
- Using `HP1` We decrypt `ESK` with vector `IV1` to get our Secret Key back
- We then decrypt `JWT` with it to get our connection information   

#### Using the Vault with the kill switch
- We have a username and a password `PKS`
- We ask the server for the username's attic, it gives us `RS2` and a temporary shared secret (TSS)
- We hash `PKS` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash `HKS`
- We encrypt `HKS` with `TSS` to get (EHK)
- We ask for the username's connection information with `EHK` in a header
- The server decrypt `EHK` with `TSS`, it gets `HKS`
- The server verifies `HKS` against the vault's kill switch comparison signature `SHK` using the user's Public Key
- `PKS` is the kill switch so it verifies
- The account is deleted and the server send back a 400 HTTP error   

#### Using the Vault with a wrong password
- We have a username and a password (PSX)
- We ask the server for the username's attic, it gives us `RS2` and a temporary shared secret (TSS)
- We hash `PSX` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash (HPX)
- We encrypt `HPX` with `TSS` to get (EHX)
- We ask for the username's connection information with `EHX` in a header
- The server decrypt `EHX` with `TSS`, it gets `HPX`
- The server verifies `HPX` against the vault's kill switch comparison signature `SHK` using the user's Public Key
- `PSX` is not the kill switch so it doesn't verify
- The server verifies `HPX` against the vault's password comparison signature `SHP` using the user's Public Key
- `PSX` is not the password so it doesn't verify
- The server send back a 400 HTTP error   

### The Attic
The attic is used to securely share a secret between the client and the server through a Diffie-Helman key exchange. This shared secret will then be used once and for a limited time period to proceed with the client's vault creation or connection attempt.  

#### Using the Attic: successful connection
- The client generates an ECDH key pair (CSK & CPK)
- The client asks for the attic of a known user with `CPK` in the header
- The server gets `RS2` and no known temporary shared secret for the user from storage
- The server generates an ECDH key pair (SSK & SPK)
- It computes a shared secret with `CPK` and `SSK` to get (TSS)
- It stores `SPK`, `TSS` and a minimum TTL (MIN) of 0 seconds, a maximum TTL of 5 seconds (MAX) and a usage of 1 (USE)
- It sends back `RS2` and `SPK` to the client
- The client computes `TSS` with `SPK` and `CSK`
- It uses `TSS` to encrypt the comparison hash and asks for connection
- On connection the server checks that the timestamp is less than `MAX` and `USE` is greater than 0
- The server decrypt the comparison hash with `TSS` and set `USE` to 0  
  
If the connection attempt is good, the server removes `SPK`, `TSS`, `MIN`, `MAX`, `USE` and leaves the user with no known temporary shared secret.  
If the connection attempt fails it leaves the user with a `SPK`, `TSS`, `MIN`, `MAX` and `USE` for retry.  

#### Using the Attic: vault creation
- The client generates an ECDH key pair (CSK & CPK)
- The client asks for the attic of a known user with `CPK` in the header
- The server gets no information from storage for the user
- The server generates an ECDH key pair (SSK & SPK)
- It computes a shared secret with `CPK` and `SSK` to get (TSS)
- It stores `SPK`, `TSS` and a minimum TTL (MIN) of 0 seconds, a maximum TTL of 5 seconds (MAX) and a usage of 1 (USE)
- It sends back a random generated salt (RSX) and `SPK` to the client
- The client computes `TSS` with `SPK` and `CSK`
- It uses `TSS` to encrypt its vault informations
- On vault creation the server checks that the timestamp is less than `MAX` and `USE` is greater than 0
- The server decrypt the request body with `TSS` and store the vault informations
- The server removes `SPK`, `TSS`, `MIN`, `MAX`, `USE`  

#### Using the Attic: Retries with unused secret
- The client generates an ECDH key pair (CSK & CPK)
- The client asks for the attic of a known user with `CPK` in the header
- The server gets `RS2` and `SPK`, `TSS`, `MAX`, `MIN` and `USE` from storage
- The timestamp is more than `MIN`
- `USE` is greater than 0
- The timestamp is less than `MAX`
- It sends back `RS2` and `SPK` to the client  

#### Using the Attic: Retries with used secret and consumed ttl
- The client generates an ECDH key pair (CSK & CPK)
- The client asks for the attic of a known user with `CPK` in the header
- The server gets `RS2` and `SPK`, `TSS`, `MAX`, `MIN` and `USE` from storage
- The timestamp is more than `MIN`
- `USE` is 0
- The server generates a new ECDH key pair (SSK2 & SPK2)
- It computes a shared secret with `CPK` and `SSK2` to get (TSS2)
- It replaces previous values with `SPK2`, `TSS2` and a minimum TTL (MIN2) of `MIN` + 1 seconds, a maximum TTL of 5 seconds (MAX) and a usage of 1 (USE)
- It sends back `RS2` and `SPK2` to the client  
  
Each failed connection attempt will add one second to `MIN`.

#### Using the Attic: Retries with used secret and active ttl
- The client generates an ECDH key pair (CSK & CPK)
- The client asks for the attic of a known user with `CPK` in the header
- The server gets `RS2` and `SPK`, `TSS`, `MAX`, `MIN` and `USE` from storage
- The timestamp is less than `MIN`
- The server sends back a bogus random salt and ECDH public key  
  
Whatever happens, the attic always send a salt and an ECDH public key.  

### Security considerations
The kind of attack we could encounter are:  
  
#### Brute force attack through the API  
Since the temporary secret is usable only once, we can adjust its TTL to mitigate greatly those attack and infrastructure mitigation should be set up soon so that too many attempt at connecting is slowed down.  
Note that with the kill switch enabled attackers have at least a 50% chance of destroying the account instead of finding the password with this technique.  
#### An attacker could get a copy of the database  
In that case I think we're ok, all sensitive datas are stored encrypted, either by the user's public key or by a random secret for the vault itself. The only risk is if the back-end secret is leaked alongside the DB, which shouldn't happen obviously.  
#### An attacker could intercept the communications send by the client to the server  
Each time any piece of information travels between the client and the server it is encrypted, the secret key itself or any data related to the password or kill switch, both during the vault creation and the connection attempts.  
This process turns both sides of the comparison algorithm we use as temporary and non deterministic pieces of data so that an observer cannot take those data and brute force the password or checks that a password extracted (under duress or by other means) from the user is indeed the password or the kill switch ahead of time.  
The TTL on the encryption secret and their limited usability makes sure that the header cannot be used in a replay attack.  
#### An attacker could take control of the server  
An attacker with full control of the server could brute force one or a few targeted account to get their password and replace all keys (public and private). The PBKDF2 hashing is there to make sure that it is a time consuming affair but not very hard if the number of accounts targeted is low.  
You can mitigate that risk by creating the account without the vault, wait for the on chain validation to be confirmed and only then set up the vault so that at least you'd be aware of any keys replacement.  
Still, with your secret key, the attacker could read any message you receive and all messages of groups you belong to.  
The best protection is to not use the vault, store your private key safely, use it directly to connect and never share it with the server.  