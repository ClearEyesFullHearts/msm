Feature: Users search

    Search users and get their information
    
Scenario: Get search results
  Given I am existing user uHzmatVg2hPx
  When I GET /users?search=mat
  Then response code should be 200
  And response body path $ should be of type array with length 15
  And response body path $.0.id should be 50051
  And response body path $.0.at should be mat
  And response body path $.0.key should match Encryption Public Key
  And response body path $.0.signature should match Signature Public Key
    
Scenario: Search results are ordered by length
  Given I am existing user uHzmatVg2hPx
  When I GET /users?search=matB
  Then response code should be 200
  And response body path $ should be of type array with length 2
  And response body path $.0.at should be Up75X5BwU2matB
  And response body path $.1.at should be kTd2wmatBjnmtuQx9
    
Scenario: Search with no result should return an empty array
  Given I am existing user uHzmatVg2hPx
  When I GET /users?search=tamara
  Then response code should be 200
  And response body path $ should be of type array with length 0
    
Scenario: Search query should be at least 3 characters long
  Given I am existing user uHzmatVg2hPx
  When I GET /users?search=ma
  Then response code should be 400
    
Scenario: Search query should not contain any special character
    
Scenario: Search query is case insensitive
  Given I am existing user uHzmatVg2hPx
  When I GET /users?search=MaTb
  Then response code should be 200
  And response body path $ should be of type array with length 2
  And response body path $.0.at should be Up75X5BwU2matB
  And response body path $.1.at should be kTd2wmatBjnmtuQx9
    
Scenario: Get one account information by username
  Given I am existing user uHzmatVg2hPx
  When I GET /username/batmat
  Then response code should be 200
  And response body path $.id should be 50052
  And response body path $.at should be batmat
  And response body path $.key should match Encryption Public Key
  And response body path $.signature should match Signature Public Key
    
Scenario: Get one account information by id
  Given I am existing user uHzmatVg2hPx
  When I GET /user/50052
  Then response code should be 200
  And response body path $.id should be 50052
  And response body path $.at should be batmat
  And response body path $.key should match Encryption Public Key
  And response body path $.signature should match Signature Public Key
    
Scenario: Account username should be at least 3 characters long
    
Scenario: Account username should be less than 125 characters long
    
Scenario: Account username should not contain any special character
    
Scenario: Unknown account name or id should throw
  Given I am existing user uHzmatVg2hPx
  When I GET /user/1
  Then response code should be 404
  When I GET /username/tamara
  Then response code should be 404