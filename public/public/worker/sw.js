const TITLE = {
  mail: 'You\'ve got mail!',
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
    tag: 'new-message',
    badge: '/img/notification-badge.png',
  };

  const bc = new BroadcastChannel('new_mail');
  bc.postMessage(msg);

  if (action === 'mail') {
    // Check for support first.
    if (navigator.setAppBadge) {
    // Display the number of unread messages.
      navigator.setAppBadge(msg.unread);
    }
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
