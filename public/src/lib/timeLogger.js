class TimeLogger {
  constructor(file) {
    this.file = file;
    this.now = 0;
    this.time = 0;
    this.counter = 0;
  }

  start() {
    this.now = Date.now();
    this.counter = 0;
  }

  logTime(txt) {
    this.time = Date.now();
    console.log(`${this.file} - ${this.counter}: ${txt}`, this.time - this.now);
    this.now = this.time;
    this.counter += 1;
  }
}

export default TimeLogger;
