Feature: Ws connection function Test

    Lambda called when there is a websocket connection to the API Getaway

Scenario: A connection is created
    Given I am existing `RANDOM_USER.5`
    When I send a connection event
    Then response code should be 200
    Then response body path $.headers.Sec-WebSocket-Protocol should be signature