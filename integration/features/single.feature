Feature: Single Test

    For a single

Scenario: Unknown username returns an error
  When I GET /identity/Unknown
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Writing to a group
  Given `RANDOM_USER.1` creates a group best group for ["`RANDOM_USER.14`", "`RANDOM_USER.3`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.4`
  And I set group message body to { "title": "Write one group message" , "content": "My group message content" }
  And I set signature header
  When I POST to /group/`GROUP_ID.0`/message
  Then response code should be 201
  # When I GET /inbox
  # Then response body path $ should be of type array
  # Given I am existing `RANDOM_USER.1`
  # When I GET /group/`GROUP_ID.0`
  # And response body match a challenge
  # And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  # When I GET /inbox
  # Then response body path $ should be of type array
  # And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  # When I GET /message/`FIRST_MSG_ID`
  # And response body path $ should match a challenge
  # And resolved challenge should match a group message
  # And resolved challenge path $.groupId should match `GROUP_ID.0`
  # And resolved challenge path $.from should match best group
  # And resolved challenge path $.title should match Write one group message
  # And resolved challenge path $.content should match My group message content
  # Given I am existing `RANDOM_USER.14`
  # When I GET /group/`GROUP_ID.0`
  # And response body match a challenge
  # And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  # When I GET /inbox
  # Then response body path $ should be of type array
  # And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  # When I GET /message/`FIRST_MSG_ID`
  # And response body path $ should match a challenge
  # And resolved challenge should match a group message
  # And resolved challenge path $.groupId should match `GROUP_ID.0`
  # And resolved challenge path $.from should match best group
  # And resolved challenge path $.title should match Write one group message
  # And resolved challenge path $.content should match My group message content
  # Given I am existing `RANDOM_USER.3`
  # When I GET /group/`GROUP_ID.0`
  # And response body match a challenge
  # And I store the value of body path $.key as MY_GROUP_KEY in scenario scope
  # When I GET /inbox
  # Then response body path $ should be of type array
  # And I store the value of body path $.0.id as FIRST_MSG_ID in scenario scope
  # When I GET /message/`FIRST_MSG_ID`
  # And response body path $ should match a challenge
  # And resolved challenge should match a group message
  # And resolved challenge path $.groupId should match `GROUP_ID.0`
  # And resolved challenge path $.from should match best group
  # And resolved challenge path $.title should match Write one group message
  # And resolved challenge path $.content should match My group message content