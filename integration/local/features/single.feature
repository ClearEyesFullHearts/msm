Feature: Single Test

    For a single

Scenario: Unknown username returns an error
    When I GET /identity/Unknown
    Then response code should be 404
    And response body path $.code should be UNKNOWN_USER
