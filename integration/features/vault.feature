Feature: Vault

    vault management
    
Scenario: Set the vault up and use it
  Given I am a new valid user
  Given I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`MY_AT`
  Then response code should be 200
  And I store the value of body path $.key as SPK in scenario scope
  And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and iamapoorlonesomecowgirl
  And I set body to `VAULT_ITEM`
  And I set signature header
  When I PUT /vault
  Then response code should be 200
  Given I clear headers
  And I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`MY_AT`
  Then response code should be 200
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with iamapoorlonesomecowboy
  And I GET /identity/`MY_AT`
  And response code should be 200
  And response body should contain vault
  And response body path $.vault.token should be ^[A-Za-z0-9+/]*(=|==)?$
  And response body path $.vault.salt should be ^[A-Za-z0-9+/]*(=|==)?$
  And response body path $.vault.iv should be ^[A-Za-z0-9+/]*(=|==)?$
  And I store the value of body path $.vault as SESSION in scenario scope
  When I open the session SESSION in VAULT
  And I open the vault VAULT with iamapoorlonesomecowboy
  Then response body match a challenge
  And response body path $.user.username should be `MY_AT`
  And response body path $.token should be ^[A-Za-z0-9+/]*(=|==)?\.[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
  And response body path $.contacts should be null
    
Scenario: Set the vault up and use the switch
  Given I am a new valid user
  Given I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`MY_AT`
  Then response code should be 200
  And I store the value of body path $.key as SPK in scenario scope
  And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and iamapoorlonesomecowgirl
  And I set body to `VAULT_ITEM`
  And I set signature header
  When I PUT /vault
  Then response code should be 200
  Given I clear headers
  And I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`MY_AT`
  Then response code should be 200
  And I store the value of body path $.key as SPK in scenario scope
  And I set Pass header with iamapoorlonesomecowgirl
  And I GET /identity/`MY_AT`
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT
  Given I am existing `RANDOM_USER.7`
  When I GET /search?user=`MY_AT`
  Then response code should be 200
  And response body path $ should be of type array with length 0
    
Scenario: Delete the vault
  Given I am existing `RANDOM_USER.12`
  And I save `RANDOM_USER.12`
  And I set signature header
  When I DELETE /vault
  Then response code should be 200
  And I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`MY_AT`
  Then response code should be 200
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with `RANDOM_USER.12`
  And I GET /identity/`RANDOM_USER.12`
  Then response code should be 400
  Given I clear headers
  And I GET /identity/`RANDOM_USER.12`
  Then response code should be 200
  And response body should not contain vault
  And I record `RANDOM_USER.12`
    
Scenario: The vault item should have a valid token
    
Scenario: The vault item should have a valid iv