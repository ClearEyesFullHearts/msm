
## The Vault & the Attic
The vault is designed to offer the possibility to store a user's Secret Key as securely as possible and enable the possibility to connect through a simple username/password scheme. It is also designed to allow the use of a password kill switch.  
The attic is the recipient of the public informations needed to allow this connection scheme.  

#### Setting up the Vault
- We have a password (PSW) and a password kill switch (PKS) and our Secret Key
- We hash `PSW` through a PBKDF2 algorithm with a random salt (RS1) to get our encryption hash (HP1)
- We hash `PSW` through a PBKDF2 algorithm with a random salt (RS2) to get our comparison hash (HP2)
- We hash `PKS` through a PBKDF2 algorithm with salt `RS2` to get our comparison kill switch hash (HKS)
- We encrypt our Secret Key with `HP1` as key and a random initialization vector (IV1) resulting in (ESK)
- We use our Secret Key to get the signature of `HP2` as (SHP)
- We use our Secret Key to get the signature of `HKS` as (SHK)
- We then ask the server for the username's attic
- The server generates a one-off RSA key pair (TSK & TPK), stores `TSK` in session with a x seconds Time To Live and sends `TPK`
- We encrypt `RS1` with `TPK` to get (ERS1)
- We encrypt `IV1` with `TPK` to get (EIV1)
- We encrypt `SHP` with `TPK` to get (ESHP)
- We encrypt `SHK` with `TPK` to get (ESHK)
- We send `RS2`, `ESK`, `ERS1`, `EIV1`, `ESHP`, `ESHK` to the server
- The server decrypt `ERS1`, `EIV1`, `ESHP`, `ESHK` with `TSK` to get `RS1`, `IV1`, `SHP` and `SHK` back  
  
The server stores `RS2` in clear in the attic.  
The server stores `ESK`, `RS1`, `IV1`, `SHP` and `SHK` in the vault. All data in the vault are encrypted server side with the other secret managed by the back end.  

#### Using the Vault with the correct password
- We have a username and a password `PSW`
- We first ask the server for the username's attic
- The server generates a one-off RSA key pair (TSK & TPK), stores `TSK` in session with a x seconds Time To Live and sends `TPK` and `RS2`
- We hash `PSW` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash `HP2`
- We encrypt `HP2` with `TPK` to get (EHP)
- We ask for the username's connection information with `EHP` in a header
- The server checks that `TSK` still lives
- The server decrypt `EHP` with `TSK`, it gets `HP2`
- The server verifies `HP2` against the vault's kill switch comparison signature `SHK` using the user's Public Key
- `PSW` is not the kill switch so it doesn't verify
- The server verifies `HP2` against the vault's password comparison signature `SHP` using the user's Public Key
- `PSW` is the password so it verifies
- The server send back `ESK`, `RS1`, and `IV1` and the connection information encrypted using the user's Public Key (JWT)
- We hash `PSW` through a PBKDF2 algorithm with salt `RS1` to get our encryption hash `HP1`
- Using `HP1` We decrypt `ESK` with vector `IV1` to get our Secret Key back
- We then decrypt `JWT` with it to get our connection information   

#### Using the Vault with the kill switch
- We have a username and a password `PKS`
- We first ask the server for the username's attic
- The server generates a one-off RSA key pair (TSK & TPK), stores `TSK` in session with a x seconds Time To Live and sends `TPK` and `RS2`
- We hash `PKS` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash `HKS`
- We encrypt `HKS` with `TPK` to get (EHK)
- We ask for the username's connection information with `EHK` in a header
- The server checks that `SK` still lives
- The server decrypt `EHK` with `TSK`, it gets `HKS`
- The server verifies `HKS` against the vault's kill switch comparison signature `SHK` using the user's Public Key
- `PKS` is the kill switch so it verifies
- The account is deleted and the server send back a 400 HTTP error   

#### Using the Vault with a wrong password
- We have a username and a password (PSX)
- We first ask the server for the username's attic
- The server generates a one-off RSA key pair (TSK & TPK), stores `TSK` in session with a x seconds Time To Live and sends `TPK` and `RS2`
- We hash `PSX` through a PBKDF2 algorithm with salt `RS2` to get our comparison hash (HPX)
- We encrypt `HPX` with `TPK` to get (EHX)
- We ask for the username's connection information with `EHX` in a header
- The server checks that `SK` still lives
- The server decrypt `EHX` with `TSK`, it gets `HPX`
- The server verifies `HPX` against the vault's kill switch comparison signature `SHK` using the user's Public Key
- `PSX` is not the kill switch so it doesn't verify
- The server verifies `HPX` against the vault's password comparison signature `SHP` using the user's Public Key
- `PSX` is not the password so it doesn't verify
- The server send back a 400 HTTP error   

### Security considerations concerning the vault
The kind of attack we could encounter are:  
  
#### Brute force attack through the API  
Since the temporary key pair is usable only once, we can adjust their TTL to mitigate greatly those attack and infrastructure mitigation should be set up soon so that too many attempt at connecting is slowed down.  
Note that with the kill switch enabled attackers have a 50% chance of destroying the account instead of finding the password anyway.  
#### An attacker could get a copy of the database  
In that case I think we're ok, all sensitive datas are stored encrypted, either by the user's public key or by a random secret for the vault itself. The only risk is if the back-end secret is leaked alongside the DB, which shouldn't happen obviously.  
#### An attacker could intercept the communications send by the client to the server  
The password and the kill switch signatures are encrypted on vault creation.  
The password and the kill switch comparison hashes are encrypted on connection.  
This process turns both sides of the comparison algorithm we use as temporary and non deterministic pieces of data so that an observer cannot take those data and brute force the password or checks that a password extracted (under duress or by other means) from the user is indeed the password or the kill switch ahead of time.  
The TTL on the encryption key pair and their limited usability makes sure that the header cannot be used in a replay attack.  
On vault creation we do not encrypt `ESK` because it is too large to be encrypted by an RSA key but without knowing `RS1` and `IV1`, which are encrypted, I do not think you can brute force that data either.  
You do have all those informations in the response on a succesful connection which opens an angle for a brute force attack again. Maybe using a Diffie-Hellman agreement instead of an RSA key pair would resolve that problem.  
#### An attacker could take control of the server  
An attacker with full control of the server could brute force one or a few targeted account to get their password and replace all keys (public and private). The PBKDF2 hashing is there to make sure that it is a time consuming affair but not very hard if the number of accounts targeted is low.  
You can mitigate that risk by creating the account without the vault, wait for the on chain validation to be confirmed and only then set up the vault so that at least you'd be aware of any keys replacement.  
The best protection is to not use the vault, store your private key safely, use it directly to connect and never share it with the server.  