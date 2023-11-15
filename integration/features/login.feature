Feature: Login

    Identification for a user

Scenario: Get our user authentication data without password
    Given I am a new invalidated user
    When I GET /identity/`MY_AT`
    Then response code should be 200
    And response body should not contain vault
    And response body match a challenge
    And response body path $.user.username should be `MY_AT`
    And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
    And response body path $.contacts should be null

Scenario: Get our user authentication data using the vault
    Given I GET /attic/vaultUser
    And response code should be 200
    And response body path $.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.salt should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.proof should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.key should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And I store the value of body path $ as ATTIC in scenario scope
    And I set Pass header with iamapoorlonesomecowboy
    And I GET /identity/vaultUser
    And response code should be 200
    And response body path $.vault.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.vault.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And I store the value of body path $.vault as VAULT_ITEM in scenario scope
    When I open the vault VAULT_ITEM with iamapoorlonesomecowboy
    Then response body match a challenge
    And response body path $.user.username should be vaultUser
    And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
    And response body path $.contacts should be null

Scenario: Unknown username returns an error
    When I GET /identity/Unknown
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should be at least 3 characters long
    When I GET /identity/us
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should be less than 125 characters long
    Given I set var AT_TOO_LONG to a 126 characters long string
    When I GET /identity/`AT_TOO_LONG`
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Username should not contain any special character
    When I GET /identity/<script>
    Then response code should be 400
    And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Unknown user has an attic
    When I GET /attic/Unknown
    Then response code should be 200
    And response body path $.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.salt should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
    And response body path $.proof should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$

Scenario: Authenticated user has access to its inbox
    Given I am a new invalidated user
    And I GET /identity/`MY_AT`
    And response body match a challenge
    And I store the value of body path $.token as access token
    And I set bearer token
    When I GET /inbox
    Then response code should be 200
    And response body path $ should be of type array with length 1
    And response body path $.0.id should be ^[0-9]\d*$
    And response body path $.0 should match a challenge

Scenario: Authentication is mandatory to search user's list
    When I GET /search?user=mat
    Then response code should be 401

Scenario: Authentication is mandatory to get user's detail
    When I GET /user/mat
    Then response code should be 401

Scenario: Authentication is mandatory to get one's inbox
    When I GET /inbox
    Then response code should be 401

Scenario: Authentication is mandatory to get a full message
    When I GET /message/1
    Then response code should be 401

Scenario: Signature header is mandatory to delete one self
    Given I am authenticated user batmat
    And I set false signature header
    When I DELETE /user/`MY_AT`
    Then response code should be 403
    And response body path $.code should be FORBIDDEN

Scenario: Signature header is mandatory to delete a message
    Given I am authenticated user batmat
    And I set false signature header
    When I DELETE /message/0
    Then response code should be 403
    And response body path $.code should be FORBIDDEN

Scenario: Signature header is mandatory to send a message
    Given I am authenticated user batmat
    And I set message body to { "to": "mat" , "title": "Message Title" , "content": "Message content" }
    And I set false signature header
    When I POST to /message
    Then response code should be 403
    And response body path $.code should be FORBIDDEN

Scenario: Signature header is mandatory to set up the vault
    Given I am authenticated user batmat
    And I set var TOKEN to a 4032 characters long base64 string
    And I set var IV to a 18 characters long base64 string
    And I set var SALT to a 66 characters long base64 string
    And I set var PROOF to a 66 characters long base64 string
    And I set var ECDSA to a 243 characters long base64 string
    And I set var PASS to a 105 characters long base64 string
    And I set var KILL to a 105 characters long base64 string
    And I set body to { "vault": { "token": "`TOKEN`", "iv": "`IV`", "salt": "`SALT`", "pass": "`PASS`", "kill": "`KILL`" }, "attic": { "proof": "`PROOF`", "iv": "`IV`", "salt": "`SALT`", "key": "`ECDSA`" } }
    And I set false signature header
    When I PUT /vault
    Then response code should be 403
    And response body path $.code should be FORBIDDEN

Scenario: Signature header is mandatory to delete the vault
    Given I am authenticated user batmat
    And I set false signature header
    When I DELETE /vault
    Then response code should be 403
    And response body path $.code should be FORBIDDEN

Scenario: Signature header is mandatory to update the contact list
    Given I am authenticated user batmat
    And I set var TOKEN to a 900 characters long base64 string
    And I set var IV to a 18 characters long base64 string
    And I set var PASS to a 513 characters long base64 string
    And I set body to { "token": "`TOKEN`", "iv": "`IV`", "passphrase": "`PASS`" }
    And I set false signature header
    When I PUT /contacts
    Then response code should be 403
    And response body path $.code should be FORBIDDEN