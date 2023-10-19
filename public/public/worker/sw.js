const TITLE = {
  mail: 'You\'ve got mail!',
  'group-add': 'New member in the chat',
  'group-remove': 'A member has left the chat',
  'group-revokation': 'A member has been expelled from the chat',
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('push', (event) => {
  const { action, ...msg } = event.data.json();

  const options = {
    body: TITLE[action],
    icon: '/img/notification-icon.png',
    data: {},
    vibrate: [200, 100, 200],
    tag: `new-${action}`,
    badge: '/img/notification-badge.png',
  };

  if (action === 'mail') {
    const bc = new BroadcastChannel('new_mail');
    bc.postMessage(msg);
    // Check for support first.
    if (navigator.setAppBadge) {
    // Display the number of unread messages.
      navigator.setAppBadge(msg.unread);
    }
  } else if (['group-add', 'group-remove', 'group-revokation'].includes(action)) {
    const bc = new BroadcastChannel('group_change');
    bc.postMessage(msg);
  }
  self.registration.showNotification('ySyPyA', options);
});

self.onmessage = function (e) {
  const { action, unread, text } = e.data;

  if (action === 'updatebadge') {
    // Check for support first.
    if (navigator.setAppBadge) {
      if (unread > 0) {
        navigator.setAppBadge(unread);
      } else {
        navigator.clearAppBadge();
      }
    }
  }
  if (action === 'notify') {
    const options = {
      body: text,
      icon: '/img/notification-icon.png',
      data: {},
      vibrate: [200, 100, 200],
      tag: 'toaster',
      badge: '/img/notification-badge.png',
    };
    self.registration.showNotification('ySyPyA', options);
  }
};
