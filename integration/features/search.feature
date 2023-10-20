Feature: Users search

    Search users and get their information
    
Scenario: Get search results
  Given I am existing `RANDOM_USER.7`
  When I GET /search?user=mat
  Then response code should be 200
  And response body path $ should be of type array with length 15
  And response body path $.0 should be mat
    
Scenario: Search results are ordered by length
  Given I am existing `RANDOM_USER.7`
  When I GET /search?user=mat
  Then response code should be 200
  And response body path $ should be of type array with length 15
  And response body path $.0 should be mat
  And response body path $.1 should be batmat
  And response body path $.2 should be `RANDOM_USER.0`
    
Scenario: Search with no result should return an empty array
  Given I am existing `RANDOM_USER.7`
  When I GET /search?user=tamara
  Then response code should be 200
  And response body path $ should be of type array with length 0
    
Scenario: Search query should be at least 3 characters long
  Given I am existing `RANDOM_USER.7`
  When I GET /search?user=ma
  Then response code should be 400
    
Scenario: Search query should not contain any special character
    
Scenario: Search query is case insensitive
  Given I am existing `RANDOM_USER.7`
  When I GET /search?user=MaT
  Then response code should be 200
  And response body path $ should be of type array with length 15
  And response body path $.0 should be mat
  And response body path $.1 should be batmat
  And response body path $.2 should be `RANDOM_USER.0`
    
Scenario: Get one account information by username
  Given I am existing `RANDOM_USER.7`
  When I GET /user/batmat
  Then response code should be 200
  And response body path $.at should be batmat
  And response body path $.key should match Encryption Public Key
  And response body path $.signature should match Signature Public Key
    
Scenario: Get multiple account information by username
  Given I am existing `RANDOM_USER.7`
  When I GET /users?list=mat,`RANDOM_USER.14`,unknown,`RANDOM_USER.8`
  Then response code should be 200
  And response body path $ should be of type array with length 3
  And response body path $.0.at should be mat
  And response body path $.1.at should be `RANDOM_USER.14`
  And response body path $.2.at should be `RANDOM_USER.8`
    
Scenario: Account username should be at least 3 characters long
    
Scenario: Account username should be less than 125 characters long
    
Scenario: Account username should not contain any special character
    
Scenario: Unknown account name should throw
  Given I am existing `RANDOM_USER.7`
  When I GET /user/tamara
  Then response code should be 404