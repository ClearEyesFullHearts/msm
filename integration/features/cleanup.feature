Feature: Lambda cleanup function Test

    Lambda called once a day to cleanup the database

Scenario: Non validated account are cleaned up when they were missed
    Given I save `RANDOM_USER.17`
    And I invalidate `RANDOM_USER.17`
    When I invoke the cleanup lambda function
    Then response body path $.usersCleared.missed should be 1
    Given I GET /attic/`RANDOM_USER.17`
    And response code should be 200
    And I store the value of body path $ as ATTIC in scenario scope
    And I set Pass header with `RANDOM_USER.17`
    When I GET /identity/`RANDOM_USER.17`
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT
    Given I load up random public keys
    And I set body to { "at": "`RANDOM_USER.17`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`", "pass":"`PASS`", "kill":"`KILL`" }
    When I POST to /users
    Then response code should be 201
    And I record `RANDOM_USER.17`

Scenario: Message that have been read are cleaned up when they were missed
    Given I invoke the cleanup lambda function
    And I am authenticated user mat
    And I set message body to { "to": "`RANDOM_USER.3`" , "title": "Write one message" , "content": "My message content" }
    And I set signature header
    When I POST to /message
    Then response code should be 201
    Given I am existing `RANDOM_USER.3`
    And I GET /inbox
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    Given I mark `RANDOM_USER.3` message with ID `FIRST_MSG_ID` as read
    When I invoke the cleanup lambda function
    Then response body path $.messagesCleared should be 1
    And I am existing `RANDOM_USER.3`
    And I GET /message/`FIRST_MSG_ID`
    Then response code should be 404

Scenario: User that are inactive are frozen
    Given I save `RANDOM_USER.15`
    And I mark `RANDOM_USER.15` as inactive
    When I invoke the cleanup lambda function
    Then response body path $.usersCleared.inactive should be 1
    Given I GET /attic/`RANDOM_USER.15`
    And response code should be 200
    And I store the value of body path $ as ATTIC in scenario scope
    And I set Pass header with `RANDOM_USER.15`
    When I GET /identity/`RANDOM_USER.15`
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT
    Given I load up random public keys
    And I set body to { "at": "`RANDOM_USER.15`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`", "pass":"`PASS`", "kill":"`KILL`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS
    And I record `RANDOM_USER.15`