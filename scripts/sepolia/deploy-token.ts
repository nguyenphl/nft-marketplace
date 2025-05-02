import { ethers, upgrades } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy(owner.address);
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());
}

main();
