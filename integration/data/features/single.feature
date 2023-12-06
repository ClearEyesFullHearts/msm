Feature: Data preparation

    Prepare signle Data

Scenario: Update vaults
    Given I do what i do
    And I update random users vaults
    And I am authenticated user vaultUser
    And I load up new ECDH keys
    And I set x-msm-cpk header to `CPK`
    When I GET /attic/vaultUser
    Then response code should be 200
    And I store the value of body path $.key as SPK in scenario scope
    And I store the value of body path $ as ATTIC in scenario scope
    And I set var MY_AT to vaultUser value
    And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and iamapoorlonesomecowgirl
    And I set body to `VAULT_ITEM`
    And I set signature header
    When I PUT /vault
    Then response code should be 200