const AWSXRay = require('aws-xray-sdk-core');

function getAllMethodNames(obj, ignoreList = []) {
  const methods = {};
  const baseObjectProps = [
    'prototype',
    ...ignoreList,
    ...Object.getOwnPropertyNames(Reflect.getPrototypeOf({})),
    ...Object.getOwnPropertyNames(Reflect.getPrototypeOf(Object)),
  ];
  let val = obj;
  while (val) {
    const list = Object.getOwnPropertyNames(val);
    const l = list.length;
    for (let i = 0; i < l; i += 1) {
      const key = list[i];
      if (!baseObjectProps.includes(key) && (val[key].constructor.name === 'Function' || val[key].constructor.name === 'AsyncFunction')) {
        methods[key] = val[key].constructor.name;
      }
    }
    val = Reflect.getPrototypeOf(val);
  }
  return methods;
}

function getUnknowndName(unknown) {
  const str = unknown.toString();
  if (str.startsWith('class')) {
    const classNameAndRest = str.substring(6);
    const firstSpace = classNameAndRest.indexOf(' ');
    return classNameAndRest.substring(0, firstSpace);
  }
  return unknown.constructor.name;
}

function getProxy(obj, methods) {
  const domain = getUnknowndName(obj);
  const handler = {
    get(...args) {
      const [t1, prop] = args;
      if (methods[prop]) {
        return new Proxy(Reflect.get(...args), {
          apply(t2, thisArg, argumentsList) {
            if (methods[prop] === 'Function') {
              return AWSXRay.captureFunc(`${domain}.${prop}`, (subsegment) => {
                subsegment.addAnnotation('domain', domain);
                subsegment.addAnnotation('subdomain_1', prop);
                t2.apply(thisArg, argumentsList);
              });
            }
            return XRayWrapper.captureAsyncFunc(`${domain}.${prop}`, t2.apply(thisArg, argumentsList));
          },
        });
      }
      return Reflect.get(...args);
    },
  };
  return new Proxy(obj, handler);
}

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

  static captureClass(customClass, config = {}) {
    const { ignoreList = [] } = config;
    const classMethods = getAllMethodNames(customClass, ignoreList);
    return getProxy(customClass, classMethods);
  }

  static captureClassInstance(instance, config = {}) {
    const { ignoreList = [] } = config;
    const classMethods = getAllMethodNames(instance, ignoreList);
    return getProxy(instance, classMethods);
  }
}
module.exports = XRayWrapper;
