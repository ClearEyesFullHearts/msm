# The ballad of Alice and Bob
Alice and Bob want to have fun with crypto in Javascript (Yeah!), the issue is that Alice have only access to the [SubtleCrypto](https://developer.mozilla.org/fr/docs/Web/API/SubtleCrypto) library in her browser and Bob have only access to the [crypto module](https://nodejs.org/api/crypto.html) from Node.JS.  
First they should agree on some terms. They will deal mostly with byte arrays, that they'll call buffers whatever their real type, strings, be it in clear text or in base64, and conversion from one to the other, that is encoding and decoding.  
They'll sometime have to produce random byte arrays too, for initialization vectors or salts, with different length.  
Some other notable differences are that Alice will mostly work asynchronously (with async/await) and Bob will work synchronously. The crypto module offer most of its API as either synchronous or as callback-enabled function so you could wrap them in Promises to offer more similarity but Bob's not doing that here.  
Another difference is that Alice will mostly count in bits and Bob in bytes so that they'll have to multiply or divide by 8 some values sometime.  
  
### Encoding / Decoding
They will write a class to make it easy:
```
class Helper {
    static clearTextToBuffer(txt:String) => Buffer;
    static base64ToBuffer(b64Txt:String) => Buffer;
    static bufferToBase64(buffer:Buffer) => String;
    static bufferToClearText(buffer:Buffer) => String;
    static getRandomBuffer(size:Integer) => Buffer;
}
```

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>Alice has had to use the string charCode method and browser's native "atob" and "btoa" methods.</td>
<td>For Bob the class is simple, by leveraging Node's native Buffer object he can encode and decode easily.</td>
</tr>
<tr>
<td>

```javascript
class Helper {
  static clearTextToBuffer(txt) {
    const buf = new ArrayBuffer(txt.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = txt.length; i < strLen; i += 1) {
        bufView[i] = txt.charCodeAt(i);
    }
    return buf;
  }
  static base64ToBuffer(b64Txt) {
    const str = window.atob(b64Txt); // decode base64
    return this.clearTextToBuffer(str);
  }
  static bufferToBase64(buffer) {
    const str = this.bufferToClearText(buffer);
    return window.btoa(str); // encode base64
  }
  static bufferToClearText(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  }
  static getRandomBuffer(size) {
    return window.crypto.getRandomValues(new Uint8Array(size));
  }
}
```

</td>
<td>

```javascript
class Helper {
  static clearTextToBuffer(txt) {
    return Buffer.from(txt, 'utf8'); // utf8 is the default so you can ignore it
  }
  static base64ToBuffer(b64Txt) {
    return Buffer.from(txt, 'base64');
  }
  static bufferToBase64(buffer) {
    return buffer.toString('base64');
  }
  static bufferToClearText(buffer) {
    return buffer.toString('utf8'); // utf8 is the default so you can ignore it
  }
  static getRandomBuffer(size) {
    return crypto.randomBytes(size);
  }
}
```

</td>
</tr>
</table>
  
## Hashing
I'm not going to detail why Alice and Bob would be interested to hash stuff, everyone has to hash stuff sometime.  
### Simple hash
Alice and Bob has to choose which algorithm they are going to use for hashing. Alice doesn't have much choice, she can only choose between SHA-1, SHA-256, SHA-384 and SHA-512, while Bob has the full list of openSSL' digest (openssl list -digest-algorithms).  
They agree to use SHA-256 which produce a nice 256 bits, 32 bytes buffer that converts to a 44 characters long base64 encoded string.  
SHA-384 would be 384 bits, 48 bytes and 64 characters.  
SHA-512 would be 512 bits, 64 bytes and 88 characters.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>

```javascript
const buffer = Helper.clearTextToBuffer(clearText);

const digest = await window.crypto.subtle.digest({
    name: 'SHA-256',
}, buffer);

const result = Helper.bufferToBase64(digest);
```

</td>
<td>

```javascript
const hash = crypto.createHash('sha256');
hash.update(clearText);
const digest = hash.digest();

const result = Helper.bufferToBase64(digest);
```

</td>
</tr>
</table>
  
### Long hashing
Long hash are used to convert a low entropy secret to a high entropy output while taking their sweet time doing it. It is used to convert a user's password to a key of the desired size and prevent rainbow attack by forcing the attacker to take too much time to brute force each password.  
Long hashing algorithm are PBKDF2, scrypt and Argon2 for example.  
Bob has the possibility to use scrypt or PBKDF2 but Alice only have access to PBKDF2, so PBKDF2 it is.  
A salt (a random array of bytes appended to the key to be hashed) is used to make the output of the hashing function unique per salt. It should therefore be random and unique but not particularly secret. If Alice and Bob want to be able to compare their hashes they need to communicate the salt they used along the result of the hash function.  
In the example below, Alice choose the salt and Bob use her salt to get the same hash as her.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>Alice has to transform the password into a CryptoKey object through the "import" function (in raw format) to be able to use it in the "deriveBits" function.<br>
Note that the output key length here is in bits, 256 which is 32*8</td>
<td>Note that the output key length here is in bytes, 32 which is 256/8</td>
</tr>
<tr>
<td>

```javascript
const salt = Helper.getRandomBuffer(64);
// const salt = Helper.base64ToBuffer(saltFromBob);
const passwordBuffer = Helper.clearTextToBuffer(password);
const importedKey = await window.crypto.subtle.importKey(
  'raw',
  passwordBuffer,
  { name: 'PBKDF2' },
  false,
  ['deriveBits']
);

const params = {
  name: 'PBKDF2',
  hash: 'SHA-512',
  salt,
  iterations: 600000,
};
const longHash = await window.crypto.subtle.deriveBits(
  params, 
  importedKey, 
  256 // output length in bits
);

return {
  salt: Helper.bufferToBase64(salt),
  hash: Helper.bufferToBase64(longHash),
};
```

</td>
<td>

```javascript
//const salt = Helper.getRandomBuffer(64);
const salt = Helper.base64ToBuffer(saltFromAlice);
const passwordBuffer = Helper.clearTextToBuffer(password);

const longHash = crypto.pbkdf2Sync(
  passwordBuffer,
  salt,
  600000,
  32, // output length in bytes
  'sha512'
);

return {
  salt: saltFromAlice,
  hash: Helper.bufferToBase64(longHash),
};
```

</td>
</tr>
</table>
  
## Symmetric encryption/decryption
Now that Alice and Bob can both produce a key of the right size and with a nice degree of entropy thay can get to properly encrypt and decrypt things.  

### AES Encryption
Alice once again limit the choice of algorithm available for AES encryption to just 3: AES-CTR, AES-CBC and AES-GCM. AES-GCM being the recommended algorithm for symmetric encryption they choose this one.  
AES-GCM includes an authentication tag automatically appended at the end of the cypher, the length of the tag may vary but the default is 128 bits or 16 bytes. It is important to know the length of the tag.  
AES encryption ask for an initialization vector (IV), a unique, randomly chosen array of bytes which will be used to start the encryption. It needs to be unpredictable (so do not use the hash of a username or something like that) but should be public.  
In the examples below the "chosenKey" is a base64 string, the ouput of a (simple or long) hashing. Clear text shouldn't be used directly as the key of an encryption. It is shared by Alice and Bob.  
The "textToEncrypt" can be of any length.  
The output of the encrypt function will be unique thanks to the iv but its length will always be the same for the same parameters (algorithm, key length, iv length and length of the text to encrypt).  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>Alice has to transform the password into a CryptoKey object through the "import" function (in raw format) to be able to use it in the "encrypt" function.</td>
<td></td>
</tr>
<tr>
<td>

```javascript
const bufferKey = Helper.base64ToBuffer(chosenKey);
const key = await window.crypto.subtle.importKey(
  'raw',
  bufferKey,
  {
    name: 'AES-GCM',
  },
  false, // not extractable, cannot be exported
  ['encrypt', 'decrypt'],
);

const bufferIv = Helper.getRandomBuffer(16);
const bufferTxt = Helper.clearTextToBuffer(textToEncrypt);
const bufferCypher = await window.crypto.subtle.encrypt({
  name: 'AES-GCM',
  iv: bufferIv,
  tagLength: 128, //length of the auth tag
}, key, bufferTxt);

return {
  cypher: Helper.bufferToBase64(bufferCypher),
  iv: Helper.bufferToBase64(bufferIv),
}

```

</td>
<td>

```javascript
const bufferKey = Helper.base64ToBuffer(chosenKey);
const iv = Helper.getRandomBuffer(16);

const cipher = crypto.createCipheriv(
  'aes-256-gcm',
  bufferKey,
  iv,
  { authTagLength: 16 }
);

const bufferCypher = Buffer.concat([
  cipher.update(textToEncrypt), 
  cipher.final(), 
  cipher.getAuthTag() // 16 bytes auth tag is appended to the end
]);

return {
  cypher: Helper.bufferToBase64(bufferCypher),
  iv: Helper.bufferToBase64(iv),
}
```

</td>
</tr>
</table>
  

### AES Decryption
Decryption is really only the inverse of the encryption.   

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>Alice has to transform the password into a CryptoKey object through the "import" function (in raw format) to be able to use it in the "decrypt" function.</td>
<td>Bob has to extract and set the authentication tag himself</td>
</tr>
<tr>
<td>

```javascript
const bufferKey = Helper.base64ToBuffer(chosenKey);
const bufferIv = Helper.base64ToBuffer(ivFromBob);
const bufferCypher = Helper.base64ToBuffer(cypherFromBob);

const importedKey = await window.crypto.subtle.importKey(
  'raw',
  bufferKey,
  {
    name: 'AES-GCM',
  },
  false,
  ['encrypt', 'decrypt'],
);

const bufferText = await window.crypto.subtle.decrypt(
  { 
    name: 'AES-GCM',
    iv: bufferIv,
    tagLength: 128,
  },
  importedKey,
  bufferCypher,
);

return Helper.bufferToClearText(bufferText);
```

</td>
<td>

```javascript
const bufferKey = Helper.base64ToBuffer(chosenKey);
const bufferIv = Helper.base64ToBuffer(ivFromAlice);
const bufferCypher = Helper.base64ToBuffer(cypherFromAlice);

// extract the auth tag
const authTag = bufferCypher.subarray(bufferCypher.length - 16);
const crypted = bufferCypher.subarray(0, bufferCypher.length - 16);

const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, bufferIv);
decipher.setAuthTag(authTag);
const bufferText = Buffer.concat([decipher.update(crypted), decipher.final()]);

return Helper.bufferToClearText(bufferText);
```

</td>
</tr>
</table>
  
## Asymmetric encryption/decryption
While symmetric encryption rely on a shared secret between Alice and Bob, asymmetric encryption uses a pair of keys, one public and one secret to enable message sharing.  

### RSA
The RSA algorithm for encryption is "RSA-OAEP" in subtle which match "rsa" in node.  
#### Key pair generation
Alice and Bob have to decide a common format to exchange their keys.  
PEM is the default (spki for the public key and pkcs8 for the private one) but since subtle export only the base64 content of the PEM file (without line breaks) and node export the PEM file formatted by openSSL, they need to change the format to have a common one.  
So the produce of their formatting is:
- PEM header
- 1 Line break
- PEM content
- 1 Line break
- PEM footer
  
Note that while the public keys length are constant for each modulus, the length of the private keys can vary slightly.  
Note also that Alice has to define the hash function used during key generation while Bob doesn't. He will have to use the same hash during encryption.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>Alice has to transform the CryptoKey into a transportable format (spki for the public key, pkcs8 for the private one) through the "export" function before getting the content of the PEM file.<br>
Alice has to define the hash function here.</td>
<td>Bob gets the keys in the openSSL PEM format.<br>
Bob doesn't have to define the hash function here.</td>
</tr>
<tr>
<td>

```javascript
const modulo = 4096;
const keyPair = await window.crypto.subtle.generateKey(
  {
    name: 'RSA-OAEP',
    modulusLength: modulo,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['encrypt', 'decrypt'],
);

const {
  publicKey,
  privateKey,
} = keyPair;

const bufferPublicKey = await window.crypto.subtle.exportKey('spki', publicKey);
const pemContentPublicKey = Helper.bufferToBase64(bufferPublicKey);
const pemPublicKey = `-----BEGIN PUBLIC KEY-----\n${pemContentPublicKey}\n-----END PUBLIC KEY-----`;

const bufferPrivateKey = await window.crypto.subtle.exportKey('pkcs8', privateKey);
const pemContentPrivateKey = Helper.bufferToBase64(bufferPrivateKey);
const pemPrivateKey = `-----BEGIN PUBLIC KEY-----\n${pemContentPrivateKey}\n-----END PUBLIC KEY-----`;

return {
  publicKey: pemPublicKey,
  privateKey: pemPrivateKey,
};
```

</td>
<td>

```javascript
const modulo = 4096;
const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: modulo,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  }
);

const {
  publicKey,
  privateKey,
} = keyPair;

const publicHeader = '-----BEGIN PUBLIC KEY-----';
const publicFooter = '-----END PUBLIC KEY-----';
const trimmedPK = publicKey.replace(/\n/g, '');
const pemContentPublicKey = trimmedPK.substring(publicHeader.length, trimmedPK.length - publicFooter.length);

const pemPublicKey = `${publicHeader}\n${pemContentPublicKey}\n${publicFooter}`;

const privateHeader = '-----BEGIN PRIVATE KEY-----';
const privateFooter = '-----END PRIVATE KEY-----';
const trimmedSK = privateKey.replace(/\n/g, '');
const pemContentPublicKey = trimmedSK.substring(privateHeader.length, trimmedSK.length - privateFooter.length);

const pemPrivateKey = `${privateHeader}\n${pemContentPublicKey}\n${privateFooter}`;

return {
  publicKey: pemPublicKey,
  privateKey: pemPrivateKey,
};
```

</td>
</tr>
</table>

#### Extracting the public key
It's always possible to re-extract the public key from the private key which can be useful if Alice and Bob choose to store only the private key and not the whole pair.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>

```javascript
  const bufferAlicePrivateKey = Helper.base64ToBuffer(alicePrivateKeyPemContent);

  const aliceKey = await window.crypto.subtle.importKey(
    'pkcs8',
    bufferAlicePrivateKey,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt'],
  );

  // export private key to JWK
  const jwk = await window.crypto.subtle.exportKey('jwk', aliceKey);

  // remove private data from JWK
  delete jwk.d;
  delete jwk.dp;
  delete jwk.dq;
  delete jwk.q;
  delete jwk.qi;
  jwk.key_ops = ['encrypt'];

  // import public key
  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt'],
  );

  const bufferPublicKey = await window.crypto.subtle.exportKey('spki', publicKey);
  const pemContentPublicKey = Helper.bufferToBase64(bufferPublicKey);
  return `-----BEGIN PUBLIC KEY-----\n${pemContentPublicKey}\n-----END PUBLIC KEY-----`;
```

</td>
<td>

```javascript
  const pem = bobPrivateKeyPemFile;
  const pubKeyObject = crypto.createPublicKey({
    key: pem,
    format: 'pem',
  });

  const publicKey = pubKeyObject.export({
    format: 'pem',
    type: 'spki',
  });

  const publicHeader = '-----BEGIN PUBLIC KEY-----';
  const publicFooter = '-----END PUBLIC KEY-----';
  const trimmedPK = publicKey.replace(/\n/g, '');
  const pemContentPublicKey = trimmedPK.substring(publicHeader.length, trimmedPK.length - publicFooter.length);

  return `${publicHeader}\n${pemContentPublicKey}\n${publicFooter}`;
```

</td>
</tr>
</table>
  
  
#### Public encrypt
The amount of data that Alice and Bob can encrypt with an RSA public key is limited by its modulus. A 4096 bits modulus means that they cannot encrypt something bigger than 512 bytes and even less than that since OAEP needs some space for padding.  
The produce of an RSA encryption is always equal in length to the modulus, so 4096 gives 512 bytes and a base64 encoded string of length 684. It is not deterministic so 2 encryptions of the same data by the same public key will produce 2 different results.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>Just like she had to format her keys in PEM format, Alice has to extract the content of Bob's public key PEM file, by removing the header and the footer before importing it. It is not shown here.</td>
<td>Bob can use Alice's formatted PEM file directly.<br>
Bob has to define the hash function here.</td>
</tr>
<tr>
<td>

```javascript
const bufferBobPemContent = Helper.base64ToBuffer(bobPublicKeyPemContent);

const bobKey = await window.crypto.subtle.importKey(
  'spki',
  bufferBobPemContent,
  {
    name: 'RSA-OAEP',
    hash: 'SHA-256',
  },
  true,
  ['encrypt'],
);

const bufferText = Helper.clearTextToBuffer(plaintext);

const encrypted = await window.crypto.subtle.encrypt(
  { name: 'RSA-OAEP' },
  bobKey,
  bufferText,
);

return Helper.bufferToBase64(encrypted);
```

</td>
<td>

```javascript
const pem = alicePublicKeyPemFile;

const bufferText = Helper.clearTextToBuffer(plaintext);

const encrypted = crypto.publicEncrypt({
  key: pem,
  oaepHash: 'sha256',
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
}, bufferText);

return Helper.bufferToBase64(encrypted);
```

</td>
</tr>
</table>
  
#### Private decryption

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>

```javascript
const bufferAlicePemContent = Helper.base64ToBuffer(alicePrivateKeyPemContent);

const aliceKey = await window.crypto.subtle.importKey(
  'pkcs8',
  bufferAlicePemContent,
  {
    name: 'RSA-OAEP',
    hash: 'SHA-256',
  },
  true,
  ['decrypt'],
);

const bufferCypher = Helper.base64ToBuffer(cypherFromBob);

const decripted = await window.crypto.subtle.decrypt(
  { name: 'RSA-OAEP' },
  aliceKey,
  bufferCypher,
);

return Helper.bufferToClearText(decripted);
```

</td>
<td>

```javascript
const pem = bobPrivateKeyPemFile;
const bufferCypher = Helper.base64ToBuffer(cypherFromAlice);

const decripted = crypto.privateDecrypt({
  key: pem,
  oaepHash: 'sha256',
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
}, bufferCypher);

return Helper.bufferToClearText(decripted);
```

</td>
</tr>
</table>
  
### ECDH
Alice thinks EC mean "Elastic Curve" while Bob is persuaded that it means "Electric Curve". Turns out they are both wrong since it means "Elliptic Curve" and DH stands for Diffie-Hellman.  
EC key pairs are shorter and faster than RSA keys and while they can be used directly for asymmetric encryption they are more often found when the need for a DH key exchange is required.  
Alice and Bob have to exchange their public keys to compute a shared secret from their private key and each other public key, this is the DH key exchange. This shared secret can be used directly for symmetric encryption but it is not recommended to use a shared secret more than once, so they will derive a different key from this shared secret each time they want to send each other a message thanks to a HKDF algorithm.
  
#### Key pair generation
First Alice and Bob have to agree on a curve, Alice doesn't have much choice only P-256, p-384 and P-521 are available to her. Bob has access to all curves defined by openSSL (crypto.getCurves()) so we have:
- P-256 => prime256v1 (pk 88 base64 characters, sk 44)
- P-384 => secp384r1 (pk 132 base64 characters, sk 64)
- p-521 => secp521r1 (pk 180 base64 characters, sk 88)
  
They want to share as small keys as possible so they settle on P-256.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>

```javascript
const AliceKeyPair = await window.crypto.subtle.generateKey(
  {
    name: 'ECDH',
    namedCurve: 'P-256',
  },
  true,
  ['deriveBits'],
);

const PK = await window.crypto.subtle.exportKey('raw', AliceKeyPair.publicKey);
const SK = await window.crypto.subtle.exportKey('pkcs8', AliceKeyPair.privateKey);

return {
  privateKey: Helper.bufferToBase64(SK),
  publicKey: Helper.bufferToBase64(PK),
};
```

</td>
<td>

```javascript
  const bob = crypto.createECDH('prime256v1');
  bob.generateKeys();

  // base64 raw format
  return {
    privateKey: bob.getPrivateKey('base64'),
    publicKey: bob.getPublicKey('base64'),
  };
```

</td>
</tr>
</table>
  
#### Computing the shared secret

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>The shared secret is never to be shared so Alice keeps it as a buffer.</td>
<td>The shared secret is never to be shared so Bob keeps it as a buffer.</td>
</tr>
<tr>
<td>

```javascript
  const bufferAlicePrivateKey = Helper.base64ToBuffer(AlicePrivateKey);
  const bufferBobPublicKey = Helper.base64ToBuffer(BobPublicKey);

  // import bob public key
  const PK = await window.crypto.subtle.importKey(
    'raw',
    bufferBobPublicKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    [], // no key usage
  );

  // import alice secret key
  const SK = await window.crypto.subtle.importKey(
    'pkcs8', // match previous export
    bufferAlicePrivateKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveBits'],
  );

  // get derived shared secret
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
      public: PK,
    },
    SK,
    256,
  );
```

</td>
<td>

```javascript
  const bufferBobPrivateKey = Helper.base64ToBuffer(BobPrivateKey);
  const bufferAlicePublicKey = Helper.base64ToBuffer(AlicePublicKey);

  const bob = crypto.createECDH('prime256v1');
  bob.setPrivateKey(bufferBobPrivateKey);

  const sharedSecret = bob.computeSecret(bufferAlicePublicKey);
```

</td>
</tr>
</table>
  
#### Derive an encryption key
To get a usable encryption key from their shared secret Alice and Bob will use the HKDF algorithm. HKDF needs a salt, an info value and an output key length.  
There is an argument between Alice and Bob about the usage of the salt and the info parameter related to how the HKDF algorithm handle both which is summed up in this [article](https://soatok.blog/2021/11/17/understanding-hkdf/) (with some cool furry art as a bonus!) and they settle on not following its recommendations for now and use the salt as a random and info as a context value.  
In these examples they both convert the key to a base64 string for convenience which is probably useless since the derived key should be used immediately for encryption/decryption and never to be shared or stored for long.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>

```javascript
  const sharedSecretKey = await window.crypto.subtle.importKey(
    'raw',
    sharedSecret, // the shared secret comes as a buffer from the previous step
    { name: 'HKDF' },
    false,
    ['deriveBits'],
  );

  const randomSalt = window.crypto.getRandomValues(new Uint8Array(64));
  const info = Helper.clearTextToBuffer('session-alice-and-bob');

  const bufferKey = await window.crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-512',
      salt: randomSalt,
      info,
    },
    sharedSecretKey,
    256 // size of the derived key (bits)
  );

  return {
    key: Helper.bufferToBase64(bufferKey),
    salt: Helper.bufferToBase64(randomSalt),
  }
```

</td>
<td>

```javascript
  const randomSalt = crypto.randomBytes(64);
  const info = Helper.clearTextToBuffer('session-alice-and-bob');

  const hkdfUIntArray = crypto.hkdfSync(
    'sha512',
    sharedSecret, // the shared secret comes as a buffer from the previous step
    randomSalt,
    info,
    32 // size of the derived key (bytes)
  );

  // hkdfSync doesn't return a Buffer object but a typed array
  // To be consistent we convert it to a real Buffer
  const bufferKey = Buffer.from(hkdfUIntArray);

  return {
    key: Helper.bufferToBase64(bufferKey),
    salt: Helper.bufferToBase64(randomSalt),
  }
```

</td>
</tr>
</table>
  
After the derivation step Alice and Bob can use the resulting key for symmetric encryption/decryption. Bob can just use the key directly for AES GCM encryption with `crypto.createCipheriv` while Alice just has to import the key once again for AES-GCM before using it.  
  
## Signature
Alice and Bob would really like to be sure they are talking to each other and for that they can use one feature of the Public/Private keys infrastructure which is Signature and verification.  
Inversely to the encryption/decryption mechanism, where everyone can encrypt with a public key and only the owner of the private key can decrypt the message, here only the owner of the private key will be able to sign a message while everyone will be able to verify that signature with the matching public key.  

### RSA
#### Key pair generation
While theorically Bob could use the same key pair he used for encryption to sign his messages it is absolutely not recommended and he'll generate another key pair for this usage. Alice doesn't have a choice here since subtle crypto enforce the desired behavior by forcing to choose the possible usage of your key as well as the algorithm on creation. For signature schemes Alice will use RSA-PSS and "sign" / "verify" usages.  
Just like for encryption the length of the signature is of the same size as the modulo of the key.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<tr>
<td>

```javascript

const modulo = 1024;
const keyPair = await window.crypto.subtle.generateKey(
  {
    name: 'RSA-PSS',
    modulusLength: modulo,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify'],
);

const {
  publicKey,
  privateKey,
} = keyPair;

const bufferPublicKey = await window.crypto.subtle.exportKey('spki', publicKey);
const pemContentPublicKey = Helper.bufferToBase64(bufferPublicKey);
const pemPublicKey = `-----BEGIN PUBLIC KEY-----\n${pemContentPublicKey}\n-----END PUBLIC KEY-----`;

const bufferPrivateKey = await window.crypto.subtle.exportKey('pkcs8', privateKey);
const pemContentPrivateKey = Helper.bufferToBase64(bufferPrivateKey);
const pemPrivateKey = `-----BEGIN PUBLIC KEY-----\n${pemContentPrivateKey}\n-----END PUBLIC KEY-----`;

return {
  publicKey: pemPublicKey,
  privateKey: pemPrivateKey,
};
```

</td>
<td>

```javascript
const modulo = 1024;
const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: modulo,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  }
);

const {
  publicKey,
  privateKey,
} = keyPair;

const publicHeader = '-----BEGIN PUBLIC KEY-----';
const publicFooter = '-----END PUBLIC KEY-----';
const trimmedPK = publicKey.replace(/\n/g, '');
const pemContentPublicKey = trimmedPK.substring(publicHeader.length, trimmedPK.length - publicFooter.length);

const pemPublicKey = `${publicHeader}\n${pemContentPublicKey}\n${publicFooter}`;

const privateHeader = '-----BEGIN PRIVATE KEY-----';
const privateFooter = '-----END PRIVATE KEY-----';
const trimmedSK = privateKey.replace(/\n/g, '');
const pemContentPublicKey = trimmedSK.substring(privateHeader.length, trimmedSK.length - privateFooter.length);

const pemPrivateKey = `${privateHeader}\n${pemContentPublicKey}\n${privateFooter}`;

return {
  publicKey: pemPublicKey,
  privateKey: pemPrivateKey,
};
```

</td>
</tr>
</table>
  
#### Signing
Alice and Bob have decided to use a sign-and-encrypt approach meaning they'll take the clear text, hash it, sign the hash, append the signature to the text and then encrypt the whole thing.  
The encryption is not shown here.  
  
<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<td>

```javascript
  const buffer = Helper.clearTextToBuffer(clearText);
  const digest = await window.crypto.subtle.digest({
      name: 'SHA-256',
  }, buffer);

  const bufferAlicePemContent = Helper.base64ToBuffer(alicePrivateKeyPemContent);
  const aliceKey = await window.crypto.subtle.importKey(
    'pkcs8',
    bufferAlicePemContent,
    {
      name: 'RSA-PSS',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signature = await window.crypto.subtle.sign(
    {
      name: 'RSA-PSS',
      saltLength: 32,
    },
    aliceKey,
    digest,
  );

  const toEncrypt = {
    text: clearText,
    signature: Helper.bufferToBase64(signature),
  };
```

</td>
<td>

```javascript
  const pem = bobPrivateKeyPemFile;

  const hash = crypto.createHash('sha256');
  hash.update(clearText);
  const digest = hash.digest();

  const signature = crypto.sign('rsa-sha256', digest, {
    key: pem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  });

  const toEncrypt = {
    text: clearText,
    signature: Helper.bufferToBase64(signature),
  };
```

</td>
</tr>
</table>
  
#### Verifying
The result of the verify function is by definition a boolean.  
The decryption occuring before the verification of the signature is not shown here.  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<td>

```javascript
  const {
    text,
    signature,
  } = decrypted;

  const buffer = Helper.clearTextToBuffer(text);
  const digest = await window.crypto.subtle.digest({
      name: 'SHA-256',
  }, buffer);

  const bufferBobPemContent = Helper.base64ToBuffer(bobPublicKeyPemContent);
  const bobKey = await window.crypto.subtle.importKey(
    'spki',
    bufferBobPemContent,
    {
      name: 'RSA-PSS',
      hash: 'SHA-256',
    },
    true,
    ['verify'],
  );

  const signatureBuffer = Helper.base64ToBuffer(signature);
  const result = await window.crypto.subtle.verify(
    {
      name: 'RSA-PSS',
      saltLength: 32,
    },
    bobKey,
    signatureBuffer,
    digest,
  );

  return result;
```

</td>
<td>

```javascript
  const {
    text,
    signature,
  } = decrypted;

  const pem = alicePublicKeyPemFile;
  
  const hash = crypto.createHash('sha256');
  hash.update(text);
  const digest = hash.digest();

  const signatureBuffer = Helper.base64ToBuffer(signature);
  const result = crypto.verify('rsa-sha256', digest, {
    key: pem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }, signatureBuffer);

  return result;
```

</td>
</tr>
</table>

### ECDSA
TODO
  
## Simple Ratchet
Alice and Bob agree that they should try to achieve perfect forward secrecy for their communications and decide to implement a simple ratchet algorithm inspired by the first part of Signal's Double Ratchet algorithm.  
Both recommended curves (Curve25519 and Curve448) are unavailable to Alice so they decide to use P-521 this time. Bob has some reading problems and Alice has to repeatedly insist that it is P dash five hundred and twenty one and not P dash five hundred and twelve but they finally make it work.  
Bob do not control the size of the computed secret he get from `ecdh.computeSecret` so they agree to use that size for Alice's `crypto.subtle.deriveBits`. Bob computed secret's length for secp521r1 curve is 66 bytes so Alice has to derive her computed secret to a 528 bits buffer.   

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<td>

```javascript
class SimpleRatchet {
  #myPublicKey = null;

  #myPrivateKey = null;

  #chainStarted = false;

  #keyChain = [];

  #myChain = [];

  #copyChain = [];

  #iamInitiator = false;

  #myCounter = -1;

  async #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = new ArrayBuffer(96);

    const info = Helper.clearTextToBuffer(`session-${counter}`);

    const sharedSecretKey = await window.crypto.subtle.importKey(
      'raw',
      lastKey,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt,
        info,
      },
      sharedSecretKey,
      768,
    );

    const key = bufferKeys.slice(0, 32);
    const mine = this.#iamInitiator ? bufferKeys.slice(32, 64) : bufferKeys.slice(64);
    const copy = this.#iamInitiator ? bufferKeys.slice(64) : bufferKeys.slice(32, 64);

    this.#keyChain.push(key);
    this.#myChain.push(mine);
    this.#copyChain.push(copy);

    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;
  }

  get publicKey() {
    if (!this.#myPublicKey) {
      throw new Error('DH is not started');
    }

    return this.#myPublicKey;
  }

  async initECDH() {
    const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-521',
      },
      true,
      ['deriveBits'],
    );

    this.#myPrivateKey = privateKey;
    const bufferPublicKey = await window.crypto.subtle.exportKey('raw', publicKey);
    this.#myPublicKey = Helper.bufferToBase64(bufferPublicKey);
  }

  async initChains(iStart, otherPublicKey) {
    this.#iamInitiator = iStart;

    const otherKeyBuffer = Helper.base64ToBuffer(otherPublicKey);
    const otherKeyObject = await window.crypto.subtle.importKey(
      'raw',
      otherKeyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-521',
      },
      false,
      [],
    );

    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        namedCurve: 'P-521',
        public: otherKeyObject,
      },
      this.#myPrivateKey,
      528,
    );

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
    this.#myPrivateKey = null;
  }

  async send(message) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    this.#myCounter += 1;
    while (this.#myChain.length <= this.#myCounter) {
      await this.#ratchet();
    }

    if (!this.#myChain[this.#myCounter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#myChain[this.#myCounter];

    const key = await window.crypto.subtle.importKey(
      'raw',
      bufferKey,
      {
        name: 'AES-GCM',
      },
      false,
      ['encrypt'],
    );

    const bufferIv = window.crypto.getRandomValues(new Uint8Array(16));
    const bufferTxt = Helper.clearTextToBuffer(message);
    const bufferCypher = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: bufferIv,
      tagLength: 128,
    }, key, bufferTxt);

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.#myChain[this.#myCounter] = false;

    return {
      counter: this.#myCounter,
      cypher: Helper.bufferToBase64(bufferCypher),
      iv: Helper.bufferToBase64(bufferIv),
    };
  }

  async receive({ cypher, iv, counter }) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    while (this.#copyChain.length <= counter) {
      await this.#ratchet();
    }

    if (!this.#copyChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#copyChain[counter];
    const bufferIv = Helper.base64ToBuffer(iv);
    const bufferCypher = Helper.base64ToBuffer(cypher);

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      bufferKey,
      {
        name: 'AES-GCM',
      },
      false,
      ['decrypt'],
    );

    const bufferText = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bufferIv,
        tagLength: 128,
      },
      importedKey,
      bufferCypher,
    );

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.#copyChain[counter] = false;

    return Helper.bufferToClearText(bufferText);
  }
}
```

</td>
<td>

```javascript
class SimpleRatchet {
  #myPublicKey = null;

  #ecdh = null;

  #chainStarted = false;

  #keyChain = [];

  #myChain = [];

  #copyChain = [];

  #iamInitiator = false;

  #myCounter = -1;

  #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = Buffer.alloc(96);

    const info = Buffer.from(`session-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      lastKey,
      salt,
      info,
      96,
    );

    const bufferKeys = Buffer.from(hkdfUIntArray);
    const key = bufferKeys.subarray(0, 32);
    const mine = this.#iamInitiator ? bufferKeys.subarray(32, 64) : bufferKeys.subarray(64);
    const copy = this.#iamInitiator ? bufferKeys.subarray(64) : bufferKeys.subarray(32, 64);

    this.#keyChain.push(key);
    this.#myChain.push(mine);
    this.#copyChain.push(copy);

    lastKey.fill();
    this.#keyChain[counter] = false;
  }

  constructor() {
    this.#ecdh = crypto.createECDH('secp521r1');
    this.#ecdh.generateKeys();

    this.#myPublicKey = this.#ecdh.getPublicKey('base64');
  }

  get publicKey() {
    return this.#myPublicKey;
  }

  initChains(iStart, otherPublicKey) {
    this.#iamInitiator = iStart;
    const pkBuffer = Buffer.from(otherPublicKey, 'base64');

    const sharedSecret = this.#ecdh.computeSecret(pkBuffer);

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
    this.#ecdh = null;
  }

  send(message) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    this.#myCounter += 1;
    while (this.#myChain.length <= this.#myCounter) {
      this.#ratchet();
    }

    if (!this.#myChain[this.#myCounter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#myChain[this.#myCounter];

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      bufferKey,
      iv,
      { authTagLength: 16 },
    );

    const bufferCypher = Buffer.concat([
      cipher.update(message),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    bufferKey.fill();
    this.#myChain[this.#myCounter] = false;

    return {
      counter: this.#myCounter,
      cypher: bufferCypher.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  receive({ cypher, iv, counter }) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    while (this.#copyChain.length <= counter) {
      this.#ratchet();
    }

    if (!this.#copyChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#copyChain[counter];
    const bufferIv = Buffer.from(iv, 'base64');
    const bufferCypher = Buffer.from(cypher, 'base64');

    const authTag = bufferCypher.subarray(bufferCypher.length - 16);
    const crypted = bufferCypher.subarray(0, bufferCypher.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, bufferIv);
    decipher.setAuthTag(authTag);
    const bufferText = Buffer.concat([decipher.update(crypted), decipher.final()]);

    bufferKey.fill();
    this.#copyChain[counter] = false;

    return bufferText.toString();
  }
}
```

</td>
</tr>
</table>

### Usage
  
<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<td>

```javascript
  const alice = new SimpleRatchet();

  // Bob has made its public key available to Alice
  // and she starts the conversation

  await alice.initECDH();
  await alice.initChains(true, bobPublicKey);

  const message = await alice.send('Hello Bob!');
  
  // she send her public key along her first message
  return {
    header: alice.publicKey,
    body: message
  }
```

</td>
<td>

```javascript
  const bob = new SimpleRatchet();
  
  // Bob's public key is available with bob.publicKey

  // He gets Alice's PK with her first message
  // and initialize the conversation with it

  const {
    header: alicePublicKey,
    body: { 
      cypher,
      iv,
      counter
    }
  }

  bob.initChains(false, alicePublicKey);
  const received = bob.receive({ cypher, iv, counter });

  // received is Alice's 'Hello Bob!'

  const message = bob.send('Hello! I\'m fine and you?');
  
  return message;
```

</td>
</tr>
</table>

## Double Ratchet
"Double the ratchet, double the fun!" is a phrase nobody ever uttered but Alice and Bob having come this far still think they should take a shot at [Signal's true Double Ratchet algorithm](https://signal.org/docs/specifications/doubleratchet/).  
First they will have to create a symmetric ratchet and combine it with a DH ratchet to achieve the target algorithm. They try to stay as true as possible to the definition which means that the first root key is supposed to be agreed upon and shared between themselves before the ratchet session by another mean and it will be possible to add authenticated additional data during the encryption and decryption.  
No X3DH or encrypted header in this one though for now, they're planning to use RSA keys for the initial key agreement and authentications.  
This time they go back to the P-256 curve, it is shorter and faster than the P-521 and secure enough for their usage.  

### Symmetric Ratchet
The symmetric ratchet object let's you use it for sending and receiving messages but each object should be used only for one of the actions

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<td>

```javascript
const MAX_SKIPPED_MESSAGES = 5;
class SymmetricRatchet {
  #chainStarted = false;

  #keyChain = [];

  #sharedChain = [];

  async #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = new ArrayBuffer(64);

    const info = Helper.clearTextToBuffer(`session-${counter}`);

    const sharedSecretKey = await window.crypto.subtle.importKey(
      'raw',
      lastKey,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt,
        info,
      },
      sharedSecretKey,
      512,
    );

    const key = bufferKeys.slice(0, 32);
    const shared = bufferKeys.slice(32);

    this.#keyChain.push(key);
    this.#sharedChain.push(shared);

    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;
  }

  get active() {
    return this.#chainStarted;
  }

  get counter() {
    return this.#keyChain.length - 1;
  }

  async setCounter(val) {
    if (val - this.#sharedChain.length > 5) {
      throw new Error('Too many missed messages');
    }
    while (this.#sharedChain.length <= val) {
      await this.#ratchet();
    }
  }

  initKey(rootKey) {
    let sharedSecret = rootKey;
    if (!(rootKey instanceof ArrayBuffer)) {
      sharedSecret = Helper.base64ToBuffer(rootKey);
    }

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
  }

  async send(message, aad) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    const counter = this.#sharedChain.length;
    await this.#ratchet();

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];

    const key = await window.crypto.subtle.importKey(
      'raw',
      bufferKey,
      {
        name: 'AES-GCM',
      },
      false,
      ['encrypt'],
    );

    const bufferIv = window.crypto.getRandomValues(new Uint8Array(16));
    const bufferTxt = Helper.clearTextToBuffer(message);
    const bufferCypher = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: bufferIv,
      tagLength: 128,
      additionalData: aad || undefined,
    }, key, bufferTxt);

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.#sharedChain[counter] = false;

    return {
      counter,
      cypher: Helper.bufferToBase64(bufferCypher),
      iv: Helper.bufferToBase64(bufferIv),
    };
  }

  async receive({ cypher, iv, counter }, aad) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    if (counter - this.#sharedChain.length > MAX_SKIPPED_MESSAGES) {
      throw new Error('Too many missed messages');
    }

    while (this.#sharedChain.length <= counter) {
      await this.#ratchet();
    }

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];
    const bufferIv = Helper.base64ToBuffer(iv);
    const bufferCypher = Helper.base64ToBuffer(cypher);

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      bufferKey,
      {
        name: 'AES-GCM',
      },
      false,
      ['decrypt'],
    );

    const bufferText = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bufferIv,
        tagLength: 128,
        additionalData: aad || undefined,
      },
      importedKey,
      bufferCypher,
    );

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.#sharedChain[counter] = false;

    return Helper.bufferToClearText(bufferText);
  }

  clear() {
    this.#keyChain = this.#keyChain.map((key) => {
      if (key) {
        const view = new Uint8Array(key);
        view.fill(0);
      }
      return false;
    });
    this.#sharedChain = this.#sharedChain.map((key) => {
      if (key) {
        const view = new Uint8Array(key);
        view.fill(0);
      }
      return false;
    });
    this.#chainStarted = false;
  }
}
```

</td>
<td>

```javascript
const MAX_SKIPPED_MESSAGES = 5;
class SymmetricRatchet {
  #chainStarted = false;

