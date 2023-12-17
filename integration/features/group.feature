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
  And I store the value of body path $.id as GROUP_ID in scenario scope

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
  Then response code should be 501
  And response body path $.code should be NOT_IMPLEMENTED

Scenario: Add a member to a group
  Given I am existing `RANDOM_USER.14`
  Given I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.1`
  And I set body to { "name": "my new group", "key": "`GK.1`"}
  And I set signature header
  When I POST to /groups
  Then response code should be 201
  And I store the value of body path $.id as GROUP_ID in scenario scope
  Given I generate my group key for `RANDOM_USER.14`
  And I set body to { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}
  And I set signature header
  When I POST to /group/`GROUP_ID`/member
  Then response code should be 201

Scenario: Cannot add a member more than once to a group
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.14`
  And I set body to { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/member
  Then response code should be 400
  And response body path $.code should be USER_EXISTS

Scenario: Only admin can add a member
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`"] with index 0
  And I am existing `RANDOM_USER.4`
  And I am existing `RANDOM_USER.3`
  And I generate my group key for `RANDOM_USER.4`
  And I set body to { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/member
  Then response code should be 403
  And response body path $.code should be BAD_ROLE
  Given I am existing `RANDOM_USER.10`
  And I generate my group key for `RANDOM_USER.4`
  And I set body to { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/member
  Then response code should be 404
  And response body path $.code should be UNKNOWN_GROUP

Scenario: Cannot add an inactive user
  Given I am a new invalidated user
  And `RANDOM_USER.1` creates a group best group for [] with index 0
  And I am existing `RANDOM_USER.1`
  And I generate my group key for `MY_AT`
  And I set body to { "username": "`MY_AT`", "key": "`GK.USER`"}
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/member
  Then response code should be 404
  And response body path $.code should be NOT_FOUND

Scenario: Cannot add an invalidated user
  Given I am authenticated user batmat
  And `RANDOM_USER.1` creates a group best group for [] with index 0
  And I am existing `RANDOM_USER.1`
  And I generate my group key for batmat
  And I set body to { "username": "batmat", "key": "`GK.USER`"}
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/member
  Then response code should be 501
  And response body path $.code should be NOT_IMPLEMENTED

Scenario: Writing to a group
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.4`
  And `RANDOM_USER.4` set group 0 message body to { "title": "Write one group message" , "content": "My group message content" }
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/message
  Then response code should be 201
  When I GET /inbox
  Then response body path $ should be of type array
  Given I am existing `RANDOM_USER.1`
  When I GET /group/`GROUP_ID.0`
  And response body match a challenge
  And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  When I GET /inbox
  Then response body path $ should be of type array
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a group message
  And resolved challenge path $.groupId should match `GROUP_ID.0`
  And resolved challenge path $.from should match `RANDOM_USER.4`
  And resolved challenge path $.title should match Write one group message
  And resolved challenge path $.content should match My group message content
  Given I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  And response body match a challenge
  And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  When I GET /inbox
  Then response body path $ should be of type array
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a group message
  And resolved challenge path $.groupId should match `GROUP_ID.0`
  And resolved challenge path $.from should match `RANDOM_USER.4`
  And resolved challenge path $.title should match Write one group message
  And resolved challenge path $.content should match My group message content
  Given I am existing `RANDOM_USER.3`
  When I GET /group/`GROUP_ID.0`
  And response body match a challenge
  And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  When I GET /inbox
  Then response body path $ should be of type array
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a group message
  And resolved challenge path $.groupId should match `GROUP_ID.0`
  And resolved challenge path $.from should match `RANDOM_USER.4`
  And resolved challenge path $.title should match Write one group message
  And resolved challenge path $.content should match My group message content

Scenario: Cannot write to a group if you're not a member
  Given `RANDOM_USER.1` creates a group best group for [] with index 0
  And I am existing `RANDOM_USER.4`
  And `RANDOM_USER.4` set group 0 message body to { "title": "Write one group message" , "content": "My group message content" }
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/message
  Then response code should be 404
  And response body path $.code should be UNKNOWN_GROUP

Scenario: Can get membership information
  Given `RANDOM_USER.1` creates a group groupDataGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupId should be `GROUP_ID.0`
  And response body path $.groupName should be groupDataGroup
  And response body path $.isAdmin should be false
  And response body should contain key
  And response body path $.key should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.members should be of type array with length 2
  And response body path $.members.0.at should be `RANDOM_USER.1`
  And response body path $.members.0.isAdmin should be true
  And response body path $.members.1.at should be `RANDOM_USER.4`
  And response body path $.members.1.isAdmin should be false

Scenario: Cannot get membership information if you're not a member
  Given `RANDOM_USER.1` creates a group groupDataGroup for [] with index 0
  And I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 404
  And response body path $.code should be UNKNOWN_GROUP

Scenario: Member can read group message
  Given `RANDOM_USER.8` creates a group readingGroup for ["`RANDOM_USER.10`"] with index 0
  And I am existing `RANDOM_USER.10`
  And `RANDOM_USER.10` set group 0 message body to { "title": "From RANDOM_USER.10" , "content": "Hello besties!" }
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/message
  Then response code should be 201
  Given I am existing `RANDOM_USER.8`
  When I GET /group/`GROUP_ID.0`
  And response body match a challenge
  And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  When I GET /inbox
  Then response body path $ should be of type array
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a group message
  And resolved challenge path $.groupId should match `GROUP_ID.0`
  And resolved challenge path $.from should match `RANDOM_USER.10`
  And resolved challenge path $.title should match From RANDOM_USER.10
  And resolved challenge path $.content should match Hello besties!

Scenario: Get membership informations
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.14`
  When I GET /groups
  And response body match a challenge
  And response body path $ should be of type array with length 1
  And response body path $.0.groupId should be `GROUP_ID.0`
  And response body path $.0.groupName should be firstGroup
  And response body path $.0.isAdmin should be false
  And response body path $.0.key should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.0.members should be of type array with length 3
  And `RANDOM_USER.14` creates a group secondGroup for ["`RANDOM_USER.8`"] with index 1
  And `RANDOM_USER.4` creates a group thirdGroup for ["`RANDOM_USER.3`", "`RANDOM_USER.14`"] with index 2
  And I am existing `RANDOM_USER.14`
  When I GET /groups
  And response body match a challenge
  And response body path $ should be of type array with length 3

Scenario: No membership no informations
  Given I am existing `RANDOM_USER.14`
  When I GET /groups
  And response body match a challenge
  And response body path $ should be of type array with length 0

Scenario: A member can quit a group
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.14`
  And I set signature header
  When I DELETE /group/`GROUP_ID.0`/member
  Then response code should be 204
  And I GET /groups
  And response body match a challenge
  And response body path $ should be of type array with length 0
  And I am existing `RANDOM_USER.4`
  When I GET /group/`GROUP_ID.0`
  Then response body match a challenge
  And response body path $.members should be of type array with length 2

Scenario: Admin can't quit a group if its the last
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I set signature header
  When I DELETE /group/`GROUP_ID.0`/member
  Then response code should be 409
  And response body path $.code should be LAST_ADMIN

Scenario: Admin can delete a group
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I set signature header
  When I DELETE /group/`GROUP_ID.0`
  Then response code should be 204
  When I GET /groups
  And response body match a challenge
  And response body path $ should be of type array with length 0

Scenario: Member cannot delete a group
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.14`
  And I set signature header
  When I DELETE /group/`GROUP_ID.0`
  Then response code should be 403
  And response body path $.code should be BAD_ROLE

Scenario: Admin can revoke a member
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.14`
  And I generate my group key for `RANDOM_USER.4`
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}, { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 200
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.key should strictly be equal to `GK.1`
  And response body path $.members should be of type array with length 2

Scenario: Can't revoke a non member
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.14`
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 404
  And response body path $.code should be NOT_FOUND

Scenario: Can't revoke if you're not a member
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.3`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.14`
  And I set body to [{ "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.1`
  Then response code should be 404
  And response body path $.code should be UNKNOWN_GROUP

Scenario: Can't revoke if you're not an admin
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.14`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.14`
  And I set body to [{ "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.1`
  Then response code should be 403
  And response body path $.code should be FORBIDDEN

Scenario: Can't revoke with wrong keys
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.5`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.5`
  And I am existing `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.1`
  And I generate my group key for `RANDOM_USER.14`
  And I generate my group key for `RANDOM_USER.4`
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}, { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}, { "username": "`RANDOM_USER.5`", "key": "`GK.5`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.3`", "key": "`GK.3`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.5`", "key": "`GK.5`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT
  And I set body to [{ "username": "`RANDOM_USER.1`", "key": "`GK.1`"}, { "username": "`RANDOM_USER.4`", "key": "`GK.4`"}, { "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.3`
  Then response code should be 200

Scenario: Can't revoke yourself
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I generate new shared key
  And I generate my group key for `RANDOM_USER.14`
  And I set body to [{ "username": "`RANDOM_USER.14`", "key": "`GK.14`"}]
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/revoke/`RANDOM_USER.1`
  Then response code should be 403
  And response body path $.code should be UNAUTHORIZED

Scenario: An Admin can raise a member to admin status
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I set body to { "isAdmin": true }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`/member/`RANDOM_USER.14`
  Then response code should be 200
  And I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.isAdmin should be true

Scenario: An Admin cannot lower another admin status
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I set body to { "isAdmin": true }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`/member/`RANDOM_USER.14`
  Then response code should be 200
  And I am existing `RANDOM_USER.14`
  And I set body to { "isAdmin": false }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`/member/`RANDOM_USER.1`
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: An Admin can lower its own status
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I set body to { "isAdmin": true }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`/member/`RANDOM_USER.14`
  Then response code should be 200
  And I set body to { "isAdmin": false }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`/member/`RANDOM_USER.1`
  Then response code should be 200
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.isAdmin should be false

Scenario: An Admin cannot lower its own status if they are the last one
  Given `RANDOM_USER.1` creates a group firstGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.1`
  And I set body to { "isAdmin": false }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`/member/`RANDOM_USER.1`
  Then response code should be 409
  And response body path $.code should be LAST_ADMIN

Scenario: An Admin can change the name of a group
  Given `RANDOM_USER.1` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.1`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupName should be firstNameGroup
  And I set body to { "name": "secondNameGroup" }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`
  Then response code should be 200
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupName should be secondNameGroup
  And I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupName should be secondNameGroup
  And I am existing `RANDOM_USER.3`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupName should be secondNameGroup
  And I am existing `RANDOM_USER.4`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupName should be secondNameGroup

Scenario: A member cannot change the name of a group
  Given `RANDOM_USER.1` creates a group firstNameGroup for ["`RANDOM_USER.14`"] with index 0
  And I am existing `RANDOM_USER.14`
  And I set body to { "name": "secondNameGroup" }
  And I set signature header
  When I PUT /group/`GROUP_ID.0`
  Then response code should be 403