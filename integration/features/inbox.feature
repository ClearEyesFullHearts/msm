Feature: Inbox

    Get inbox content

Scenario: Get empty inbox
  Given I am authenticated user mat
  When I GET /inbox
  Then response body path $ should be of type array with length 0

Scenario: Get full inbox
  Given I am authenticated user batmat
  When I GET /inbox
  Then response body path $ should be of type array with length 3
  And response body path $.0 should match a challenge
  And resolved challenge path $.id should match ^[0-9]\d*$
  And resolved challenge path $.sentAt should match ^[0-9]\d*$
  And resolved challenge path $.from should match @mat
  And resolved challenge should match a message
  And resolved challenge path $.title should match Message Test 3
  And resolved challenge path $.content should match undefined