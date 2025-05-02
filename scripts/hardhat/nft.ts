import { ethers, upgrades } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("🚀 ~ main ~ owner:", owner.address)

  const trainingNFT = await ethers.getContractFactory("TrainingNFT");
  const training = await trainingNFT.deploy(owner.address);
  await training.waitForDeployment();
  console.log("Token deployed to:", await training.getAddress());

  const marketPlace = await ethers.getContractFactory("MarketPlace");
  const marketPlaceContract = await marketPlace.deploy();
  await marketPlaceContract.waitForDeployment();
  console.log("MarketPlace deployed to:", await marketPlaceContract.getAddress());

  await training.safeMint('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 1);
  await training.safeMint('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 2);
  await training.safeMint('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 3);

  await training.safeMint(owner.address, 4);
  await training.safeMint(owner.address, 5);
  await training.safeMint(owner.address, 6);

  await training.setApprovalForAll(marketPlaceContract.target, true);


  await owner.sendTransaction({
    to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    value: ethers.parseEther('10')
  })
  await marketPlaceContract.list(training.target, 4, 100);
  await marketPlaceContract.list(training.target, 5, 200);
  await marketPlaceContract.list(training.target, 6, 300);


  await marketPlaceContract.connect(owner).cancelListing(training.target, 4);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
