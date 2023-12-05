Feature: Attic and related things Test

    All things related to the attic usage

Scenario: Register a new user, use the vault and killswitch
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
    And response body path $.token should be ^[A-Za-z0-9+/]*(=|==)?\.[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
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
    And response body path $.token should be ^[A-Za-z0-9+/]*(=|==)?\.[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
    And response body path $.contacts should be null
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response code should be 200
    Given I clear headers
    And I load up new ECDH keys
    And I set x-msm-cpk header to `CPK`
    When I GET /attic/`MY_AT`
    Then response code should be 200
    And I store the value of body path $.key as SPK in scenario scope
    Given I set Pass header with killswitch
    And I GET /identity/`MY_AT`
    And response code should be 400

Scenario: A session can only be used once on success
  Given I am existing `RANDOM_USER.16`
  And I set var MY_AT to `RANDOM_USER.16` value
  And I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`RANDOM_USER.16`
  Then response code should be 200
  And I store the value of body path $ as ATTIC in scenario scope
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with `RANDOM_USER.16`
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 200
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400

Scenario: A session can only be used once on failure
  Given I am existing `RANDOM_USER.16`
  And I set var MY_AT to `RANDOM_USER.16` value
  And I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`RANDOM_USER.16`
  Then response code should be 200
  And I store the value of body path $ as ATTIC in scenario scope
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_1
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  Given I set Pass header with `RANDOM_USER.16`
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400

Scenario: Wrong client public key send an error
  Given I set var CPK to a 66 characters long base64 string
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/vaultUser
  Then response code should be 400

Scenario: Unknown user get bogus attic
  Given I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/Unknown
  Then response code should be 200
  And response body path $.salt should be ^[A-Za-z0-9+/]*(=|==)?$
  And response body path $.key should be ^[A-Za-z0-9+/]*(=|==)?$

Scenario: Repeated failure freeze the session
  Given I am existing `RANDOM_USER.16`
  And I set var MY_AT to `RANDOM_USER.16` value
  And I load up new ECDH keys
  And I set x-msm-cpk header to `CPK`
  When I GET /attic/`RANDOM_USER.16`
  Then response code should be 200
  And I store the value of body path $ as ATTIC in scenario scope
  And I store the value of body path $.salt as SALT_1 in scenario scope
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_1
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 2, 25 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_2
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 3, 50 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_3
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 4, 100 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_4
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 5, 200 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_5
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 6, 400 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_6
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 7, 800 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  And I set var LAST_SPK to `SPK` value
  Given I set Pass header with wrong_password_7
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 8, 800 ms, bogus
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly not be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with `RANDOM_USER.16`
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  And I wait for 400 ms
  # Attemp 9, 1600 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $ as ATTIC in scenario scope
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with wrong_password_8
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 10, 1600 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly not be equal to `SALT_1`
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with `RANDOM_USER.16`
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 400
  # Attemp 10
  And I wait for 1600 ms
  When I GET /attic/`RANDOM_USER.16`
  And response body path $.salt should strictly be equal to `SALT_1`
  And I store the value of body path $ as ATTIC in scenario scope
  And I store the value of body path $.key as SPK in scenario scope
  Given I set Pass header with `RANDOM_USER.16`
  And I GET /identity/`RANDOM_USER.16`
  And response code should be 200