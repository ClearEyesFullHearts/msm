Feature: Single Test

    For a single test

Scenario: Get our user authentication data using the vault
    Given I GET /identity/vaultUser
    And response code should be 200
    And response body path $.vault.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.vault.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And I store the value of body path $.vault as VAULT_ITEM in scenario scope
    When I open the vault VAULT_ITEM with iamapoorlonesomecowboy
    Then response body match a challenge
    And response body path $.user.username should be vaultUser
    And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
    And response body path $.contacts should be null