  #keyChain = [];

  #sharedChain = [];

  #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = Buffer.alloc(64);

    const info = Buffer.from(`session-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      lastKey,
      salt,
      info,
      64,
    );

    const bufferKeys = Buffer.from(hkdfUIntArray);
    const key = bufferKeys.subarray(0, 32);
    const shared = bufferKeys.subarray(32);

    this.#keyChain.push(key);
    this.#sharedChain.push(shared);

    lastKey.fill();
    this.#keyChain[counter] = false;
  }

  get active() {
    return this.#chainStarted;
  }

  get counter() {
    return this.#keyChain.length - 1;
  }

  set counter(val) {
    if (val - this.#sharedChain.length > 5) {
      throw new Error('Too many missed messages');
    }
    while (this.#sharedChain.length <= val) {
      this.#ratchet();
    }
  }

  initKey(rootKey) {
    let sharedSecret = rootKey;
    if (!Buffer.isBuffer(rootKey)) {
      sharedSecret = Buffer.from(rootKey, 'base64');
    }

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
  }

  send(message, aad) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    const counter = this.#sharedChain.length;
    this.#ratchet();

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      bufferKey,
      iv,
      { authTagLength: 16 },
    );

    if (aad) cipher.setAAD(aad);

    const bufferCypher = Buffer.concat([
      cipher.update(message),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    bufferKey.fill();
    this.#sharedChain[counter] = false;

    return {
      counter,
      cypher: bufferCypher.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  receive({ cypher, iv, counter }, aad) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    if (counter - this.#sharedChain.length > MAX_SKIPPED_MESSAGES) {
      throw new Error('Too many missed messages');
    }

    while (this.#sharedChain.length <= counter) {
      this.#ratchet();
    }

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];
    const bufferIv = Buffer.from(iv, 'base64');
    const bufferCypher = Buffer.from(cypher, 'base64');

    const authTag = bufferCypher.subarray(bufferCypher.length - 16);
    const crypted = bufferCypher.subarray(0, bufferCypher.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, bufferIv);
    decipher.setAuthTag(authTag);
    if (aad) decipher.setAAD(aad);
    const bufferText = Buffer.concat([
      decipher.update(crypted),
      decipher.final(),
    ]);

    bufferKey.fill();
    this.#sharedChain[counter] = false;

    return bufferText.toString();
  }

  clear() {
    this.#keyChain = this.#keyChain.map((key) => {
      if (key) {
        key.fill();
      }
      return false;
    });
    this.#sharedChain = this.#sharedChain.map((key) => {
      if (key) {
        key.fill();
      }
      return false;
    });
    this.#chainStarted = false;
  }
}
```

</td>
</tr>
</table>

### Double Ratchet
  

<table>
<tr>
<th>Alice</th>
<th>Bob</th>
</tr>
<td>

```javascript
const MAX_ACTIVE_CHAINS = 5;
class DoubleRatchet {
  #myPublicKey;

  #myPrivateKey;

  #keyChain = [];

  #sending = new SymmetricRatchet();

  #receiving = new SymmetricRatchet();

  #memories = {};

  #actives = [];

  #previousCounter = -1;

  static async #computeDerivationKey(pkBuffer, skKey) {
    const otherKeyObject = await window.crypto.subtle.importKey(
      'raw',
      pkBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      [],
    );

    const dhComputed = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
        public: otherKeyObject,
      },
      skKey,
      256,
    );

    const dhForDerivation = await window.crypto.subtle.importKey(
      'raw',
      dhComputed,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );

    return dhForDerivation;
  }

  async #resetEcdh() {
    const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveBits'],
    );

    this.#myPrivateKey = privateKey;
    const bufferPublicKey = await window.crypto.subtle.exportKey('raw', publicKey);
    this.#myPublicKey = Helper.bufferToBase64(bufferPublicKey);
  }

  async #ratchetSendingChain(otherPublicKey) {
    const otherKeyBuffer = Helper.base64ToBuffer(otherPublicKey);

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    await this.#resetEcdh();

    const dhOut = await DoubleRatchet.#computeDerivationKey(otherKeyBuffer, this.#myPrivateKey);

    const info = Helper.clearTextToBuffer(`double-ratchet-${counter}`);

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt: lastKey,
        info,
      },
      dhOut,
      512,
    );
    const RK = bufferKeys.slice(0, 32);
    const CKs = bufferKeys.slice(32);

    this.#keyChain.push(RK);
    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;

    this.#previousCounter = this.#sending.counter;

    this.#sending.clear();
    const sr = new SymmetricRatchet();
    sr.initKey(CKs);
    this.#sending = sr;
  }

  async #ratchetReceivingChain(otherPublicKey, PN) {
    const otherKeyBuffer = Helper.base64ToBuffer(otherPublicKey);

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    const dhOut = await DoubleRatchet.#computeDerivationKey(otherKeyBuffer, this.#myPrivateKey);

    const info = Helper.clearTextToBuffer(`double-ratchet-${counter}`);

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt: lastKey,
        info,
      },
      dhOut,
      512,
    );

    const RK = bufferKeys.slice(0, 32);
    const CKr = bufferKeys.slice(32);

    this.#keyChain.push(RK);
    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;

    if (this.#receiving.counter <= PN) {
      await this.#receiving.setCounter(PN);
    }

    const sr = new SymmetricRatchet();
    sr.initKey(CKr);
    this.#receiving = sr;
    this.#memories[otherPublicKey] = sr;
    this.#actives.push(sr);
    if (this.#actives.length > MAX_ACTIVE_CHAINS) {
      const tooOld = this.#actives.shift();
      tooOld.clear();
    }
  }

  get publicKey() {
    if (!this.#myPublicKey) {
      throw new Error('DH is not started');
    }

    return this.#myPublicKey;
  }

  async initECDH() {
    if (this.#myPublicKey) {
      throw new Error('ECDH already initialized');
    }
    await this.#resetEcdh();
  }

  async init(rootKey, otherPublicKey = false) {
    let sharedSecret = rootKey;
    if (!ArrayBuffer.isView(rootKey)) {
      sharedSecret = Helper.base64ToBuffer(rootKey);
    }
    this.#keyChain.push(sharedSecret);

    if (otherPublicKey) {
      await this.#ratchetSendingChain(otherPublicKey);
    }
  }

  async send(message, aad = false) {
    let AAD = aad;
    if (aad) {
      AAD = Helper.clearTextToBuffer(String(aad));
    }
    const encryption = await this.#sending.send(message, AAD);
    return {
      publicKey: this.publicKey,
      body: {
        ...encryption,
        PN: this.#previousCounter,
      },
    };
  }

  async receive(otherPublicKey, message, aad = false) {
    let AAD = aad;
    if (aad) {
      AAD = Helper.clearTextToBuffer(String(aad));
    }
    if (this.#memories[otherPublicKey]) {
      if (this.#memories[otherPublicKey].active) {
        const result = await this.#memories[otherPublicKey].receive(message, AAD);
        return result;
      }
      throw new Error('Receiving chain too old');
    }

    const { PN } = message;

    await this.#ratchetReceivingChain(otherPublicKey, PN);
    await this.#ratchetSendingChain(otherPublicKey);

    const result = await this.#receiving.receive(message, AAD);
    return result;
  }
}
```

</td>
<td>

```javascript
const MAX_ACTIVE_CHAINS = 5;
class DoubleRatchet {
  #ecdh;

  #keyChain = [];

  #sending = new SymmetricRatchet();

  #receiving = new SymmetricRatchet();

  #memories = {};

  #actives = [];

  #previousCounter = -1;

  #ratchetSendingChain(otherPublicKey) {
    const pk = Buffer.from(otherPublicKey, 'base64');

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    this.#ecdh = crypto.createECDH('prime256v1');
    this.#ecdh.generateKeys();
    const dhOut = this.#ecdh.computeSecret(pk);

    const info = Buffer.from(`double-ratchet-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      dhOut,
      lastKey,
      info,
      64,
    );
    const bufferKeys = Buffer.from(hkdfUIntArray);
    const RK = bufferKeys.subarray(0, 32);
    const CKs = bufferKeys.subarray(32);

