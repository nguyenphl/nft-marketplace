import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lock", function () {
  async function deployLockFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy();

    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(lock.target);
    
    const ONE_GWEI = 1_000_000_000;
    const lockAmount = ONE_GWEI;

    return { lock, owner, otherAccount, lockAmount, attacker };
  }

  describe("GetLockInfo", function () {
    it("Should return empty lock info for non-existent lock", async function () {
      const { lock } = await loadFixture(deployLockFixture);
      
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.amount).to.equal(0);
      expect(lockInfo.unlockTime).to.equal(0);
      expect(lockInfo.user).to.equal(ethers.ZeroAddress);
    });

    it("Should return correct lock info after locking", async function () {
      const { lock, owner, lockAmount } = await loadFixture(deployLockFixture);
      
      await lock.connect(owner).lockTokens(1, { value: lockAmount });
      
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.amount).to.equal(lockAmount);
      expect(lockInfo.unlockTime).to.be.gt(0);
      expect(lockInfo.user).to.equal(owner.address);
    });
  });

  describe("LockTokens", function () {
    it("Should lock tokens for specified minutes", async function () {
      const { lock, owner, lockAmount } = await loadFixture(deployLockFixture);
      
      const lockMinutes = 1;
      await expect(lock.connect(owner).lockTokens(lockMinutes, { value: lockAmount }))
        .to.emit(lock, "TokenLocked")
        .withArgs(owner.address, 0, lockAmount, anyValue);

      // Check contract balance
      expect(await ethers.provider.getBalance(lock.target)).to.equal(lockAmount);
      
      // Verify lock info
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.amount).to.equal(lockAmount);
      expect(lockInfo.user).to.equal(owner.address);
    });

    // it("Should revert if lock period is 0", async function () {
    //   const { lock, lockAmount } = await loadFixture(deployLockFixture);
      
    //   await expect(lock.lockTokens(0, { value: lockAmount }))
    //     .to.be.revertedWith("Lock period must be greater than 0 minutes");
    // });

    it("Should revert if no tokens are sent", async function () {
      const { lock } = await loadFixture(deployLockFixture);
      
      await expect(lock.lockTokens(1, { value: 0 }))
        .to.be.revertedWith("Must lock some tokens");
    });
  });

  describe("Unlock", function () {
    it("Should unlock tokens after lock period", async function () {
      const { lock, owner, lockAmount } = await loadFixture(deployLockFixture);
      
      // Lock tokens for 1 minute
      await expect(lock.connect(owner).lockTokens(1, { value: lockAmount }))
        .to.emit(lock, "TokenLocked")
        .withArgs(owner.address, 0, lockAmount, anyValue);
      
      // Increase time by 1 minute
      await time.increase(1 * 60);

      // Check for event emission
      await expect(lock.connect(owner).unlock(0))
        .to.emit(lock, "TokenUnlocked")
        .withArgs(owner.address, 0, lockAmount);

      // Verify contract balance is 0
      expect(await ethers.provider.getBalance(lock.target)).to.equal(0);
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.isUnlocked).to.equal(true);
    });

    it("Should transfer correct amount back to user", async function () {
      const { lock, owner, lockAmount } = await loadFixture(deployLockFixture);
      
      // Lock tokens for 1 minute
      await lock.connect(owner).lockTokens(1, { value: lockAmount });
      
      // Increase time by 1 minute
      await time.increase(1 * 60);

      // Check balance changes
      await expect(lock.connect(owner).unlock(0))
        .to.changeEtherBalances(
          [owner, lock],
          [lockAmount, -lockAmount]
        );
    });

    it("Should revert if no tokens are locked", async function () {
      const { lock } = await loadFixture(deployLockFixture);
      
      await expect(lock.unlock(0))
        .to.be.revertedWith("No tokens locked");
    });

    it("Should revert if tokens are still locked", async function () {
      const { lock, lockAmount } = await loadFixture(deployLockFixture);
      
      // Lock tokens for 1 minute
      await lock.lockTokens(1, { value: lockAmount });
      
      // Try to unlock immediately
      await expect(lock.unlock(0))
        .to.be.revertedWith("Tokens are still locked");
    });

    it("Should handle multiple users locking and unlocking", async function () {
      const { lock, owner, otherAccount, lockAmount } = await loadFixture(deployLockFixture);
      
      // Both users lock tokens
      await lock.connect(owner).lockTokens(1, { value: lockAmount });
      await lock.connect(otherAccount).lockTokens(2, { value: lockAmount });
      
      // Verify each user's lock info
      let ownerLock = await lock.getLockInfo(0);
      let otherLock = await lock.getLockInfo(1);
      expect(ownerLock.amount).to.equal(lockAmount);
      expect(otherLock.amount).to.equal(lockAmount);
      expect(ownerLock.user).to.equal(owner.address);
      expect(otherLock.user).to.equal(otherAccount.address);
      
      // Increase time by 1 minute
      await time.increase(1 * 60);
      
      // First user can unlock
      await expect(lock.connect(owner).unlock(0)).to.not.be.reverted;
      
      // Second user still can't unlock
      await expect(lock.connect(otherAccount).unlock(1))
        .to.be.revertedWith("Tokens are still locked");
      
      // Increase time by another 1 minute
      await time.increase(1 * 60);
      
      // Second user can now unlock
      await expect(lock.connect(otherAccount).unlock(1)).to.not.be.reverted;
      
      // Verify both users' lock info is cleared
      ownerLock = await lock.getLockInfo(0);
      otherLock = await lock.getLockInfo(1);
      expect(ownerLock.isUnlocked).to.equal(true);
      expect(otherLock.isUnlocked).to.equal(true);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum lock period (1 minute)", async function () {
      const { lock, lockAmount } = await loadFixture(deployLockFixture);
      
      await lock.lockTokens(1, { value: lockAmount });
      await time.increase(60);
      await expect(lock.unlock(0)).to.not.be.reverted;
    });

    it("Should handle large lock amounts", async function () {
      const { lock } = await loadFixture(deployLockFixture);
      const largeAmount = ethers.parseEther("100");
      
      await expect(lock.lockTokens(1, { value: largeAmount }))
        .to.emit(lock, "TokenLocked")
        .withArgs(anyValue, 0, largeAmount, anyValue);
      
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.amount).to.equal(largeAmount);
    });

    it("Should allow multiple locks from same user", async function () {
      const { lock, owner, lockAmount } = await loadFixture(deployLockFixture);
      
      // First lock
      await lock.connect(owner).lockTokens(1, { value: lockAmount });
      
      // Second lock
      await lock.connect(owner).lockTokens(2, { value: lockAmount });
      
      // Verify both locks exist
      const lock1 = await lock.getLockInfo(0);
      const lock2 = await lock.getLockInfo(1);
      
      expect(lock1.amount).to.equal(lockAmount);
      expect(lock2.amount).to.equal(lockAmount);
      expect(lock1.user).to.equal(owner.address);
      expect(lock2.user).to.equal(owner.address);
    });
  });

  describe("Attacker", function () {
    it("Should lock tokens for attacker", async function () {
      const { lock, attacker, lockAmount, owner } = await loadFixture(deployLockFixture);
      
      await lock.lockTokens(1, { value: lockAmount });
      await lock.lockTokens(1, { value: lockAmount });
      await lock.lockTokens(1, { value: lockAmount });
      await lock.lockTokens(1, { value: lockAmount });


      expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(0);
      await attacker.connect(owner).lockTokens(1, {value: lockAmount });
      // Increase time by 1 minute
      await time.increase(1 * 60);

      await attacker.connect(owner).unlock(4, lockAmount);

      expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(lockAmount * 4);
    });
  });
});
