Feature: Single Test

    For a single

# Scenario: Unknown username returns an error
#   Given I set var FALSE_PASS to a 33 characters long base64 string
#   And I set X-msm-Pass header to `FALSE_PASS`
#   When I GET /identity/Unknown
#   Then response code should be 400
#   And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: Set the vault up and use it
  Given I am a new valid user
  And I set my vault item VAULT_ITEM with password iamapoorlonesomecowboy and iamapoorlonesomecowgirl
  And I set body to `VAULT_ITEM`
  And I set signature header
  When I PUT /vault
  Then response code should be 200
  And I set X-msm-Pass header to `NEW_PASS_HASH`
  And I GET /identity/`MY_AT`
  And response code should be 200
  And response body should contain vault
  And response body path $.vault.token should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And response body path $.vault.iv should be ^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$
  And I store the value of body path $.vault as VAULT in scenario scope
  When I open the vault VAULT with iamapoorlonesomecowboy
  Then response body match a challenge
  And response body path $.user.username should be `MY_AT`
  And response body path $.token should be ^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$
  And response body path $.contacts should be null