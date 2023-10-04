Feature: Single Test

    For a single

Scenario: Unknown username returns an error
    When I GET /identity/Unknown
    Then response code should be 404
    And response body path $.code should be UNKNOWN_USER

Scenario: Message that have been read are cleaned up when they were missed
    Given I am authenticated user mat
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
    And I GET /inbox
    Then response body path $ should be of type array with length 0