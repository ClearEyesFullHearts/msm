class FileHelper {
  static download(fileName, content) {
    const a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([content]));
    a.download = fileName;

    // Append anchor to body.
    document.body.appendChild(a);
    a.click();

    // Remove anchor from body
    document.body.removeChild(a);
  }

  static async onFilePicked(evt, actionCall) {
    const { files } = evt.target;

    const content = await this.loadTextFromFile(files);

    await actionCall(content);
  }

  static async loadTextFromFile(files) {
    return new Promise((resolve) => {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.readAsText(file);
    });
  }
}

export default FileHelper;
