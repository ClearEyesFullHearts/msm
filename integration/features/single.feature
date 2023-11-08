Feature: Single Test

    For a single

Scenario: Unknown username returns an error
  Given I set var FALSE_PASS to a 33 characters long base64 string
  And I set X-msm-Pass header to `FALSE_PASS`
  When I GET /identity/Unknown
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT