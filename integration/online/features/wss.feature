Feature: Ws connection function Test

    Lambda called when there is a websocket connection to the API Getaway

Scenario: A connection is created
    Given mat is connected
    And batmat is connected
    And vaultUser is connected
    And mat disconnects