import { ethers, upgrades } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("🚀 ~ main ~ owner:", owner.address)

  const myToken = await ethers.getContractFactory("MyToken");
  const token = await myToken.deploy(owner.address);
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());

  const lock = await ethers.getContractFactory("Lock");
  const lockContract = await lock.deploy();
  await lockContract.waitForDeployment();
  console.log("Lock deployed to:", await lockContract.getAddress());

  const approveTx = await token.approve(lockContract.target, ethers.parseEther("10000"));
  console.log("🚀 ~ main ~ approveTx:", approveTx)
  await approveTx.wait();


  const myBalance = await token.balanceOf(owner.address);
  console.log("🚀 ~ main ~ myBalance:", myBalance)
  const tx = await lockContract.lockCustomToken(ethers.parseEther("1000"), token.target, 0);
  await tx.wait();

  const myBalanceAfter = await token.balanceOf(owner.address);
  console.log("🚀 ~ main ~ myBalanceAfter:", myBalanceAfter)


  const unlockTx = await lockContract.unlock(0);


  const myBalanceAfterUnlock = await token.balanceOf(owner.address);
  console.log("🚀 ~ main ~ myBalanceAfterUnlock:", myBalanceAfterUnlock)

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
