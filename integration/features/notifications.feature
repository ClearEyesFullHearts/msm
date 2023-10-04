Feature: Notification function Test

    Lambda called when there is a message written for a user

Scenario: Connected target is notified when they received a message
    Given I am existing `RANDOM_USER.11`
    And `RANDOM_USER.11` is connected
    And `RANDOM_USER.11` is listening
    And  mat write a message as { "to": "`RANDOM_USER.11`" , "title": "Write one message" , "content": "My message content" }
    Then I wait for 3 seconds
    Then `RANDOM_USER.11` last message action is mail
    And response body path $.message.from should be mat