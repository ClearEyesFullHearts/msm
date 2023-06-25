Feature: User creation

    Create a new User with constraints

Scenario: Register a new user
    Given I set body to { "at": "user1", "key":`EPK`, "signature":`SPK` }
    When I POST to /users
    Then response code should be 201