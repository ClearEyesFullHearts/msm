Feature: Single Test

    For a single test

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
    And response body path $.0 should match a challenge