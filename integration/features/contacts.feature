Feature: Contacts

    update of the contact list
    
Scenario: update the contact list
  Given I am existing `RANDOM_USER.5`
  And I set a random challenge to CONTACT
  And I set body to `CONTACT`
  And I set signature header
  When I PUT /contacts
  Then response code should be 200
    
Scenario: Invalidated account cannot update the contact list
  Given I am a new invalidated user
  And I set X-msm-Pass header to `PASS_HASH`
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
    
Scenario: The contact list should have a valid token
    
Scenario: The contact list should have a valid iv
    
Scenario: The contact list should have a valid passphrase