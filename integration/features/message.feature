Feature: Message

    Write and read messages
    
Scenario: Write & read one message
  Given I am authenticated user mat
  And I set message body to { "to": "uHzmatVg2hPx" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  Given I am existing user uHzmatVg2hPx
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a message
  And resolved challenge path $.from should match @mat
  And resolved challenge path $.title should match Write one message
  And resolved challenge path $.content should match My message content
    
Scenario: Only the target can read a message
  Given mat write a message as { "to": "uHzmatVg2hPx" , "title": "Write one message" , "content": "My message content" }
  And I am existing user uHzmatVg2hPx
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  And I am existing user matha6t72itFS1R
  When I GET /message/`FIRST_MSG_ID`
  Then response code should be 403
  And response body path $.code should be FORBIDDEN

Scenario: Messages is deleted after reading
  Given mat write a message as { "to": "uHzmatVg2hPx" , "title": "Write one message" , "content": "My message content" }
  And I am existing user uHzmatVg2hPx
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  And I GET /message/`FIRST_MSG_ID`
  When I wait for 300 ms
  Then I GET /message/`FIRST_MSG_ID`
  And response code should be 404

Scenario: Delete one message
  Given mat write a message as { "to": "uHzmatVg2hPx" , "title": "Write one message" , "content": "My message content" }
  And I am existing user uHzmatVg2hPx
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  And I set signature header
  When I DELETE /message/`FIRST_MSG_ID`
  Then response code should be 200
  And I GET /message/`FIRST_MSG_ID`
  And response code should be 404

Scenario: Only the target can delete a message
  Given mat write a message as { "to": "uHzmatVg2hPx" , "title": "Write one message" , "content": "My message content" }
  And I am existing user uHzmatVg2hPx
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  And I am existing user matha6t72itFS1R
  And I set signature header
  When I DELETE /message/`FIRST_MSG_ID`
  Then response code should be 403
  And response body path $.code should be FORBIDDEN
    
Scenario: Message should have a valid target
    
Scenario: Message should have a valid title
    
Scenario: Message should have a valid content

Scenario: Inactive user cannot write a message
  Given I am a new invalidated user
  And I GET /identity/`MY_AT`
  And response body match a challenge
  And I store the value of body path $ as AUTH in scenario scope
  And I store the value of body path $.token as access token
  And I set bearer token
  And I set message body to { "to": "uHzmatVg2hPx" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 501
  And response body path $.code should be NOT_IMPLEMENTED
    
Scenario: Inactive user cannot receive a message
  Given I am a new invalidated user
  And I am authenticated user mat
  And I set message body to { "to": "`MY_AT`" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 404
    
Scenario: Message sent to an unknown user throws
  Given I am authenticated user mat
  And I set var ENCRYPTED_TITLE to a 513 characters long base64 string
  And I set var ENCRYPTED_CONTENT to a 513 characters long base64 string
  And I set body to { "to": "unknownuser" , "title": "`ENCRYPTED_TITLE`" , "content": "`ENCRYPTED_CONTENT`" }
  And I set signature header
  When I POST to /message
  Then response code should be 404