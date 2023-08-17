Feature: Users search

    Search users and get their information
    
Scenario: Get search results
  Given I am existing `RANDOM_USER.7`
  When I GET /users?search=mat
  Then response code should be 200
  And response body path $ should be of type array with length 15
  And response body path $.0 should be mat
    
Scenario: Search results are ordered by length
  Given I am existing `RANDOM_USER.7`
  When I GET /users?search=matD
  Then response code should be 200
  And response body path $ should be of type array with length 2
  And response body path $.0 should be matdxEWjyZ1A6N
  And response body path $.1 should be fvxmB0matdOwiyui
    
Scenario: Search with no result should return an empty array
  Given I am existing `RANDOM_USER.7`
  When I GET /users?search=tamara
  Then response code should be 200
  And response body path $ should be of type array with length 0
    
Scenario: Search query should be at least 3 characters long
  Given I am existing `RANDOM_USER.7`
  When I GET /users?search=ma
  Then response code should be 400
    
Scenario: Search query should not contain any special character
    
Scenario: Search query is case insensitive
  Given I am existing `RANDOM_USER.7`
  When I GET /users?search=MaTd
  Then response code should be 200
  And response body path $ should be of type array with length 2
  And response body path $.0 should be matdxEWjyZ1A6N
  And response body path $.1 should be fvxmB0matdOwiyui
    
Scenario: Get one account information by username
  Given I am existing `RANDOM_USER.7`
  When I GET /user/batmat
  Then response code should be 200
  And response body path $.at should be batmat
  And response body path $.key should match Encryption Public Key
  And response body path $.signature should match Signature Public Key
    
# Scenario: Get one account information by id
#   Given I am existing `RANDOM_USER.7`
#   When I GET /user/50052
#   Then response code should be 200
#   And response body path $.id should be 50052
#   And response body path $.at should be batmat
#   And response body path $.key should match Encryption Public Key
#   And response body path $.signature should match Signature Public Key
    
Scenario: Account username should be at least 3 characters long
    
Scenario: Account username should be less than 125 characters long
    
Scenario: Account username should not contain any special character
    
Scenario: Unknown account name should throw
  Given I am existing `RANDOM_USER.7`
  When I GET /user/tamara
  Then response code should be 404