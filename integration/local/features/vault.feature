Feature: Vault

    vault management
    
Scenario: Set the vault up
  Given I am a new valid user
  And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy
  And I set body to `VAULT_ITEM`
  And I set signature header
  When I PUT /vault
  Then response code should be 200
  And I GET /identity/`MY_AT`
  And response body should contain vault
  And response body path $.vault.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.vault.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    
Scenario: Delete the vault
  Given I am existing `RANDOM_USER.12`
  And I save `RANDOM_USER.12`
  And I set signature header
  When I DELETE /vault
  Then response code should be 200
  And I GET /identity/`RANDOM_USER.12`
  And response body should not contain vault
  And I record `RANDOM_USER.12`
    
Scenario: The vault item should have a valid token
    
Scenario: The vault item should have a valid iv