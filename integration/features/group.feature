Feature: Groups

    Test for group chat API

Scenario: Creates a group
  Given I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.1`
  And I set body to { "name": "my new group", "key": "`GK.1`"}
  And I set signature header
  When I POST to /groups
  Then response code should be 201
  And response body should contain id

Scenario: Add a member to a group
  Given I am existing `RANDOM_USER.2`
  Given I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.1`
  And I set body to { "name": "my new group", "key": "`GK.1`"}
  And I set signature header
  When I POST to /groups
  Then response code should be 201
  And I store the value of body path $.id as GROUP_ID in scenario scope
  Given I generate my group key for `RANDOM_USER.2`
  And I set body to { "username": "`RANDOM_USER.2`", "key": "`GK.2`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 201

Scenario: Cannot add a member more than once to a group
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.2`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"]
  And I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.2`
  And I set body to { "username": "`RANDOM_USER.2`", "key": "`GK.2`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 400
