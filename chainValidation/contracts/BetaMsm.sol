// contracts/BetaMsm.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BetaMsm is Ownable {

    event UserValidated(uint64 indexed userId, string signature);
    
    function userValidated(uint64 userId, string memory signature) public onlyOwner {
      emit UserValidated(userId, signature);
   }
}