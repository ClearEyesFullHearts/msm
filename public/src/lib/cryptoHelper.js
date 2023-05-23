class CryptoHelper {
    constructor(){
      this.clearTextToArBuff = (txt) => {
        const buf = new ArrayBuffer(txt.length)
        const bufView = new Uint8Array(buf)
        for (let i = 0, strLen = txt.length; i < strLen; i++) {
          bufView[i] = txt.charCodeAt(i)
        }
        return buf
      }
      this.base64ToArBuff = (base64EncodedKey) => {
        const str = window.atob(base64EncodedKey) // decode base64
        return this.clearTextToArBuff(str);
      }
      this.ArBuffToBase64 = (arBuff) => {
        const str = String.fromCharCode.apply(null, new Uint8Array(arBuff))
        return window.btoa(str)
      }
      
      this.importCryptoKey = (pem, format, keyType) => {
        const usage = keyType === 'PUBLIC' ? ['encrypt'] : ['decrypt'];
        // fetch the part of the PEM string between header and footer
        const pemHeader = `-----BEGIN ${keyType} KEY-----`
        const pemFooter = `-----END ${keyType} KEY-----`
        const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1)
  
        const binaryDer = this.base64ToArBuff(pemContents)
  
        return window.crypto.subtle.importKey(
          format,
          binaryDer,
          {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
          },
          false,
          usage
        )
      }
      this.exportCryptoKey = async (key, format, keyType) => {
        const exported = await window.crypto.subtle.exportKey(format, key)
        const exportedAsBase64 = this.ArBuffToBase64(exported)
        const pemExported = `-----BEGIN ${keyType} KEY-----\n${exportedAsBase64}\n-----END ${keyType} KEY-----`
  
        return pemExported
      }
    }
  
    async generateKeyPair() {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      )
  
      const PK = await this.exportCryptoKey(keyPair.publicKey, 'spki', 'PUBLIC')
      const SK = await this.exportCryptoKey(keyPair.privateKey, 'pkcs8', 'PRIVATE')
  
      return {
        PK,
        SK
      }
    }
  
    async challenge(pem, dataStr) {
      const { passphrase, iv, token } = await this.symmetricEncrypt(dataStr)
      const clearPass = window.atob(passphrase)
      const cryptedPass = await this.publicEncrypt(pem, clearPass)
  
      return {
        iv,
        passphrase: cryptedPass,
        token
      }
    }
  
    async resolve(pem, { token, passphrase, iv }) {
      const clearPassBuff = await this.privateDecrypt(pem, passphrase)
      const authBuff = await this.symmetricDecrypt(clearPassBuff, iv, token);
      const dec = new TextDecoder();
      return dec.decode(authBuff);
    }
  
    async publicEncrypt(pem, plaintext) {
      const importedKey = await this.importCryptoKey(pem, 'spki', 'PUBLIC');
      const arrTxt = this.clearTextToArBuff(plaintext);
  
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        importedKey,
        arrTxt
      )
      
      return this.ArBuffToBase64(encrypted)
    }
  
    async privateDecrypt(pem, cryptedText) {
      const importedKey = await this.importCryptoKey(pem, 'pkcs8', 'PRIVATE')
      const cypherTxt = this.base64ToArBuff(cryptedText)
  
      const decripted = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        importedKey,
        cypherTxt
      )
      
      return decripted
    }
  
    async symmetricEncrypt(txt) {
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const arrPass = crypto.getRandomValues(new Uint8Array(32));
      const arrTxt = this.clearTextToArBuff(txt)
      const key = await window.crypto.subtle.importKey(
              'raw',
              arrPass,
              {
                  name: 'AES-GCM',
          iv
              },
              false,
              ['encrypt']
          )
  
      const ctBuffer = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv
      }, key, arrTxt);
  
      return {
        iv: this.ArBuffToBase64(iv),
        passphrase: this.ArBuffToBase64(arrPass),
        token: this.ArBuffToBase64(ctBuffer)
      }
    }
  
    async symmetricDecrypt(pass, iv, cryptedText) {
      const arrIV = this.base64ToArBuff(iv);
      let arrPass = pass
      if(Object.prototype.toString.call(pass) === "[object String]"){
        arrPass = this.base64ToArBuff(pass);
      }
      const arrCryptedText = this.base64ToArBuff(cryptedText);
  
          const importedKey = await window.crypto.subtle.importKey(
              'raw',
              arrPass,
              {
                  name: 'AES-GCM'
              },
              false,
              ['encrypt', 'decrypt']
          )
  
          const decripted = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: arrIV },
              importedKey,
              arrCryptedText
          )
      return decripted
    }
  }
  
  export default CryptoHelper
  