const AWSXRay = require('aws-xray-sdk');

class XRayWrapper {
  static captureAWSv3Client(v3Client) {
    return AWSXRay.captureAWSv3Client(v3Client);
  }

  static async captureAsyncFunc(segmentName, func) {
    return new Promise((resolve, reject) => {
      AWSXRay.captureAsyncFunc(segmentName, (subsegment) => {
        func
          .then((result) => {
            resolve(result);
            subsegment.close();
          })
          .catch((err) => {
            reject(err);
            subsegment.close(err);
          });
      });
    });
  }
}
module.exports = XRayWrapper;
