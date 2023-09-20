const TITLE = {
  mail: 'You\'ve got mail!',
};

self.addEventListener('push', (event) => {
  const { type, ...msg } = event.data.json();
  console.log('worker event', event.data.json());
  const options = {
    body: TITLE[type],
    icon: '/img/notification-icon.png',
    data: {},
    vibrate: [200, 100, 200],
    tag: 'new-message',
    badge: '/img/notification-badge.png',
  };
  self.registration.showNotification('ySyPyA', options);

  if (type === 'mail') {
    // Check for support first.
    if (navigator.setAppBadge) {
    // Display the number of unread messages.
      navigator.setAppBadge(msg.unread);
    }
  }
});

self.onmessage = function (e) {
  const { action, unread } = e.data;

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
};
