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