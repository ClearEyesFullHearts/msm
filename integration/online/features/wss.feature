Feature: Ws connection function Test

    Lambda called when there is a websocket connection to the API Getaway

Scenario: mat connects and disconnect
    Given mat is connected
    And mat disconnects
    And batmat is connected
    And batmat is connected
    And batmat disconnects

Scenario: mat and batmat are chatting
    Given batmat is connected
    And mat is connected
    And I prepare fallback message "Hello boy" for mat
    When batmat send next fallback message to mat
    Then mat decrypt content of message 0 from route fallback
    And response body path $.content should be "Hello boy"
    And I prepare fallback message "Glad youre here" for batmat
    When mat send next fallback message to batmat
    Then batmat decrypt content of message 0 from route fallback
    And response body path $.content should be "Glad youre here"

Scenario: Bad content send error
    Given mat is connected
    And I prepare next message for mat as { "to": "mat", "content": "blablabla" }
    When mat send next fallback message to mat
    Then mat's last message action is error

Scenario: Disconnected target send event
    Given mat is connected
    And mat is listening
    And I prepare fallback message "Glad youre here" for batmat
    When mat send next fallback message to batmat
    Then I wait for 2 seconds
    Then mat's last message action is disconnected