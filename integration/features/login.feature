Feature: Login

    Identification for a user

Scenario: Get our user authentication data
    Given I am a new invalidated user
    When I GET /identity/`MY_AT`
    Then response code should be 200
    And response body should be a challenge
    And resolved challenge path $.user.username should be `MY_AT`
    And resolved challenge path $.token should match ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$