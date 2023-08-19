Feature: Incineration

    User account deletion
    
Scenario: Delete one's account
  Given I am a new valid user
  And I set signature header
  When I DELETE /user/`MY_AT`
  Then response code should be 200
  And I GET /identity/`MY_AT`
  Then response code should be 404
    
Scenario: Only the owner can delete an account
  Given I am authenticated user batmat
  And I set body to {}
  And I set signature header
  When I DELETE /user/`RANDOM_USER.3`
  Then response code should be 403
  And response body path $.code should be FORBIDDEN
    
Scenario: Delete one's account with messages
  Given I am authenticated user mat
  And I set message body to { "to": "`RANDOM_USER.18`" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.18`" , "title": "Write two message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.18`" , "title": "Write three message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.18`" , "title": "Write four message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  Given I am existing `RANDOM_USER.18`
  And I set signature header
  And I DELETE /user/`RANDOM_USER.18`
  Then response code should be 200
  And I GET /identity/`RANDOM_USER.18`
  Then response code should be 404