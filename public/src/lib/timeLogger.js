let now;
let time;
class TimeLogger {
  static start() {
    now = Date.now();
  }

  static logTime(txt) {
    time = Date.now();
    console.log(txt, time - now);
    now = time;
  }
}

export default TimeLogger;
