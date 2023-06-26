Feature: Login

    Identification for a user

Scenario: Get our user information
    Given I am a new invalidated user
    When I GET /identity/`MY_AT`
    Then response code should be 200
    And response body should be a challenge