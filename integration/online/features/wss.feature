Feature: Ws connection function Test

    Lambda called when there is a websocket connection to the API Getaway

Scenario: A connection is created
    Given batmat is connected
    And I prepare message Hello boy for mat
    When batmat send next fallback message to mat
    Then I wait for 5 seconds
    And I prepare message Hello again for mat
    When batmat send next fallback message to mat