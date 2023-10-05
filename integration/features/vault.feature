Feature: Vault

    vault management
    
Scenario: Set the vault up and use it
  Given I am a new valid user
  And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and iamapoorlonesomecowgirl
  And I set body to `VAULT_ITEM`
  And I set signature header
  When I PUT /vault
  Then response code should be 200
  And I GET /identity/`MY_AT`
  And response body should contain vault
  And response body path $.vault.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.vault.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.switch.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.switch.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And I store the value of body path $.vault as VAULT in scenario scope
  When I open the vault VAULT with iamapoorlonesomecowboy
  Then response body match a challenge
  And response body path $.user.username should be `MY_AT`
  And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
  And response body path $.contacts should be null
    
Scenario: Set the vault up and use the switch
  Given I am a new valid user
  And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and iamapoorlonesomecowgirl
  And I set body to `VAULT_ITEM`
  And I set signature header
  When I PUT /vault
  Then response code should be 200
  And I GET /identity/`MY_AT`
  And response body should contain vault
  And response body path $.vault.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.vault.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.switch.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.switch.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And I store the value of body path $.switch as SWITCH in scenario scope
  When I open the switch SWITCH with iamapoorlonesomecowgirl
  Then response body match a challenge
  And response body path $.user.username should be `MY_AT`
  And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
  And response body path $.contacts should be null
    
Scenario: Delete the vault
  Given I am existing `RANDOM_USER.12`
  And I save `RANDOM_USER.12`
  And I set signature header
  When I DELETE /vault
  Then response code should be 200
  And I GET /identity/`RANDOM_USER.12`
  And response body should not contain vault
  And response body should not contain switch
  And I record `RANDOM_USER.12`
    
Scenario: The vault item should have a valid token
    
Scenario: The vault item should have a valid iv