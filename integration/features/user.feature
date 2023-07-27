Feature: User creation

    Create a new User with constraints

Scenario: Register a new user
    Given I load up user1 public keys
    And I set body to { "at": "user1", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 201

Scenario: Username should be at least 3 characters long
    Given I load up user1 public keys
    And I set body to { "at": "us", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should not contain any special character
    Given I load up user1 public keys
    And I set body to { "at": "user at large", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should be less than 125 characters long
    Given I set var AT_TOO_LONG to a 126 characters long string
    And I load up user1 public keys
    And I set body to { "at": "`AT_TOO_LONG`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: I cannot register 2 users with the same username
    Given I load up user1 public keys
    And I set body to { "at": "user1", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    Given I load up user2 public keys
    And I set body to { "at": "user1", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS

Scenario: Usernames are case-sensitive
    Given I load up user1 public keys
    And I set body to { "at": "user1", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    Given I load up user2 public keys
    And I set body to { "at": "uSer1", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 201

Scenario: Key should not be less than 788 characters
    Given I set var KEY_TOO_SHORT to a 787 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":"`KEY_TOO_SHORT`", "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Key should not be more than 788 characters
    Given I set var KEY_TOO_LONG to a 789 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":"`KEY_TOO_LONG`", "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Key should be in a PK format
    Given I set var KEY_NO_FORMAT to a 788 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":"`KEY_NO_FORMAT`", "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Signature should not be less than 268 characters
    Given I set var SIG_TOO_SHORT to a 267 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":"`SIG_TOO_SHORT`", "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Signature should not be more than 268 characters
    Given I set var SIG_TOO_LONG to a 269 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":"`SIG_TOO_LONG`", "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Signature should be in a PK format
    Given I set var SIG_NO_FORMAT to a 268 characters long string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":"`SIG_NO_FORMAT`", "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Hash should not be less than 172 characters
    Given I set var SHA_TOO_SHORT to a 171 characters long base64 string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":`SPK`, "hash":"`SHA_TOO_SHORT`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Hash should not be more than 172 characters
    Given I set var SHA_TOO_LONG to a 173 characters long base64 string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":`SPK`, "hash":"`SHA_TOO_LONG`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Hash should be a base64 string
    Given I set var SHA_PLAIN_TEXT to a 172 characters long hex string
    And I load up user1 public keys
    And I set body to { "at": "user2", "key":`EPK`, "signature":`SPK`, "hash":"`SHA_PLAIN_TEXT`" }
    When I POST to /users
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: I cannot register 2 users with the same encryption key
    Given I am a new invalidated user
    And I load up user1 public keys
    And I load up user1 private keys
    And I hash and sign NEW_EPK and SPK into COMPUTED_SHA with NEW_SSK
    And I set body to { "at": "user2", "key":`NEW_EPK`, "signature":`SPK`, "hash":"`COMPUTED_SHA`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS

Scenario: I cannot register 2 users with the same signature key
    Given I am a new invalidated user
    And I load up user1 public keys
    And I hash and sign EPK and NEW_SPK into COMPUTED_SHA with NEW_SSK
    And I set body to { "at": "user2", "key":`EPK`, "signature":`NEW_SPK`, "hash":"`COMPUTED_SHA`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS

Scenario: Inactivate user is removed after a time
    Given I am a new invalidated user
    And I wait for 300 ms
    And I set body to { "at": "`MY_AT`", "key":`NEW_EPK`, "signature":`NEW_SPK`, "hash":"`NEW_SHA`" }
    When I POST to /users
    Then response code should be 201

Scenario: You cannot create a user with a false encryption key
    Given I generate a false encryption key
    And I set body to { "at": "`MY_AT`", "key":`NEW_EPK`, "signature":`NEW_SPK`, "hash":"`NEW_SHA`" }
    When I POST to /users
    Then response code should be 500
    And response body path $.code should be SERVER_ERROR

Scenario: You cannot create a user with a false signature key
    Given I generate a false signature key
    And I set body to { "at": "`MY_AT`", "key":`NEW_EPK`, "signature":`NEW_SPK`, "hash":"`NEW_SHA`" }
    When I POST to /users
    Then response code should be 500
    And response body path $.code should be SERVER_ERROR

Scenario: A new user should validate its account by requesting the first message
    Given I am a new invalidated user
    And I GET /identity/`MY_AT`
    And response body match a challenge
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response body path $.0.id should be ^[0-9]\d*$
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    When I GET /message/`FIRST_MSG_ID`
    Then response code should be 200
    And response body path $.id should be ^[0-9]\d*$
    And response body path $ should match a challenge
    And resolved challenge path $.from should match @do not reply to this message
    And I wait for 300 ms
    And I set body to { "at": "`MY_AT`", "key":`NEW_EPK`, "signature":`NEW_SPK`, "hash":"`NEW_SHA`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS

Scenario: A user can delete its account
    Given I am a new invalidated user
    And I GET /identity/`MY_AT`
    And response body match a challenge
    And I store the value of body path $ as AUTH in scenario scope
    And I store the value of body path $.user.id as MY_ID in scenario scope
    And I store the value of body path $.token as access token
    And I set bearer token
    And I set signature header
    When I DELETE /user/`MY_ID`
    Then response code should be 200

Scenario: A frozen username cannot be used again
    Given I load up user2 public keys
    And I set body to { "at": "baby", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS