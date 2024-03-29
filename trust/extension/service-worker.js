import config from './config.js';

let tabId;
let scriptReady = false;
let isAttached = false;
let memory = {};
const { COMMIT, BASE_URL, ...map } = config;
let resultMap = [];

function responseResult(url, hash) {
  if (!map[url]) {
    if (scriptReady) {
      chrome.tabs.sendMessage(tabId, {
        action: {
          type: 'VALIDATION',
          url,
          result: 'UNKNOWN_URL',
        },
      });
    } else {
      resultMap.push({
        url,
        result: 'UNKNOWN_URL',
      });
    }
  } else if (map[url] === hash) {
    if (scriptReady) {
      chrome.tabs.sendMessage(tabId, {
        action: {
          type: 'VALIDATION',
          url,
          result: 'SUCCESS',
        },
      });
    } else {
      resultMap.push({
        url,
        result: 'SUCCESS',
      });
    }
  } else if (scriptReady) {
    chrome.tabs.sendMessage(tabId, {
      action: {
        type: 'VALIDATION',
        url,
        result: 'FAILURE',
      },
    });
  } else {
    resultMap.push({
      url,
      result: 'FAILURE',
    });
  }
}

function getHash(txt) {
  const arrTxt = new ArrayBuffer(txt.length);
  const bufView = new Uint8Array(arrTxt);
  for (let i = 0, strLen = txt.length; i < strLen; i += 1) {
    bufView[i] = txt.charCodeAt(i);
  }
  return crypto.subtle.digest({
    name: 'SHA-256',
  }, arrTxt)
    .then((digest) => {
      const str = String.fromCharCode.apply(null, new Uint8Array(digest));
      return btoa(str);
    });
}

function ToBinary(txt) {
  let result = '';

  const str = encodeURIComponent(txt);

  for (let i = 0; i < str.length; i += 1) {
    if (str[i] === '%') {
      result += String.fromCharCode(parseInt(str.substring(i + 1, i + 3), 16));
      i += 2;
    } else result += str[i];
  }

  return result;
}

function onClientReady(request) {
  if (request.action.type === 'READY') {
    if (isAttached) {
      chrome.tabs.sendMessage(tabId, {
        action: {
          type: 'RESULT',
          data: resultMap,
        },
      });
      resultMap = [];
      // fetching the content of the website service worker file to hash and compare
      // because it doesn't trigger any event even the first time it registers
      // No external code is being used here
      fetch(`${BASE_URL}worker/sw.js`)
        .then((response) => response.text())
        .then((sw) => getHash(btoa(ToBinary(sw))))
        .then((hash) => {
          console.log('loadingFinished', `${BASE_URL}worker/sw.js`);
          responseResult(`${BASE_URL}worker/sw.js`, hash);
        })
        .catch(console.error);
    }
    scriptReady = true;
  }
}
function onURLChange(id, changeInfo) {
  const { url, status } = changeInfo;
  if (isAttached && status === 'loading' && url && url !== BASE_URL) {
    chrome.debugger.detach({ tabId: id }).then(() => {
      onDetaching();
    });
  }
}
function onDetaching() {
  isAttached = false;
  scriptReady = false;
  memory = {};
  chrome.runtime.onMessage.removeListener(onClientReady);
  chrome.tabs.onUpdated.removeListener(onURLChange);
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url === BASE_URL) {
    if (isAttached) {
      chrome.debugger.detach({ tabId: tab.id }).then(() => {
        onDetaching();
      });
    } else {
      chrome.debugger.attach({ tabId: tab.id }, '1.2')
        .then(() => {
          tabId = tab.id;
          isAttached = true;
          chrome.debugger.sendCommand(
            { tabId: tab.id },
            'Network.enable',
            {},
          )
            .then(() => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
              } else {
                chrome.tabs.sendMessage(tabId, {
                  action: {
                    type: 'START',
                  },
                }).catch((err) => {
                  console.log('Not ready yet');
                });
                chrome.runtime.onMessage.addListener(onClientReady);
                chrome.tabs.onUpdated.addListener(onURLChange);
              }
            });
        });
    }
  } else {
    console.log('Debugger can only be attached to ySyPyA Home Page.', tab.url);
  }
});

chrome.debugger.onDetach.addListener(
  () => {
    onDetaching();
  },
);

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.responseReceived') {
    memory[params.requestId] = params.response.url;
  }
  if (method === 'Network.loadingFinished') {
    chrome.debugger.sendCommand(
      { tabId },
      'Network.getResponseBody',
      { requestId: params.requestId },
    )
      .then((result) => {
        if (chrome.runtime.lastError) {
          return console.error(chrome.runtime.lastError);
        }
        if (result.base64Encoded) {
          return getHash(result.body);
        }
        return getHash(btoa(ToBinary(result.body)));
      })
      .then((hash) => {
        console.log('loadingFinished', memory[params.requestId]);
        responseResult(memory[params.requestId], hash);
      });
  }
});
