Feature: Single Test

    For a single test
    
Scenario: Invalidated account cannot update the contact list
  Given I am a new invalidated user
  And I GET /identity/`MY_AT`
  And response body match a challenge
  And I store the value of body path $ as AUTH in scenario scope
  And I store the value of body path $.token as access token
  And I set bearer token
  And I set a random challenge to CONTACT
  And I set body to `CONTACT`
  And I set signature header
  When I PUT /contacts
  Then response code should be 501
  And response body path $.code should be NOT_IMPLEMENTED