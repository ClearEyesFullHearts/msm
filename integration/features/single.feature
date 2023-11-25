Feature: Single Test

    For a single

# Scenario: Unknown username returns an error
#   When I GET /identity/Unknown
#   Then response code should be 400
#   And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Register a new user
    Given I load up new RSA keys
    And I set var MY_AT to a 10 characters long string
    And I set body to { "at": "`MY_AT`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 201
    When I GET /identity/`MY_AT`
    Then response code should be 200
    And response body should not contain vault
    Then response body match a challenge
    And I store the value of body path $ as AUTH in scenario scope
    And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
    And I store the value of body path $.token as access token
    Given I load up new ECDH keys
    And I set x-msm-cpk header to `CPK`
    When I GET /attic/`MY_AT`
    Then response code should be 200
    And response body path $.salt should be ^[A-Za-z0-9+/]*(=|==)?$
    And response body path $.key should be ^[A-Za-z0-9+/]*(=|==)?$
    And I store the value of body path $.key as SPK in scenario scope
    Given I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and killswitch
    And I set body to `VAULT_ITEM`
    And I set signature header
    And I set bearer token
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
    And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
    And response body path $.contacts should be null
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response code should be 200
