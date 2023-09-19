self.addEventListener('push', (event) => {
  const message = event.data.json();
  console.log('worker event', message);
  self.registration.showNotification(message.title, { body: message.text });
});
