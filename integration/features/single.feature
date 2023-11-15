Feature: Single Test

    For a single

# Scenario: Unknown username returns an error
#   When I GET /identity/Unknown
#   Then response code should be 400
#   And response body path $.code should be BAD_REQUEST_FORMAT
    
Scenario: Unknown account name should throw
  Given I am existing `RANDOM_USER.7`
  When I GET /user/tamara
  Then response code should be 404