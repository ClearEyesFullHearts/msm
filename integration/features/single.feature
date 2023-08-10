Feature: Single Test

    For a single
    
Scenario: Unknown account name should throw
  Given I am existing user uHzmatVg2hPx
  When I GET /user/1
  Then response code should be 404
  When I GET /username/tamara
  Then response code should be 404