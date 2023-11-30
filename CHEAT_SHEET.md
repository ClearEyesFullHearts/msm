# The ballad of Alice and Bob
Alice and Bob want to have fun with crypto in Javascript (Yeah!), the issue is that Alice have only access to the [SubtleCrypto](https://developer.mozilla.org/fr/docs/Web/API/SubtleCrypto) library in her browser and Bob have only access to the [crypto module](https://nodejs.org/api/crypto.html) from Node.JS.  
First they should agree on some terms. They will deal mostly with byte arrays, that they'll call buffers whatever their real type, strings, be it in clear text or in base64, and conversion from one to the other, that is encoding and decoding.  
They'll sometime have to produce random byte arrays too, for initialization vectors or salts, with different length.  
  
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
  
## Symmetric encryption