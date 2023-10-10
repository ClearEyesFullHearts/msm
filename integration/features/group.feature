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

Scenario: Inactive user cannot create a group
  Given I am a new invalidated user
  And I GET /identity/`MY_AT`
  And response body match a challenge
  And I store the value of body path $ as AUTH in scenario scope
  And I store the value of body path $.token as access token
  And I set bearer token
  And I generate my group key for `MY_AT`
  And I set body to { "name": "my new group", "key": "`GK.USER`"}
  And I set signature header
  When I POST to /groups
  Then response code should be 501
  And response body path $.code should be NOT_IMPLEMENTED

Scenario: Invalid user cannot create a group
  Given I am authenticated user batmat
  And I generate my group key for batmat
  And I set body to { "name": "my new group", "key": "`GK.USER`"}
  And I set signature header
  When I POST to /groups
  Then response code should be 403
  And response body path $.code should be FORBIDDEN

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
  And response body path $.code should be USER_EXISTS

Scenario: Only admin can add a member
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.2`", "`RANDOM_USER.3`"]
  And I am existing `RANDOM_USER.4`
  And I am existing `RANDOM_USER.3`
  And I generate my group key for `RANDOM_USER.4`
  And I set body to { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 401
  And response body path $.code should be BAD_ROLE
  Given I am existing `RANDOM_USER.10`
  And I generate my group key for `RANDOM_USER.4`
  And I set body to { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 403
  And response body path $.code should be FORBIDDEN

Scenario: Cannot add an inactive user
  Given I am a new invalidated user
  And `RANDOM_USER.1` creates a group best group for []
  And I am existing `RANDOM_USER.1`
  And I generate my group key for `MY_AT`
  And I set body to { "username": "`MY_AT`", "key": "`GK.USER`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 404
  And response body path $.code should be NOT_FOUND

Scenario: Cannot add an invalidated user
  Given I am authenticated user batmat
  And `RANDOM_USER.1` creates a group best group for []
  And I am existing `RANDOM_USER.1`
  And I generate my group key for batmat
  And I set body to { "username": "batmat", "key": "`GK.USER`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 403
  And response body path $.code should be FORBIDDEN

Scenario: Writing to a group
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.2`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"]
  And I am existing `RANDOM_USER.4`
  And I set group message body to { "title": "Write one group message" , "content": "My group message content" }
  And I set signature header
  When I POST to /group/`GROUP_ID`/message
  Then response code should be 201
  When I GET /inbox
  Then response body path $ should be of type array with length 0
  Given I am existing `RANDOM_USER.1`
  When I GET /inbox
  Then response body path $ should be of type array with length 1
  Given I am existing `RANDOM_USER.2`
  When I GET /inbox
  Then response body path $ should be of type array with length 1
  Given I am existing `RANDOM_USER.3`
  When I GET /inbox
  Then response body path $ should be of type array with length 1

Scenario: Can get membership information
  Given `RANDOM_USER.1` creates a group groupDataGroup for ["`RANDOM_USER.2`"]
  And I am existing `RANDOM_USER.2`
  When I GET /group/`GROUP_ID`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupId should be `GROUP_ID`
  And response body path $.groupName should be groupDataGroup
  And response body path $.isAdmin should be false
  And response body should contain key
  And response body path $.key should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$

Scenario: Member can read group message
  Given `RANDOM_USER.8` creates a group readingGroup for ["`RANDOM_USER.9`"]
  And I am existing `RANDOM_USER.9`
  And I set group message body to { "title": "From RANDOM_USER.9" , "content": "Hello besties!" }
  And I set signature header
  When I POST to /group/`GROUP_ID`/message
  Then response code should be 201
  Given I am existing `RANDOM_USER.8`
  When I GET /group/`GROUP_ID`
  And response body match a challenge
  And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  When I GET /inbox
  Then response body path $ should be of type array with length 1
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a group message
  And resolved challenge path $.groupId should match `GROUP_ID`
  And resolved challenge path $.from should match readingGroup
  And resolved challenge path $.title should match From RANDOM_USER.9
  And resolved challenge path $.content should match Hello besties!