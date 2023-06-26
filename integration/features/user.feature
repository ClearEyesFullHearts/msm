Feature: User creation

    Create a new User with constraints

Scenario: Register a new user
    Given I load up user1 public keys
    And I set body to { "at": "user1", "key":`EPK`, "signature":`SPK` }
    When I POST to /users
    Then response code should be 201

Scenario: Username should be at least 3 characters long
    Given I load up user1 public keys
    And I set body to { "at": "us", "key":`EPK`, "signature":`SPK` }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should not contain any special character
    Given I load up user1 public keys
    And I set body to { "at": "user at large", "key":`EPK`, "signature":`SPK` }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should be less than 125 characters long
    Given I set var AT_TOO_LONG to a 126 characters long string
    And I load up user1 public keys
    And I set body to { "at": "`AT_TOO_LONG`", "key":`EPK`, "signature":`SPK` }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Key should not be less than 788 characters
    Given I set var KEY_TOO_SHORT to a 787 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":"`KEY_TOO_SHORT`", "signature":`SPK` }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Key should not be more than 788 characters
    Given I set var KEY_TOO_LONG to a 789 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":"`KEY_TOO_LONG`", "signature":`SPK` }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Key should be in a PK format
    Given I set var KEY_NO_FORMAT to a 788 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":"`KEY_NO_FORMAT`", "signature":`SPK` }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Signature should not be less than 268 characters
    Given I set var SIG_TOO_SHORT to a 267 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":"`SIG_TOO_SHORT`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Signature should not be more than 268 characters
    Given I set var SIG_TOO_LONG to a 269 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":"`SIG_TOO_LONG`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Signature should be in a PK format
    Given I set var SIG_NO_FORMAT to a 268 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":"`SIG_NO_FORMAT`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT