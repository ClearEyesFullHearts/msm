const crypto = require('crypto');
const DoubleRatchet = require('./integration/features/support/doubleRatchet');

const then = Date.now();

const alice = new DoubleRatchet('alice');
const bob = new DoubleRatchet('bob');

const RKa = crypto.randomBytes(32);
const RKb = Buffer.from(RKa);
alice.init(RKa, bob.publicKey);
bob.init(RKb);

const message0 = alice.send('Hello Bob!');
const received0 = bob.receive(message0.publicKey, message0.body);

console.log(received0);

const message1 = alice.send('How are you?');
const received1 = bob.receive(message1.publicKey, message1.body);

console.log(received1);

const message2 = bob.send('Hello! I\'m fine and you?');
const received2 = alice.receive(message2.publicKey, message2.body);

console.log(received2);

const message3 = alice.send('Are you here?');
const message4 = alice.send('I cannot hear you?');
const message5 = alice.send('Helloooooo');
const received3 = bob.receive(message3.publicKey, message3.body);

console.log(received3);

const message6 = bob.send('Hello again, I\'m here');
const received4 = alice.receive(message6.publicKey, message6.body);

console.log(received4);

const message7 = alice.send('Lost you for a while, good to see you');
const received5 = bob.receive(message7.publicKey, message7.body);

console.log(received5);

const received6 = bob.receive(message5.publicKey, message5.body);

console.log(received6);

const received7 = bob.receive(message4.publicKey, message4.body);

console.log(received7);

console.log(`Duration: ${Date.now() - then} ms`)