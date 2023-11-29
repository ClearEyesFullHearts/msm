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

@Online
Scenario: Connected target is notified when they received a message
  Given I am existing `RANDOM_USER.10`
  And `RANDOM_USER.10` is connected
  And `RANDOM_USER.10` is listening
  And  mat write a message as { "to": "`RANDOM_USER.10`" , "title": "Write one message" , "content": "My message content" }
  Then I wait for 3 seconds
  Then `RANDOM_USER.10` last message action match mail
  And response body path $.message.from should be mat

@Online
Scenario: Connected targets are notified when they received a message from group
  Given `RANDOM_USER.1` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  And `RANDOM_USER.1` is connected
  And `RANDOM_USER.1` is listening
  And I am existing `RANDOM_USER.14`
  And `RANDOM_USER.14` is connected
  And `RANDOM_USER.14` is listening
  And I am existing `RANDOM_USER.3`
  And `RANDOM_USER.3` is connected
  And `RANDOM_USER.3` is listening
  And I am existing `RANDOM_USER.4`
  And I set group message body to { "title": "Write one group message" , "content": "My group message content" }
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/message
  Then I wait for 3 seconds
  Then `RANDOM_USER.1` last message action match mail
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.14` last message action match mail
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.3` last message action match mail
  And response body path $.message.from should be `GROUP_ID.0`

@Online
Scenario: When a member is added others are notified
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`"] with index 0
  And I am existing `RANDOM_USER.5`
  And I am existing `RANDOM_USER.1`
  And `RANDOM_USER.1` is connected
  And `RANDOM_USER.1` is listening
  And I am existing `RANDOM_USER.14`
  And `RANDOM_USER.14` is connected
  And `RANDOM_USER.14` is listening
  And I am existing `RANDOM_USER.3`
  And `RANDOM_USER.3` is connected
  And `RANDOM_USER.3` is listening
  And I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.5`
  And I set body to { "username": "`RANDOM_USER.5`", "key": "`GK.5`"}
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/member
  Then I wait for 5 seconds
  Then `RANDOM_USER.1` last message action match connected
  Then `RANDOM_USER.14` last message action match group-add
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.3` last message action match group-add
  And response body path $.message.from should be `GROUP_ID.0`

@Online
Scenario: When a member quit, others are notified
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.5`"] with index 0
  And I am existing `RANDOM_USER.1`
  And `RANDOM_USER.1` is connected
  And `RANDOM_USER.1` is listening
  And I am existing `RANDOM_USER.14`
  And `RANDOM_USER.14` is connected
  And `RANDOM_USER.14` is listening
  And I am existing `RANDOM_USER.3`
  And `RANDOM_USER.3` is connected
  And `RANDOM_USER.3` is listening
  And I am existing `RANDOM_USER.5`
  And I set signature header
  When I DELETE /group/`GROUP_ID.0`/member
  Then I wait for 5 seconds
  Then `RANDOM_USER.1` last message action match group-remove
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.14` last message action match group-remove
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.3` last message action match group-remove
  And response body path $.message.from should be `GROUP_ID.0`

@Online
Scenario: When a member is revoked others are notified
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.5`"] with index 0
  And I am existing `RANDOM_USER.1`
  And `RANDOM_USER.1` is connected
  And `RANDOM_USER.1` is listening
  And I am existing `RANDOM_USER.14`
  And `RANDOM_USER.14` is connected
  And `RANDOM_USER.14` is listening
  And I am existing `RANDOM_USER.3`
  And `RANDOM_USER.3` is connected
  And `RANDOM_USER.3` is listening
  And I am existing `RANDOM_USER.1`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.14`
  And I generate my group key for `RANDOM_USER.3`
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}, { "username": "`RANDOM_USER.3`", "key": "`GK.3`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.5`
  Then I wait for 5 seconds
  Then `RANDOM_USER.1` last message action match connected
  Then `RANDOM_USER.14` last message action match group-revokation
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.3` last message action match group-revokation
  And response body path $.message.from should be `GROUP_ID.0`