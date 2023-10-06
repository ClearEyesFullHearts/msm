const COMMIT = 'c4c91f37b20c496544ff8828b90219066362c153';
const commitHash = document.querySelector('#commitHash');

if (commitHash) {
  const text = commitHash.textContent;
  const isVersion = text === COMMIT;

  const targetDiv = document.querySelector('#validationText');

  const badge = document.createElement('div');
  badge.className = 'alert';
  // Use the same styling as the publish information in an article's header
  badge.classList.add('alert-primary', 'text-center');

  targetDiv.insertAdjacentElement('beforeend', badge);

  const badgeText = document.createElement('p');
  badge.insertAdjacentElement('beforeend', badgeText);
  if (isVersion) {
    badgeText.textContent = 'Start validating, click on the extension icon!';
  } else {
    badgeText.textContent = 'ySyPyA validating extension is out of date, please search for a new version before validating this website.';
    badge.classList.remove('alert-primary');
    badge.classList.add('alert-warning');
  }
  const validationSuccess = document.createElement('p');
  badge.insertAdjacentElement('beforeend', validationSuccess);
  const validationFailure = document.createElement('p');
  badge.insertAdjacentElement('beforeend', validationFailure);

  const wholeResult = {
    success: [],
    failure: [],
  };
  const onValidationResult = (url, result) => {
    if (result === 'SUCCESS') {
      wholeResult.success.push(url);
      validationSuccess.textContent = `Number of matches: ${wholeResult.success.length} files`;
    }
    if (result === 'FAILURE') {
      wholeResult.failure.push(url);
      validationFailure.textContent = `Number of mismatches: ${wholeResult.failure.length} files`;
    }
    if (result === 'UNKNOWN_URL') {
      wholeResult.failure.push(url);
      validationFailure.textContent = `Number of mismatches: ${wholeResult.failure.length} files`;
    }
    if (wholeResult.failure.length > 0) {
      badge.classList.remove('alert-primary', 'alert-warning');
      badge.classList.add('alert-danger');
      validationSuccess.textContent = 'Failure!';
    } else if (wholeResult.success.length > 0) {
      badge.classList.remove('alert-primary', 'alert-warning');
      badge.classList.add('alert-success');
      validationFailure.textContent = 'Success!';
    }
  };

  chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      console.log('message', request.action.type);
      switch (request.action.type) {
        case 'START':
          badgeText.textContent = 'Reload the page to validate!';
          break;
        case 'VALIDATION':
          badgeText.textContent = 'Validation ended';
          onValidationResult(request.action.url, request.action.result);
          break;
        case 'RESULT':
          badgeText.textContent = 'Validating!';
          request.action.data.forEach((d) => {
            onValidationResult(d.url, d.result);
          });
          break;
        default:
          break;
      }
    },
  );

  chrome.runtime.sendMessage({
    action: {
      type: 'READY',
    },
  }).catch(() => {
    console.log('No worker');
  });
} else {
  console.log('commitHash not found');
}
