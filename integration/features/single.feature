Feature: Single Test

    For a single test

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