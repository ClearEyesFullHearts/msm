Feature: Message

    Write and read messages
    
Scenario: Write & read one message
  Given I am authenticated user mat
  And I set message body to { "to": "pqmatMyP6dHvu" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  Given I am existing user pqmatMyP6dHvu
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  When I GET /message/`FIRST_MSG_ID`
  And response body path $ should match a challenge
  And resolved challenge should match a message
  And resolved challenge path $.from should match @mat
  And resolved challenge path $.title should match Write one message
  And resolved challenge path $.content should match My message content
    
Scenario: Only the target can read a message
  Given mat write a message as { "to": "pqmatMyP6dHvu" , "title": "Write one message" , "content": "My message content" }
  And I am existing user pqmatMyP6dHvu
  And I GET /inbox
  And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  And I am existing user Sybf7amat8lo
  When I GET /message/`FIRST_MSG_ID`
  Then response code should be 403
  And response body path $.code should be FORBIDDEN

Scenario: Messages is deleted after reading
    
Scenario: Delete one message
    
Scenario: Only the target can delete a message
    
Scenario: Message should have a valid target
    
Scenario: Message should have a valid title
    
Scenario: Message should have a valid content
    
Scenario: Inactive user cannot write a message
    
Scenario: Inactive user cannot receive a message
    
Scenario: Message sent to an unknown user throws