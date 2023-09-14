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
    Then mat acknowledges reception to batmat
    And mat decrypt content of message 0 from route fallback
    And response body path $.content should be "Hello boy"
    And response body path $.from should be batmat
    And response body path $.requestId should be `REQ.batmat`
    And I prepare fallback message "Glad youre here" for batmat
    When mat send next fallback message to batmat
    Then batmat acknowledges reception to mat
    And batmat decrypt content of message 0 from route fallback
    And response body path $.content should be "Glad youre here"
    And response body path $.from should be mat
    And response body path $.requestId should be `REQ.mat`

Scenario: Bad content send error
    Given mat is connected
    And I prepare next message for mat as { "to": "mat", "content": "blablabla", "requestId": "4365c1e0-72e6-492c-8832-eada64272c86" }
    When mat send next fallback message to mat
    Then mat's last message action is error

Scenario: Bad requestId send error
    Given mat is connected
    And I set var ENCRYPTED_CONTENT to a 513 characters long base64 string
    And I prepare next message for mat as { "to": "mat", "content": "`ENCRYPTED_CONTENT`", "requestId": "plouf" }
    When mat send next fallback message to mat
    Then mat's last message action is error

Scenario: Disconnected target send event
    Given mat is connected
    And mat is listening
    And I prepare fallback message "Glad youre here" for batmat
    When mat send next fallback message to batmat
    Then I wait for 2 seconds
    Then mat's last message action is disconnected