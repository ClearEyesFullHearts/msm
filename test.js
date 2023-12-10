const crypto = require('crypto');
const SimpleRatchet = require('./integration/features/support/simpleRatchet');

const alice = new SimpleRatchet();
const bob = new SimpleRatchet();

alice.initChains(true, bob.publicKey);
bob.initChains(false, alice.publicKey);

const message0 = alice.send('Hello Bob!');
const received0 = bob.receive(message0);

console.log(received0);

const message1 = alice.send('How are you?');
const received1 = bob.receive(message1);

console.log(received1);

const message2 = bob.send('Hello! I\'m fine and you?');
const received2 = alice.receive(message2);

console.log(received2);