Feature: Single Test

    For a single

Scenario: Unknown username returns an error
    When I GET /identity/Unknown
    Then response code should be 404
    And response body path $.code should be UNKNOWN_USER

Scenario: Delete one's account with messages
  Given I am authenticated user mat
  And I save `RANDOM_USER.14`
  And I set message body to { "to": "`RANDOM_USER.14`" , "title": "Write one message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.14`" , "title": "Write two message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.14`" , "title": "Write three message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  And I set message body to { "to": "`RANDOM_USER.14`" , "title": "Write four message" , "content": "My message content" }
  And I set signature header
  When I POST to /message
  Then response code should be 201
  Given I am existing `RANDOM_USER.14`
  And I set signature header
  And I DELETE /user/`RANDOM_USER.14`
  Then response code should be 200
  And I GET /identity/`RANDOM_USER.14`
  Then response code should be 404
  And I record `RANDOM_USER.14`