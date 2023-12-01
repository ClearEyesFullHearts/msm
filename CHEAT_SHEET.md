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
    // alternatively we could do
    // return new TextEncoder().encode(txt).buffer;
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
    // alternatively we could do
    // return new TextDecoder().decode(buffer);
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

const iv = Helper.getRandomBuffer(16);
const bufferTxt = Helper.clearTextToBuffer(textToEncrypt);
const bufferCypher = await window.crypto.subtle.encrypt({
  name: 'AES-GCM',
  iv,
  tagLength: 128, //length of the auth tag
}, key, bufferTxt);

return {
  cypher: Helper.bufferToBase64(bufferCypher),
  iv: Helper.bufferToBase64(iv),
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
    iv,
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