import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20Mock } from "../client/library/typechain/src/contracts/ERC20Mock";

describe("MultisigWallet", function () {
  async function deployMultisigFixture() {
    const [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();
    const owners = [owner1.address, owner2.address, owner3.address];
    const required = 2; // Require 2 out of 3 owners to confirm

    const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
    const multisig = await MultisigWallet.deploy(owners, required);

    await owner1.sendTransaction({
      to: await multisig.getAddress(),
      value: ethers.parseEther("10.0"),
    });

    return { multisig, owner1, owner2, owner3, nonOwner, owners, required };
  }

  describe("Deployment", function () {
    it("Should set the correct owners and required confirmations", async function () {
      const { multisig, owners, required } = await loadFixture(deployMultisigFixture);

      // Check owners array
      for (let i = 0; i < owners.length; i++) {
        expect(await multisig.isOwner(owners[i])).to.equal(true);
      }

      // Check required confirmations
      expect(await multisig.required()).to.equal(required);
    });

    it("Should reject deployment with empty owners array", async function () {
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      await expect(MultisigWallet.deploy([], 1))
        .to.be.revertedWith("Owners array is empty");
    });

    it("Should reject deployment with too many owners", async function () {
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      const owners = Array(51).fill(ethers.ZeroAddress);
      await expect(MultisigWallet.deploy(owners, 1))
        .to.be.revertedWith("Owners array is too long");
    });

    it("Should reject deployment with invalid owner address", async function () {
      const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
      await expect(MultisigWallet.deploy([ethers.ZeroAddress], 1))
        .to.be.revertedWith("Invalid owner address");
    });
  });

  describe("Proposing Transactions", function () {
    it("Should allow owners to propose transactions", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      await expect(multisig.connect(owner1).proposeTransaction(recipient, value, data))
        .to.emit(multisig, "TransactionProposed")
        .withArgs(0, recipient, value, data);

      const transaction = await multisig.transactions(0);
      expect(transaction.to).to.equal(recipient);
      expect(transaction.value).to.equal(value);
      expect(transaction.data).to.equal(data);
      expect(transaction.executed).to.be.false;
      expect(transaction.confirmationCount).to.equal(1);
    });

    it("Should reject transaction proposals from non-owners", async function () {
      const { multisig, nonOwner } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      await expect(multisig.connect(nonOwner).proposeTransaction(recipient, value, data))
        .to.be.revertedWith("Not an owner");
    });

    it("Should reject proposals with invalid recipient address", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);
      const value = ethers.parseEther("1.0");
      const data = "0x";

      await expect(multisig.connect(owner1).proposeTransaction(ethers.ZeroAddress, value, data))
        .to.be.revertedWith("Invalid address");
    });
  });

  describe("Confirming Transactions", function () {
    it("Should allow owners to confirm transactions", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      // Confirm transaction
      await expect(multisig.connect(owner2)["confirmTransaction(uint256)"](0))
        .to.emit(multisig, "TransactionConfirmed")
        .withArgs(0, owner2.address);

      const transaction = await multisig.transactions(0);
      expect(transaction.confirmationCount).to.equal(2);
    });

    it("Should reject confirmations from non-owners", async function () {
      const { multisig, owner1, nonOwner } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      // Try to confirm as non-owner
      await expect(multisig.connect(nonOwner)["confirmTransaction(uint256)"](0))
        .to.be.revertedWith("Not an owner");
    });

    it("Should reject confirmations for invalid transaction IDs", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);
      await expect(multisig.connect(owner1)["confirmTransaction(uint256)"](0))
        .to.be.revertedWith("Invalid transaction ID");
    });

    it("Should reject confirmations for executed transactions", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose and confirm transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);
      await multisig.connect(owner2)["confirmTransaction(uint256)"](0);

      // Try to confirm again after execution
      await expect(multisig.connect(owner3)["confirmTransaction(uint256)"](0))
        .to.be.revertedWith("Transaction already executed");
    });

    it("Should reject duplicate confirmations", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      // Try to confirm twice
      await expect(multisig.connect(owner1)["confirmTransaction(uint256)"](0))
        .to.be.revertedWith("Already confirmed");
    });
  });

  describe("Revoking Confirmations", function () {
    it("Should allow owners to revoke their confirmations", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose and confirm transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      expect((await multisig.transactions(0)).confirmationCount).to.equal(1);
      // Revoke confirmation
      await expect(multisig.connect(owner1).revokeConfirmation(0))
        .to.emit(multisig, "TransactionRevoked")
        .withArgs(0, owner1.address);

      expect((await multisig.transactions(0)).confirmationCount).to.equal(0);
    });

    it("Should reject revocations from non-owners", async function () {
      const { multisig, owner1, nonOwner } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      // Try to revoke as non-owner
      await expect(multisig.connect(nonOwner).revokeConfirmation(0))
        .to.be.revertedWith("Not an owner");
    });

    it("Should reject revocations for unconfirmed transactions", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      // Try to revoke without confirming
      await expect(multisig.connect(owner2).revokeConfirmation(0))
        .to.be.revertedWith("Transaction not confirmed");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple transactions", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const value = ethers.parseEther("1.0");
      const data = "0x";

      // Propose multiple transactions
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);
      await multisig.connect(owner1).proposeTransaction(recipient, value, data);

      // Confirm second transaction
      await multisig.connect(owner2)["confirmTransaction(uint256)"](1);

      const transaction0 = await multisig.transactions(0);
      const transaction1 = await multisig.transactions(1);
      const transaction2 = await multisig.transactions(2);

      expect(transaction0.confirmationCount).to.equal(1);
      expect(transaction1.confirmationCount).to.equal(2);
      expect(transaction2.confirmationCount).to.equal(1);
    });

  });

  describe("Signature-based Confirmation", function () {
    it("Should allow confirming transactions with valid signatures", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const txValue = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, txValue, data);

      // Get transaction ID
      const transactionId = 0;

      // Sign the confirmation message
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signatures from owners
      const signature1 = await owner2.signTypedData(domain, types, message);
      const signature2 = await owner3.signTypedData(domain, types, message);

      // Confirm with signatures
      await expect(multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]))
        .to.emit(multisig, "TransactionConfirmed")
        .withArgs(transactionId, owner2.address)
        .to.emit(multisig, "TransactionConfirmed")
        .withArgs(transactionId, owner3.address);

      const transaction = await multisig.transactions(transactionId);
      expect(transaction.confirmationCount).to.equal(3);
    });

    it("Should reject confirmations with invalid signatures", async function () {
      const { multisig, owner1, nonOwner } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const txValue = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, txValue, data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signature from nonOwner
      const invalidSignature = await nonOwner.signTypedData(domain, types, message);


      // Try to confirm with invalid signature
      await expect(multisig["confirmTransaction(uint256,bytes[])"](transactionId, [invalidSignature]))
        .to.be.revertedWith("Not an owner");
    });

    it("Should reject confirmations with duplicate signatures", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const txValue = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, txValue, data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signature from owner2
      const signature = await owner2.signTypedData(domain, types, message);

      // Try to confirm with same signature twice
      await expect(multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature, signature]))
        .to.be.revertedWith("Already confirmed");
    });

    it("Should reject confirmations for executed transactions", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      const recipient = ethers.Wallet.createRandom().address;
      const txValue = ethers.parseEther("1.0");
      const data = "0x";

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(recipient, txValue, data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signatures from owners
      const signature1 = await owner2.signTypedData(domain, types, message);
      const signature2 = await owner3.signTypedData(domain, types, message);

      // Confirm with signatures to execute transaction
      await multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]);

      // Try to confirm again after execution
      await expect(multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1]))
        .to.be.revertedWith("Transaction already executed");
    });
  });

  describe("ERC20 Token Transfer", function () {
    it("Should allow transferring ERC20 tokens", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);

      // Deploy ERC20 token
      const ERC20 = await ethers.getContractFactory("ERC20Mock");
      const token = (await ERC20.deploy("Test Token", "TT", 18)) as unknown as ERC20Mock;
      await token.waitForDeployment();

      // Mint tokens to multisig wallet
      const amount = ethers.parseUnits("1000", 18);
      await token.mint(await multisig.getAddress(), amount);

      // Create transfer transaction data
      const recipient = ethers.Wallet.createRandom().address;
      const transferAmount = ethers.parseUnits("100", 18);
      const data = token.interface.encodeFunctionData("transfer", [recipient, transferAmount]);

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(await token.getAddress(), 0, data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signatures from owners
      const signature1 = await owner2.signTypedData(domain, types, message);
      const signature2 = await owner3.signTypedData(domain, types, message);

      // Confirm with signatures
      await multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]);

      // Check token balances
      expect(await token.balanceOf(await multisig.getAddress())).to.equal(ethers.parseUnits("900", 18));
      expect(await token.balanceOf(recipient)).to.equal(transferAmount);
    });

    it("Should reject ERC20 transfer with insufficient balance", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      
      // Deploy ERC20 token
      const ERC20 = await ethers.getContractFactory("ERC20Mock");
      const token = (await ERC20.deploy("Test Token", "TT", 18)) as unknown as ERC20Mock;
      await token.waitForDeployment();

      // Mint small amount of tokens to multisig wallet
      const amount = ethers.parseUnits("100", 18);
      await token.mint(await multisig.getAddress(), amount);

      // Create transfer transaction data with amount larger than balance
      const recipient = ethers.Wallet.createRandom().address;
      const transferAmount = ethers.parseUnits("200", 18);
      const data = token.interface.encodeFunctionData("transfer", [recipient, transferAmount]);

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(await token.getAddress(), 0, data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signatures from owners
      const signature1 = await owner2.signTypedData(domain, types, message);
      const signature2 = await owner3.signTypedData(domain, types, message);

      // Confirm with signatures and expect TransactionFailed event
      const tx = await multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]);
      const receipt = await tx.wait();

      // Find the TransactionFailed event
      const transactionFailedEvent = receipt?.logs.find(
        (log: any) => log.topics[0] === multisig.interface.getEvent("TransactionFailed").format("sighash")
      );

      // Decode the returnData to get the revert reason
      const returnData = transactionFailedEvent?.data;
      if (returnData) {
        // The first 4 bytes are the function selector, the rest is the encoded error message
        const encodedReason = returnData.slice(10); // Remove 0x and 4 bytes selector
        const reason = ethers.toUtf8String("0x" + encodedReason);
        expect(reason).to.equal("ERC20: transfer amount exceeds balance");
      }

      // Check that transaction was not executed
      const transaction = await multisig.transactions(transactionId);
      expect(transaction.executed).to.be.false;

      // Check token balances remain unchanged
      expect(await token.balanceOf(await multisig.getAddress())).to.equal(amount);
      expect(await token.balanceOf(recipient)).to.equal(0);
    });
  });

  describe("Lock Contract Integration", function () {
    it("Should allow locking and unlocking native tokens", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);

      // Deploy Lock contract
      const Lock = await ethers.getContractFactory("Lock");
      const lock = await Lock.deploy();
      await lock.waitForDeployment();

      // Send ETH to multisig wallet
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: ethers.parseEther("1.0")
      });

      // Create lock transaction data
      const lockMinutes = 5;
      const data = lock.interface.encodeFunctionData("lockTokens", [lockMinutes]);

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(await lock.getAddress(), ethers.parseEther("0.5"), data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signatures from owners
      const signature1 = await owner2.signTypedData(domain, types, message);
      const signature2 = await owner3.signTypedData(domain, types, message);

      // Confirm with signatures
      await multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]);

      // Check lock info
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.tokenAddress).to.equal(ethers.ZeroAddress);
      expect(lockInfo.amount).to.equal(ethers.parseEther("0.5"));
      expect(lockInfo.user).to.equal(await multisig.getAddress());
      expect(lockInfo.isUnlocked).to.be.false;

      // Create unlock transaction data
      const unlockData = lock.interface.encodeFunctionData("unlock", [0]);

      // Propose unlock transaction
      await multisig.connect(owner1).proposeTransaction(await lock.getAddress(), 0, unlockData);

      // Get new transaction ID
      const unlockTransactionId = 1;

      // Update message for new transaction
      message.transactionId = unlockTransactionId;

      // Get new signatures
      const unlockSignature1 = await owner2.signTypedData(domain, types, message);
      const unlockSignature2 = await owner3.signTypedData(domain, types, message);

      await time.increase(5 * 60);
      // Confirm unlock transaction
      await multisig["confirmTransaction(uint256,bytes[])"](unlockTransactionId, [unlockSignature1, unlockSignature2]);

      // Check lock info after unlock
      const updatedLockInfo = await lock.getLockInfo(0);
      expect(updatedLockInfo.isUnlocked).to.be.true;
    });

    it("Should allow locking and unlocking ERC20 tokens", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);

      const proposeAndConfirmTx = async (to: string, data: string, value: string) => {
        const proposalTx = await multisig.connect(owner1).proposeTransaction(to, value, data);
        const proposalTxReceipt = await proposalTx.wait();

        const transactionId = proposalTxReceipt?.logs[0].topics[1];

        if (!transactionId) {
          throw new Error("Transaction ID not found");
        }

        // Get domain and types for signing
        const domain = {
          name: "MultisigWallet",
          version: "Version 1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: await multisig.getAddress()
        };

        const types = {
          ConfirmTransaction: [
            { name: "transactionId", type: "uint256" }
          ]
        };

        const message = {
          transactionId: transactionId
        };

        // Get signatures from owners
        const signature1 = await owner2.signTypedData(domain, types, message);
        const signature2 = await owner3.signTypedData(domain, types, message);

        // Confirm with signatures
        const tx = await multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]);
        const receipt = await tx.wait();
      }

      // Deploy Lock contract
      const Lock = await ethers.getContractFactory("Lock");
      const lock = await Lock.deploy();
      await lock.waitForDeployment();

      // Deploy ERC20 token
      const ERC20 = await ethers.getContractFactory("ERC20Mock");
      const token = (await ERC20.deploy("Test Token", "TT", 18)) as unknown as ERC20Mock;
      await token.waitForDeployment();

      // Mint tokens to multisig wallet
      const originTokenAmount = ethers.parseUnits("1000", 18);
      await token.mint(await multisig.getAddress(), originTokenAmount);
      const lockAmount = ethers.parseUnits("500", 18);

      const approveData = token.interface.encodeFunctionData("approve", [await lock.getAddress(), lockAmount]);
      await proposeAndConfirmTx(await token.getAddress(), approveData, '0');


      // check allowence
      const allowance = await token.allowance(await multisig.getAddress(), await lock.getAddress());
      expect(allowance).to.equal(lockAmount);

      // Create lock transaction data
      const lockMinutes = 5;
      const lockData = lock.interface.encodeFunctionData("lockCustomToken", [lockAmount, await token.getAddress(), lockMinutes]);

      // Propose transaction
      await proposeAndConfirmTx(await lock.getAddress(), lockData, '0');
      
      // Check lock info
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.tokenAddress).to.equal(await token.getAddress());
      expect(lockInfo.amount).to.equal(lockAmount);
      expect(lockInfo.user).to.equal(await multisig.getAddress());
      expect(lockInfo.isUnlocked).to.be.false;

      // Create unlock transaction data
      const unlockData = lock.interface.encodeFunctionData("unlock", [0]);

      await time.increase(5 * 60);

      await proposeAndConfirmTx(await lock.getAddress(), unlockData, '0');
      // Check lock info after unlock
      const updatedLockInfo = await lock.getLockInfo(0);
      expect(updatedLockInfo.isUnlocked).to.be.true;

      // Check token balances
      expect(await token.balanceOf(await multisig.getAddress())).to.equal(originTokenAmount);
      expect(await token.balanceOf(await lock.getAddress())).to.equal(0);
    });

    it("Should reject unlocking tokens before unlock time", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      
      // Deploy Lock contract
      const Lock = await ethers.getContractFactory("Lock");
      const lock = await Lock.deploy();
      await lock.waitForDeployment();

      // Send ETH to multisig wallet
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: ethers.parseEther("1.0")
      });

      // Create lock transaction data with 5 minutes lock time
      const lockMinutes = 5;
      const data = lock.interface.encodeFunctionData("lockTokens", [lockMinutes]);

      // Propose transaction
      await multisig.connect(owner1).proposeTransaction(await lock.getAddress(), ethers.parseEther("0.5"), data);

      // Get transaction ID
      const transactionId = 0;

      // Get domain and types for signing
      const domain = {
        name: "MultisigWallet",
        version: "Version 1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await multisig.getAddress()
      };

      const types = {
        ConfirmTransaction: [
          { name: "transactionId", type: "uint256" }
        ]
      };

      const message = {
        transactionId: transactionId
      };

      // Get signatures from owners
      const signature1 = await owner2.signTypedData(domain, types, message);
      const signature2 = await owner3.signTypedData(domain, types, message);

      // Confirm with signatures
      await multisig["confirmTransaction(uint256,bytes[])"](transactionId, [signature1, signature2]);

      // Try to unlock immediately
      const unlockData = lock.interface.encodeFunctionData("unlock", [0]);

      // Propose unlock transaction
      await multisig.connect(owner1).proposeTransaction(await lock.getAddress(), 0, unlockData);

      // Get new transaction ID
      const unlockTransactionId = 1;

      // Update message for new transaction
      message.transactionId = unlockTransactionId;

      // Get new signatures
      const unlockSignature1 = await owner2.signTypedData(domain, types, message);
      const unlockSignature2 = await owner3.signTypedData(domain, types, message);

      // Confirm unlock transaction and expect failure
      const tx = await multisig["confirmTransaction(uint256,bytes[])"](unlockTransactionId, [unlockSignature1, unlockSignature2]);
      const receipt = await tx.wait();

      // Find the TransactionFailed event
      const transactionFailedEvent = receipt?.logs.find(
        (log: any) => log.topics[0] === multisig.interface.getEvent("TransactionFailed").format("sighash")
      );

      // Decode the returnData to get the revert reason
      const returnData = transactionFailedEvent?.data;
      if (returnData) {
        // The first 4 bytes are the function selector, the rest is the encoded error message
        const encodedReason = returnData.slice(10); // Remove 0x and 4 bytes selector
        const reason = ethers.toUtf8String("0x" + encodedReason);
        expect(reason).to.equal("Tokens are still locked");
      }

      // Check lock info remains locked
      const lockInfo = await lock.getLockInfo(0);
      expect(lockInfo.isUnlocked).to.be.false;
    });
  });
}); 
