import { ethers, upgrades } from "hardhat";

async function main() {
  const LockV2 = await ethers.getContractFactory("Lock");
  const lock = await upgrades.upgradeProxy('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', LockV2);
  console.log("Lock upgraded");

  const currentLock = await lock.getLockInfo(0);
  console.log("🚀 ~ main ~ currentLock:", currentLock)
}

main();
