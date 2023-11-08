Feature: Incineration

    User account deletion
    
Scenario: Delete one's account
  Given I am a new valid user
  And I set signature header
  When I DELETE /user/`MY_AT`
  Then response code should be 200
  And I GET /identity/`MY_AT`
  Then response code should be 400
    
Scenario: Only the owner can delete an account
  Given I am authenticated user batmat
  And I set body to {}
  And I set signature header
  When I DELETE /user/`RANDOM_USER.4`
  Then response code should be 403
  And response body path $.code should be FORBIDDEN
    
Scenario: Delete one's account with messages
  Given I am authenticated user mat
  And I save `RANDOM_USER.13`
  And I set message body to { "to": "`RANDOM_USER.13`" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.13`" , "title": "Write two message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.13`" , "title": "Write three message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.13`" , "title": "Write four message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  Given I am existing `RANDOM_USER.13`
  And I set signature header
  And I DELETE /user/`RANDOM_USER.13`
  Then response code should be 200
  And I GET /identity/`RANDOM_USER.13`
  Then response code should be 400
  And I record `RANDOM_USER.13`

Scenario: A member is removed from its groups when it is incinerated
  Given `RANDOM_USER.1` creates a group firstNameGroup for ["`RANDOM_USER.14`"] with index 0
  Given `RANDOM_USER.3` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.4`", "`RANDOM_USER.1`"] with index 1
  Given `RANDOM_USER.4` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.1`"] with index 2
  And I save `RANDOM_USER.14`
  And I am existing `RANDOM_USER.14`
  And I set signature header
  When I DELETE /user/`RANDOM_USER.14`
  Then response code should be 200
  And I am existing `RANDOM_USER.1`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.members should be of type array with length 0
  When I GET /group/`GROUP_ID.1`
  Then response code should be 200
  And response body match a challenge
  And response body path $.members should be of type array with length 2
  When I GET /group/`GROUP_ID.2`
  Then response code should be 200
  And response body match a challenge
  And response body path $.members should be of type array with length 1
  And I record `RANDOM_USER.14`

Scenario: An admin incinerate its groups if they are the only admin
  Given `RANDOM_USER.1` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`"] with index 0
  Given `RANDOM_USER.3` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.4`", "`RANDOM_USER.1`"] with index 1
  Given `RANDOM_USER.4` creates a group firstNameGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.3`"] with index 2
  And I save `RANDOM_USER.3`
  And I am existing `RANDOM_USER.3`
  And I set signature header
  When I DELETE /user/`RANDOM_USER.3`
  Then response code should be 200
  And I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.members should be of type array with length 1
  When I GET /group/`GROUP_ID.1`
  Then response code should be 404
  When I GET /group/`GROUP_ID.2`
  Then response code should be 200
  And response body match a challenge
  And response body path $.members should be of type array with length 1
  And I record `RANDOM_USER.3`