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