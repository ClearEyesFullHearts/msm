Feature: Single Test

    For a single

Scenario: Unknown username returns an error
  When I GET /identity/Unknown
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Can get membership information
  Given `RANDOM_USER.1` creates a group groupDataGroup for ["`RANDOM_USER.14`", "`RANDOM_USER.4`"] with index 0
  And I am existing `RANDOM_USER.14`
  When I GET /group/`GROUP_ID.0`
  Then response code should be 200
  And response body match a challenge
  And response body path $.groupId should be `GROUP_ID.0`
  And response body path $.groupName should be groupDataGroup
  And response body path $.isAdmin should be false
  And response body should contain key
  And response body path $.key should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.members should be of type array with length 2
  And response body path $.members.0.at should be `RANDOM_USER.1`
  And response body path $.members.0.isAdmin should be true
  And response body path $.members.1.at should be `RANDOM_USER.4`
  And response body path $.members.1.isAdmin should be false
