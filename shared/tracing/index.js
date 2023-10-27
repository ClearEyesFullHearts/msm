const AWSXRay = require('aws-xray-sdk-core');

class XRayWrapper {
  static captureAWSv3Client(v3Client) {
    return AWSXRay.captureAWSv3Client(v3Client);
  }

  static async captureAsyncFunc(subSegmentName, func, monitoring = {}) {
    return new Promise((resolve, reject) => {
      AWSXRay.captureAsyncFunc(subSegmentName, (subsegment) => {
        subSegmentName.split('.').forEach((d, i) => {
          if (i === 0) {
            subsegment.addAnnotation('domain', d);
          } else {
            subsegment.addAnnotation(`subdomain_${i}`, d);
          }
        });
        const { annotations, metadatas } = monitoring;
        if (annotations) {
          Object.keys(annotations).forEach((p) => subsegment.addAnnotation(p, annotations[p]));
        }
        if (metadatas) {
          Object.keys(metadatas).forEach((p) => subsegment.addMetadata(p, metadatas[p]));
        }

        func
          .then((result) => {
            subsegment.close();
            resolve(result);
          })
          .catch((err) => {
            subsegment.close(err);
            reject(err);
          });
      });
    });
  }

  static async captureInitializationFunc(segmentName, func) {
    return new Promise((resolve, reject) => {
      const segment = new AWSXRay.Segment(segmentName);
      const ns = AWSXRay.getNamespace();

      ns.run(() => {
        AWSXRay.setSegment(segment);

        func
          .then(() => {
            segment.close();
            resolve();
          })
          .catch((err) => {
            segment.close(err);
            reject(err);
          });
      });
    });
  }
}
module.exports = XRayWrapper;
