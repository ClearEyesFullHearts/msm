Feature: Lambda cleanup function Test

    Lambda called once a day to cleanup the database

# Scenario: Non validated account are cleaned up when they were missed
#     Given I invalidate cZTFltuXED7dwaGGDU2eeWlfg
#     When I invoke the cleanup lambda function
#     Then response body path $.usersCleared.missed should be 1
#     When I GET /identity/cZTFltuXED7dwaGGDU2eeWlfg
#     Then response code should be 404
#     And response body path $.code should be UNKNOWN_USER
#     Given I load up user2 public keys
#     And I set body to { "at": "cZTFltuXED7dwaGGDU2eeWlfg", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
#     When I POST to /users
#     Then response code should be 201

# Scenario: Message that have been read are cleaned up when they were missed
#     Given I mark `RANDOM_USER.16` message with ID 2 as read
#     When I invoke the cleanup lambda function
#     Then response body path $.messagesCleared should be 1
#     And I am existing `RANDOM_USER.16`
#     And I GET /inbox
#     Then response body path $ should be of type array with length 0

# Scenario: User that are inactive are frozen
#     Given I mark `RANDOM_USER.15` as inactive
#     When I invoke the cleanup lambda function
#     Then response body path $.usersCleared.inactive should be 1
#     When I GET /identity/`RANDOM_USER.15`
#     Then response code should be 404
#     And response body path $.code should be UNKNOWN_USER
#     Given I load up user2 public keys
#     And I set body to { "at": "`RANDOM_USER.15`", "key":`EPK`, "signature":`SPK`, "hash":"`SHA`" }
#     When I POST to /users
#     Then response code should be 403
#     And response body path $.code should be USER_EXISTS