Feature: Single Test

    For a single

Scenario: Unknown username returns an error
  Given I set var FALSE_PASS to a 33 characters long base64 string
  And I set X-msm-Pass header to `FALSE_PASS`
  When I GET /identity/Unknown
  Then response code should be 404
  And response body path $.code should be UNKNOWN_USER
  
Scenario: Connected targets are notified when they received a message from group
  Given `RANDOM_USER.1` creates a group firstNameGroup for ["`RANDOM_USER.2`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  And `RANDOM_USER.1` is connected
  And `RANDOM_USER.1` is listening
  And I am existing `RANDOM_USER.2`
  And `RANDOM_USER.2` is connected
  And `RANDOM_USER.2` is listening
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
  Then `RANDOM_USER.2` last message action match mail
  And response body path $.message.from should be `GROUP_ID.0`
  Then `RANDOM_USER.3` last message action match mail
  And response body path $.message.from should be `GROUP_ID.0`

Scenario: `RANDOM_USER.16` and `RANDOM_USER.19` connects and disconnect
    Given I am existing `RANDOM_USER.16`
    And I am existing `RANDOM_USER.19`
    And `RANDOM_USER.16` is connected
    And `RANDOM_USER.16` disconnects
    And `RANDOM_USER.19` is connected
    And `RANDOM_USER.19` is connected
    And `RANDOM_USER.19` disconnects