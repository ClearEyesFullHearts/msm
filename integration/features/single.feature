Feature: Single Test

    For a single 
    
Scenario: Only the owner can delete an account
  Given I am authenticated user batmat
  And I set body to {}
  And I set signature header
  When I DELETE /user/50066
  Then response code should be 403
  And response body path $.code should be FORBIDDEN