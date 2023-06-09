Feature: Login

    Identification for a user

Scenario: Get our user authentication data
    Given I am a new invalidated user
    When I GET /identity/`MY_AT`
    Then response code should be 200
    And response body match a challenge
    And response body path $.user.username should be `MY_AT`
    And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$

Scenario: Unknown username returns an error
    When I GET /identity/Unknown
    Then response code should be 404
    And response body path $.code should be UNKNOWN_USER

Scenario: Username should be at least 3 characters long
    When I GET /identity/us
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should be less than 125 characters long
    Given I set var AT_TOO_LONG to a 126 characters long string
    When I GET /identity/`AT_TOO_LONG`
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should not contain any special character
    When I GET /identity/<script>
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Authenticated user has access to its inbox
    Given I am a new invalidated user
    And I GET /identity/`MY_AT`
    And response body match a challenge
    And I store the value of body path $.token as access token
    And I set bearer token
    When I GET /inbox
    Then response code should be 200
    And response body path $ should be of type array with length 1
    And response body path $.0.id should be ^[0-9]\d*$
    And response body path $.0.challenge match a challenge

Scenario: Authentication is mandatory to search user's list
    When I GET /users?search=mat
    Then response code should be 401

Scenario: Authentication is mandatory to get user's detail
    When I GET /user/mat
    Then response code should be 401

Scenario: Authentication is mandatory to get one's inbox
    When I GET /inbox
    Then response code should be 401

Scenario: Authentication is mandatory to get a full message
    When I GET /message/1
    Then response code should be 401