Feature: Ws connection function Test

    Lambda called when there is a websocket connection to the API Getaway

Scenario: `RANDOM_USER.7` and `RANDOM_USER.9` connects and disconnect
    Given I am existing `RANDOM_USER.16`
    And I am existing `RANDOM_USER.19`
    And `RANDOM_USER.16` is connected
    And `RANDOM_USER.16` disconnects
    And `RANDOM_USER.19` is connected
    And `RANDOM_USER.19` is connected
    And `RANDOM_USER.19` disconnects

Scenario: `RANDOM_USER.9` and `RANDOM_USER.7` are chatting
    Given I am existing `RANDOM_USER.7`
    And I am existing `RANDOM_USER.9`
    And `RANDOM_USER.7` is connected
    And `RANDOM_USER.9` is connected
    And I prepare fallback message "Hello boy" for `RANDOM_USER.9`
    When `RANDOM_USER.7` send next fallback message to `RANDOM_USER.9`
    Then `RANDOM_USER.9` acknowledges reception to `RANDOM_USER.7`
    And `RANDOM_USER.9` decrypt content of message 0 from route fallback
    And response body path $.content should be "Hello boy"
    And response body path $.from should be `RANDOM_USER.7`
    And response body path $.requestId should be `REQ.RANDOM_USER.7`
    And I prepare fallback message "Glad youre here" for `RANDOM_USER.7`
    When `RANDOM_USER.9` send next fallback message to `RANDOM_USER.7`
    Then `RANDOM_USER.7` acknowledges reception to `RANDOM_USER.9`
    And `RANDOM_USER.7` decrypt content of message 0 from route fallback
    And response body path $.content should be "Glad youre here"
    And response body path $.from should be `RANDOM_USER.9`
    And response body path $.requestId should be `REQ.RANDOM_USER.9`

Scenario: Bad content send error
    Given I am existing `RANDOM_USER.7`
    And `RANDOM_USER.7` is connected
    And I prepare next message for `RANDOM_USER.7` as { "to": "`RANDOM_USER.7`", "content": "blablabla", "requestId": "4365c1e0-72e6-492c-8832-eada64272c86" }
    When `RANDOM_USER.7` send next fallback message to `RANDOM_USER.7`
    Then `RANDOM_USER.7` last message action match error

Scenario: Bad requestId send error
    Given I am existing `RANDOM_USER.7`
    And `RANDOM_USER.7` is connected
    And I set var ENCRYPTED_CONTENT to a 513 characters long base64 string
    And I prepare next message for `RANDOM_USER.7` as { "to": "`RANDOM_USER.7`", "content": "`ENCRYPTED_CONTENT`", "requestId": "plouf" }
    When `RANDOM_USER.7` send next fallback message to `RANDOM_USER.7`
    Then `RANDOM_USER.7` last message action match error

Scenario: Disconnected target send event
    Given I am existing `RANDOM_USER.9`
    Given I am existing `RANDOM_USER.7`
    And `RANDOM_USER.7` is connected
    And `RANDOM_USER.7` is listening
    And I prepare fallback message "Glad youre here" for `RANDOM_USER.9`
    When `RANDOM_USER.7` send next fallback message to `RANDOM_USER.9`
    Then I wait for 2 seconds
    Then `RANDOM_USER.7` last message action match disconnected
    And response body path $.message.username should be `RANDOM_USER.9`

Scenario: Get connection status of a list
  Given I am existing `RANDOM_USER.7`
  And `RANDOM_USER.7` is connected
  And I am existing `RANDOM_USER.8`
  And `RANDOM_USER.8` is connected
  And I am existing `RANDOM_USER.8`
  When I GET /connections?list=`RANDOM_USER.7`,`RANDOM_USER.10`,`RANDOM_USER.8`,`RANDOM_USER.2`
  And response body path $ should be of type array with length 2
  And response body path $.0 should be `RANDOM_USER.7`
  And response body path $.1 should be `RANDOM_USER.8`