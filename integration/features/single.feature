Feature: Single Test

    For a single
    
Scenario: Register a new user
    Given I load up user1 public keys
    And I set body to { "at": "user1", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 201