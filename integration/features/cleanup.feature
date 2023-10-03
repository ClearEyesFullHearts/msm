Feature: Lambda cleanup function Test

    Lambda called once a day to cleanup the database

Scenario: Non validated account are cleaned up when they were missed
    Given I save `RANDOM_USER.17`
    And I invalidate `RANDOM_USER.17`
    When I invoke the cleanup lambda function
    Then response body path $.usersCleared.missed should be 1
    When I GET /identity/`RANDOM_USER.17`
    Then response code should be 404
    And response body path $.code should be UNKNOWN_USER
    Given I load up user2 public keys
    And I set body to { "at": "`RANDOM_USER.17`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 201
    And I record `RANDOM_USER.17`

Scenario: Message that have been read are cleaned up when they were missed
    Given I am authenticated user mat
    And I set message body to { "to": "`RANDOM_USER.16`" , "title": "Write one message" , "content": "My message content" }
    And I set signature header
    When I POST to /message
    Then response code should be 201
    Given I am existing `RANDOM_USER.16`
    And I GET /inbox
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    Given I mark `RANDOM_USER.16` message with ID `FIRST_MSG_ID` as read
    When I invoke the cleanup lambda function
    Then response body path $.messagesCleared should be 1

Scenario: User that are inactive are frozen
    Given I save `RANDOM_USER.15`
    And I mark `RANDOM_USER.15` as inactive
    When I invoke the cleanup lambda function
    Then response body path $.usersCleared.inactive should be 1
    When I GET /identity/`RANDOM_USER.15`
    Then response code should be 404
    And response body path $.code should be UNKNOWN_USER
    Given I load up user2 public keys
    And I set body to { "at": "`RANDOM_USER.15`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS
    And I record `RANDOM_USER.15`