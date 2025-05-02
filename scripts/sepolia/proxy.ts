import { ethers, upgrades } from "hardhat";

async function main() {
  const Lock = await ethers.getContractFactory("Lock");
  const lock = await upgrades.deployProxy(Lock, []);
  await lock.waitForDeployment();
  console.log("Lock deployed to:", await lock.getAddress());

  const tx = await lock.lockTokens(1, { value: ethers.parseEther("1") });
  await tx.wait();

  const currentLock = await lock.getLockInfo(0);
}

main();
