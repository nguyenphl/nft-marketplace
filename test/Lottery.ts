import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lottery", function () {
  async function deployLotteryFixture() {
    const [owner, player1, player2, player3, feeAddress] = await ethers.getSigners();
    const GUEST_AMOUNT = ethers.parseEther("0.01");
    const TAX_PERCENT = 500; // 5%

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(feeAddress.address, TAX_PERCENT);

    return { lottery, owner, player1, player2, player3, feeAddress, GUEST_AMOUNT, TAX_PERCENT };
  }

  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      expect(await lottery.owner()).to.equal(owner.address);
    });

    it("Should set the correct fee address", async function () {
      const { lottery, feeAddress } = await loadFixture(deployLotteryFixture);
      expect(await lottery.feeAddress()).to.equal(feeAddress.address);
    });

    it("Should set the correct tax percent", async function () {
      const { lottery, TAX_PERCENT } = await loadFixture(deployLotteryFixture);
      expect(await lottery.taxPercent()).to.equal(TAX_PERCENT);
    });

    it("Should set the correct guest amount", async function () {
      const { lottery, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      expect(await lottery.guestAmount()).to.equal(GUEST_AMOUNT);
    });
  });

  describe("Guessing", function () {
    it("Should allow players to make guesses", async function () {
      const { lottery, player1, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      const guess = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint8", "uint256"],
          [5, 123]
        )
      );

      await expect(
        lottery.connect(player1).guess(guess, { value: GUEST_AMOUNT })
      ).to.emit(lottery, "GuessMade");
    });

    it("Should reject guesses with incorrect amount", async function () {
      const { lottery, player1 } = await loadFixture(deployLotteryFixture);
      
      const guess = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint8", "uint256"],
          [5, 123]
        )
      );

      await expect(
        lottery.connect(player1).guess(guess, { value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Must send exactly guest amount");
    });

    it("Should reject duplicate guesses", async function () {
      const { lottery, player1, player2, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      const guess = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint8", "uint256"],
          [5, 123]
        )
      );

      await lottery.connect(player1).guess(guess, { value: GUEST_AMOUNT });
      await expect(
        lottery.connect(player2).guess(guess, { value: GUEST_AMOUNT })
      ).to.be.revertedWith("Already used guess");
    });
  });

  describe("Submitting Proofs", function () {
    it("Should allow players to submit proofs", async function () {
      const { lottery, player1, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      const nonce = 123;
      const number = 5;
      const guess = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number, nonce]
        )
      );

      const tx = await lottery.connect(player1).guess(guess, { value: GUEST_AMOUNT });
      const receipt = await tx.wait();
      const gameId = (receipt?.logs[0] as any).args[0];

      await expect(
        lottery.connect(player1).submitProof(gameId, guess, number, nonce)
      ).to.emit(lottery, "ProofSubmitted");
    });

    it("Should reject invalid proofs", async function () {
      const { lottery, player1, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      const nonce = 123;
      const number = 5;
      const guess = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number, nonce]
        )
      );

      await lottery.connect(player1).guess(guess, { value: GUEST_AMOUNT });
      await expect(
        lottery.connect(player1).submitProof(0, guess, number + 1, nonce)
      ).to.be.revertedWith("Invalid proof");
    });

    it("Should reject proofs from non-guessers", async function () {
      const { lottery, player1, player2, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      const nonce = 123;
      const number = 5;
      const guess = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number, nonce]
        )
      );

      await lottery.connect(player1).guess(guess, { value: GUEST_AMOUNT });
      await expect(
        lottery.connect(player2).submitProof(0, guess, number, nonce)
      ).to.be.revertedWith("Not your guess");
    });
  });

  describe("Game Settlement", function () {
    it("Should automatically settle after 2 cycles", async function () {
      const { lottery, player1, player2, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      const nonce = 123;
      const number = 5;
      const guess = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number, nonce]
        )
      );

      // Make guess and submit proof
      await lottery.connect(player1).guess(guess, { value: GUEST_AMOUNT });
      await lottery.connect(player1).submitProof(0, guess, number, nonce);

      // Fast forward to cycle 2 (30 minutes)
      await time.increase(30 * 60);

      await lottery.connect(player2).settleGame(0);

      // Check if game is settled
      const game = await lottery.games(0);
      expect(game.isSettled).to.be.true;
    });

    it("Should distribute prizes correctly", async function () {
      const { lottery, player1, player2, player3, feeAddress, GUEST_AMOUNT, TAX_PERCENT } = await loadFixture(deployLotteryFixture);
      
      // Track initial balances
      const player1InitialBalance = await ethers.provider.getBalance(player1.address);
      const feeAddressInitialBalance = await ethers.provider.getBalance(feeAddress.address);

      // Player 1 guesses 5
      const nonce1 = 123;
      const number1 = 5;
      const guess1 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number1, nonce1]
        )
      );
      const tx1 = await lottery.connect(player1).guess(guess1, { value: GUEST_AMOUNT });
      const receipt1 = await tx1.wait();
      if (!receipt1) throw new Error("Transaction receipt is null");
      const gasCost1 = receipt1.gasUsed * receipt1.gasPrice;

      // Player 2 guesses 6
      const nonce2 = 456;
      const number2 = 6;
      const guess2 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number2, nonce2]
        )
      );
      const tx2 = await lottery.connect(player2).guess(guess2, { value: GUEST_AMOUNT });
      const receipt2 = await tx2.wait();
      if (!receipt2) throw new Error("Transaction receipt is null");

      // Player 3 also guesses 6 to make number 5 the winner
      const nonce3 = 789;
      const guess3 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [number2, nonce3]
        )
      );
      const tx3 = await lottery.connect(player3).guess(guess3, { value: GUEST_AMOUNT });
      const receipt3 = await tx3.wait();
      if (!receipt3) throw new Error("Transaction receipt is null");

      // Player1 submits proof
      const tx4 = await lottery.connect(player1).submitProof(0, guess1, number1, nonce1);
      const receipt4 = await tx4.wait();
      if (!receipt4) throw new Error("Transaction receipt is null");
      const gasCost4 = receipt4.gasUsed * receipt4.gasPrice;

      // Player2 submits proof
      const tx5 = await lottery.connect(player2).submitProof(0, guess2, number2, nonce2);
      const receipt5 = await tx5.wait();
      if (!receipt5) throw new Error("Transaction receipt is null");

      const tx6 = await lottery.connect(player3).submitProof(0, guess3, number2, nonce3);
      const receipt6 = await tx6.wait();
      if (!receipt6) throw new Error("Transaction receipt is null");

      // Fast forward 2 cycles
      await time.increase(30 * 60);

      await lottery.connect(player3).settleGame(0);

      // Check balances
      const totalAmount = GUEST_AMOUNT * 3n;
      const feeAmount = (totalAmount * BigInt(TAX_PERCENT)) / 10000n;
      const prizePerWinner = totalAmount - feeAmount;

      const player1FinalBalance = await ethers.provider.getBalance(player1.address);
      const feeAddressFinalBalance = await ethers.provider.getBalance(feeAddress.address);

      // Account for player1's gas costs and initial guess amount
      const player1GasCost = gasCost1 + gasCost4;
      const expectedPlayer1BalanceChange = prizePerWinner - player1GasCost - GUEST_AMOUNT;

      expect(feeAddressFinalBalance - feeAddressInitialBalance).to.equal(feeAmount);
      expect(player1FinalBalance - player1InitialBalance).to.equal(expectedPlayer1BalanceChange);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to change guest amount", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      const newAmount = ethers.parseEther("0.02");
      await lottery.connect(owner).setGuestAmount(newAmount);
      expect(await lottery.guestAmount()).to.equal(newAmount);
    });

    it("Should reject guest amount changes from non-owner", async function () {
      const { lottery, player1 } = await loadFixture(deployLotteryFixture);
      const newAmount = ethers.parseEther("0.02");
      await expect(
        lottery.connect(player1).setGuestAmount(newAmount)
      ).to.be.revertedWith("Not owner");
    });

    it("Should allow owner to change fee address", async function () {
      const { lottery, owner, player1 } = await loadFixture(deployLotteryFixture);
      const newFeeAddress = player1.address;
      await lottery.connect(owner).setFeeAddress(newFeeAddress);
      expect(await lottery.feeAddress()).to.equal(newFeeAddress);
    });

    it("Should reject invalid fee address", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      await expect(
        lottery.connect(owner).setFeeAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid fee address");
    });

    it("Should allow owner to change tax percent", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      const newTaxPercent = 1000; // 10%
      await lottery.connect(owner).setTaxPercent(newTaxPercent);
      expect(await lottery.taxPercent()).to.equal(newTaxPercent);
    });

    it("Should reject tax percent over 100%", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      await expect(
        lottery.connect(owner).setTaxPercent(10001)
      ).to.be.revertedWith("Tax too high");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum guest amount", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      const minAmount = ethers.parseEther("0.000000000000000001");
      await lottery.connect(owner).setGuestAmount(minAmount);
      expect(await lottery.guestAmount()).to.equal(minAmount);
    });

    it("Should handle maximum tax percent (100%)", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      const maxTax = 10000; // 100%
      await lottery.connect(owner).setTaxPercent(maxTax);
      expect(await lottery.taxPercent()).to.equal(maxTax);
    });

    it("Should handle multiple games in different cycles", async function () {
      const { lottery, player1, player2, GUEST_AMOUNT } = await loadFixture(deployLotteryFixture);
      
      // Get initial timestamp
      const initialTime = await time.latest();
      
      // Game 1
      const guess1 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [5, 123]
        )
      );
      await lottery.connect(player1).guess(guess1, { value: GUEST_AMOUNT });
      
      // Move to next cycle
      await time.increase(15 * 60);
      
      // Game 2
      const guess2 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "uint256"],
          [6, 456]
        )
      );
      await lottery.connect(player2).guess(guess2, { value: GUEST_AMOUNT });
      
      // Check both games exist
      const game1 = await lottery.games(0);
      const game2 = await lottery.games(1);
      
      // Game 1 should have start time equal to initial time (allow for small difference)
      expect(game1.startTime).to.be.at.least(initialTime);
      expect(game1.startTime).to.be.at.most(initialTime + 5); // Allow up to 5 seconds difference
      
      // Game 2 should have start time equal to initial time + 15 minutes (allow for small difference)
      expect(game2.startTime).to.be.at.least(initialTime + 15 * 60);
      expect(game2.startTime).to.be.at.most(initialTime + 15 * 60 + 5); // Allow up to 5 seconds difference
    });
  });
}); 