    this.#keyChain.push(RK);
    lastKey.fill();
    this.#keyChain[counter] = false;

    this.#previousCounter = this.#sending.counter;

    this.#sending.clear();
    const sr = new SymmetricRatchet();
    sr.initKey(CKs);
    this.#sending = sr;
  }

  #ratchetReceivingChain(otherPublicKey, PN) {
    const pk = Buffer.from(otherPublicKey, 'base64');

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    const dhOut = this.#ecdh.computeSecret(pk);

    const info = Buffer.from(`double-ratchet-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      dhOut,
      lastKey,
      info,
      64,
    );
    const bufferKeys = Buffer.from(hkdfUIntArray);
    const RK = bufferKeys.subarray(0, 32);
    const CKr = bufferKeys.subarray(32);

    this.#keyChain.push(RK);
    lastKey.fill();
    this.#keyChain[counter] = false;

    if (this.#receiving.counter <= PN) {
      this.#receiving.counter = PN;
    }

    const sr = new SymmetricRatchet();
    sr.initKey(CKr);
    this.#receiving = sr;
    this.#memories[otherPublicKey] = sr;
    this.#actives.push(sr);
    if (this.#actives.length > MAX_ACTIVE_CHAINS) {
      const tooOld = this.#actives.shift();
      tooOld.clear();
    }
  }

  constructor() {
    this.#ecdh = crypto.createECDH('prime256v1');
    this.#ecdh.generateKeys();
  }

  get publicKey() {
    return this.#ecdh.getPublicKey('base64');
  }

  init(rootKey, otherPublicKey = false) {
    let sharedSecret = rootKey;
    if (!Buffer.isBuffer(rootKey)) {
      sharedSecret = Buffer.from(rootKey, 'base64');
    }
    this.#keyChain.push(sharedSecret);

    if (otherPublicKey) {
      this.#ratchetSendingChain(otherPublicKey);
    }
  }

  send(message, aad = false) {
    let AAD = aad;
    if (aad) {
      AAD = Buffer.from(String(aad));
    }
    return {
      publicKey: this.publicKey,
      body: {
        ...this.#sending.send(message, AAD),
        PN: this.#previousCounter,
      },
    };
  }

  receive(otherPublicKey, message, aad = false) {
    let AAD = aad;
    if (aad) {
      AAD = Buffer.from(String(aad));
    }
    if (this.#memories[otherPublicKey]) {
      if (this.#memories[otherPublicKey].active) {
        return this.#memories[otherPublicKey].receive(message, AAD);
      }
      throw new Error('Receiving chain too old');
    }

    const { PN } = message;

    this.#ratchetReceivingChain(otherPublicKey, PN);
    this.#ratchetSendingChain(otherPublicKey);

    return this.#receiving.receive(message, AAD);
  }
}
```

</td>
</tr>
</table>
