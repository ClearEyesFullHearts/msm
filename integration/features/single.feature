Feature: Single Test

    For a single

# Scenario: Unknown username returns an error
#   When I GET /identity/Unknown
#   Then response code should be 404
#   And response body path $.code should be UNKNOWN_USER

Scenario: I cannot register 2 users with the same encryption key
    Given I am a new invalidated user
    And I load up user1 public keys
    And I load up user1 private keys
    And I hash and sign NEW_EPK and SPK into COMPUTED_SHA with NEW_SSK
    And I sign hashed MyPassword into PASS with NEW_SSK
    And I sign hashed MyKillSwitch into KILL with NEW_SSK
    And I set body to { "at": "testuser12", "key":`NEW_EPK`, "signature":`SPK`, "hash":"`COMPUTED_SHA`", "pass":"`PASS`", "kill":"`KILL`" }
    When I POST to /users
    Then response code should be 403
    And response body path $.code should be USER_EXISTS