Feature: Single Test

    For a single test

Scenario: A frozen username cannot be used again
    Given I load up user2 public keys
    And I set body to { "at": "baby", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS