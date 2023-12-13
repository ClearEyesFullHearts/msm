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
export default Helper;
