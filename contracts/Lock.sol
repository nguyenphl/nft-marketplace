// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Lock {
    struct LockInfo {
        address tokenAddress;
        uint256 amount;
        uint256 unlockTime;
        address user;
        bool isUnlocked;
    }

    uint256 private lockCount;
    mapping(uint256 => LockInfo) private lockMap;
    event TokenLocked(address indexed user, uint256 id, uint256 amount, uint256 unlockTime);
    event TokenUnlocked(address indexed user, uint256 id, uint256 amount);

    function getLockInfo(uint256 id) public view returns (LockInfo memory) {
        return lockMap[id];
    }

    function lockCustomToken(uint256 amount, address tokenAddress, uint _minutes) public {
        IERC20 token = IERC20(tokenAddress);
        token.transferFrom(msg.sender, address(this), amount);
        uint lockPeriod = _minutes * 1 minutes;
        uint newUnlockTime = block.timestamp + lockPeriod;

        lockMap[lockCount] = LockInfo({
            tokenAddress: tokenAddress,
            amount: amount,
            unlockTime: newUnlockTime,
            user: msg.sender,
            isUnlocked: false
        });

        emit TokenLocked(msg.sender, lockCount, amount, newUnlockTime);
        lockCount++;
    } 

    function lockTokens(uint _minutes) public payable {
        // require(_minutes > 0, "Lock period must be greater than 0 minutes");
        require(msg.value > 0, "Must lock some tokens");
        
        uint lockPeriod = _minutes * 1 minutes;
        uint newUnlockTime = block.timestamp + lockPeriod;

        lockMap[lockCount] = LockInfo({
            tokenAddress: address(0),
            amount: msg.value,
            unlockTime: newUnlockTime,
            user: msg.sender,
            isUnlocked: false
        });
        
        emit TokenLocked(msg.sender, lockCount, msg.value, newUnlockTime);
        lockCount++;
    }
    
    function unlock(uint256 id) public {
        LockInfo storage userLock = lockMap[id];
        require(userLock.amount > 0, "No tokens locked");
        require(block.timestamp >= userLock.unlockTime, "Tokens are still locked");
        require(userLock.user == msg.sender, "You are not the owner of this lock");
        require(userLock.isUnlocked == false, "Tokens are already unlocked");

        transfer(userLock.tokenAddress, msg.sender, userLock.amount);
        userLock.isUnlocked = true;
        
        emit TokenUnlocked(msg.sender, id, userLock.amount);
    }

    function transfer(address tokenAddress, address to, uint256 amount) private {
        if (tokenAddress == address(0)) {
            (bool success,) = payable(to).call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20 token = IERC20(tokenAddress);
            token.transfer(to, amount);
        }
    }
}
