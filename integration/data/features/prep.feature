Feature: Data preparation

    Prepare datas

Scenario: Validate "mat" user
    Given I load up mat public keys
    And I load up mat private keys
    And I set body to { "at": "mat", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    And I GET /identity/mat
    And response body match a challenge
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response body path $.0.id should be ^[0-9]\d*$
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    When I GET /message/`FIRST_MSG_ID`
    Then response code should be 200
    And I validate mat manually if needed

Scenario: Validate "batmat" user
    Given I load up batmat public keys
    And I load up batmat private keys
    And I set body to { "at": "batmat", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    And I GET /identity/batmat
    And response body match a challenge
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response body path $.0.id should be ^[0-9]\d*$
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    When I GET /message/`FIRST_MSG_ID`
    Then response code should be 200
    And I validate batmat manually if needed

Scenario: Validate "vaultUser" user
    Given I load up vaultUser public keys
    And I load up vaultUser private keys
    And I set body to { "at": "vaultUser", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    And I POST to /users
    And I GET /identity/vaultUser
    And response body match a challenge
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response body path $.0.id should be ^[0-9]\d*$
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    When I GET /message/`FIRST_MSG_ID`
    Then response code should be 200
    And I validate vaultUser manually if needed

Scenario: Create users
    Given I create random user with length 5
    And I create random user with length 31
    And I create random user with length 6
    And I create random user with length 7
    And I create random user with length 8
    And I create random user with length 9
    And I create random user with length 10
    And I create random user with length 11
    And I create random user with length 12
    And I create random user with length 13
    And I create random user with length 14
    And I create random user with length 15
    And I create random user with length 16
    And I create random user with length 17
    And I create random user with length 6
    And I create random user with length 7
    And I create random user with length 8
    And I create random user with length 9
    And I create random user with length 10
    And I create random user with length 11
    Then I create random users file
    
Scenario: Put baby in the freezer
    Given I load up baby public keys
    And I load up baby private keys
    And I set body to { "at": "baby", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
    When I POST to /users
    Then response code should be 201
    And I GET /identity/baby
    And response body match a challenge
    And I store the value of body path $ as AUTH in scenario scope
    And I store the value of body path $.user.id as MY_ID in scenario scope
    And I store the value of body path $.token as access token
    And I set bearer token
    And I GET /inbox
    And response body path $.0.id should be ^[0-9]\d*$
    And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
    When I GET /message/`FIRST_MSG_ID`
    Then response code should be 200
    And I validate baby manually if needed
    And I wait for 5 seconds
    And I set signature header
    When I DELETE /user/baby
    Then response code should be 200

Scenario: Send 1 message to batmat
    Given I am authenticated user mat
    And I set message body to { "to": "batmat" , "title": "Message Test 1" , "content": "Test 1" }
    And I set signature header
    When I POST to /message
    Then response code should be 201

Scenario: Send 1 message to batmat
    Given I am authenticated user mat
    And I set message body to { "to": "batmat" , "title": "Message Test 2" , "content": "Test 2" }
    And I set signature header
    When I POST to /message
    Then response code should be 201

Scenario: Send 1 message to batmat
    Given I am authenticated user mat
    And I set message body to { "to": "batmat" , "title": "Message Test 3" , "content": "Test 3" }
    And I set signature header
    When I POST to /message
    Then response code should be 201

Scenario: Set up vaultUser vault
    Given I am authenticated user vaultUser
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

Scenario: I wait a bit before ending
    Given I wait for 50 seconds

# Scenario: Delete random users
#     Given I am existing `RANDOM_USER.0`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.0`
#     Given I am existing `RANDOM_USER.1`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.1`
#     Given I am existing `RANDOM_USER.14`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.14`
#     Given I am existing `RANDOM_USER.3`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.3`
#     Given I am existing `RANDOM_USER.4`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.4`
#     Given I am existing `RANDOM_USER.5`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.5`
#     Given I am existing `RANDOM_USER.6`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.6`
#     Given I am existing `RANDOM_USER.7`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.7`
#     Given I am existing `RANDOM_USER.8`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.8`
#     Given I am existing `RANDOM_USER.9`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.9`
#     Given I am existing `RANDOM_USER.10`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.10`
#     Given I am existing `RANDOM_USER.11`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.11`
#     Given I am existing `RANDOM_USER.12`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.12`
#     Given I am existing `RANDOM_USER.13`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.13`
#     Given I am existing `RANDOM_USER.14`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.14`
#     Given I am existing `RANDOM_USER.15`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.15`
#     Given I am existing `RANDOM_USER.16`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.16`
#     Given I am existing `RANDOM_USER.17`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.17`
#     Given I am existing `RANDOM_USER.18`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.18`
#     Given I am existing `RANDOM_USER.19`
#     And I set signature header
#     And I DELETE /user/`RANDOM_USER.19`