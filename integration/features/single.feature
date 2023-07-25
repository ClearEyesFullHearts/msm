Feature: Single Test

    For a single test

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