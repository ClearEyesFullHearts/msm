Feature: Inbox

    Get inbox content

Scenario: Get empty inbox
  Given I am authenticated user batmat
  When I GET /inbox
  Then response body path $ should be of type array with length 0