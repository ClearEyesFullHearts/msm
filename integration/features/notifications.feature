Feature: Notification function Test

    Lambda called when there is a message written for a user

Scenario: Set up a subscription
  Given I am existing `RANDOM_USER.5`
  And I set var SUB_AUTH to a 22 characters long string
  And I set var SUB_P256DH to a 87 characters long string
  And I set body to { "endpoint": "https://fcm.googleapis.com/fcm/send/gibberish", "keys": { "auth": "`SUB_AUTH`", "p256dh": "`SUB_P256DH`" } }
  And I set signature header
  When I POST to /subscription
  Then response code should be 201

Scenario: You can only subscribe to real web push server
  Given I am existing `RANDOM_USER.5`
  And I set var SUB_AUTH to a 22 characters long string
  And I set var SUB_P256DH to a 87 characters long string
  And I set body to { "endpoint": "https://webpush.googleapis.com/gibberish", "keys": { "auth": "`SUB_AUTH`", "p256dh": "`SUB_P256DH`" } }
  And I set signature header
  When I POST to /subscription
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Connected target is notified when they received a message
  Given I am existing `RANDOM_USER.11`
  And `RANDOM_USER.11` is connected
  And `RANDOM_USER.11` is listening
  And  mat write a message as { "to": "`RANDOM_USER.11`" , "title": "Write one message" , "content": "My message content" }
  Then I wait for 3 seconds
  Then `RANDOM_USER.11` last message action is mail
  And response body path $.message.from should be mat