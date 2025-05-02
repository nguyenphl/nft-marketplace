import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TrainingNFT, MarketPlace } from "../client/library/typechain/src";

describe("MarketPlace", function () {
  async function deployMarketplaceFixture() {
    const [owner, seller, buyer] = await ethers.getSigners();

    // Deploy NFT contract
    const NFT = await ethers.getContractFactory("TrainingNFT");
    const nft = await NFT.deploy(owner.address) as unknown as TrainingNFT;
    await nft.waitForDeployment();

    // Deploy Marketplace
    const MarketPlace = await ethers.getContractFactory("MarketPlace");
    const marketplace = await MarketPlace.deploy() as unknown as MarketPlace;
    await marketplace.waitForDeployment();

    // Mint NFT to seller
    await nft.connect(owner).safeMint(seller.address, 1);
    await nft.connect(owner).safeMint(seller.address, 2);

    return { marketplace, nft, owner, seller, buyer };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { marketplace } = await loadFixture(deployMarketplaceFixture);
      expect(await marketplace.getAddress()).to.be.properAddress;
    });
  });

  describe("Listing", function () {
    it("Should allow NFT owner to list their NFT", async function () {
      const { marketplace, nft, seller } = await loadFixture(deployMarketplaceFixture);
      
      // Approve marketplace to transfer NFT
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

      // List NFT
      const price = ethers.parseEther("1.0");
      await expect(marketplace.connect(seller).list(await nft.getAddress(), 1, price))
        .to.emit(marketplace, "NewListing")
        .withArgs(await nft.getAddress(), 1, seller.address, price);

      // Verify listing
      const listing = await marketplace.listings(0);
      expect(listing.nftAddress).to.equal(await nft.getAddress());
      expect(listing.tokenId).to.equal(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(price);
    });

    it("Should reject listing from non-owner", async function () {
      const { marketplace, nft, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await expect(marketplace.connect(buyer).list(await nft.getAddress(), 1, ethers.parseEther("1.0")))
        .to.be.revertedWith("You are not the owner of the token");
    });

    it("Should reject listing without approval", async function () {
      const { marketplace, nft, seller } = await loadFixture(deployMarketplaceFixture);
      
      await expect(marketplace.connect(seller).list(await nft.getAddress(), 1, ethers.parseEther("1.0")))
        .to.be.revertedWith("You must approve the marketplace to transfer the token");
    });
  });

  describe("Viewing Listings", function () {
    it("Should return correct listings by page", async function () {
      const { marketplace, nft, seller } = await loadFixture(deployMarketplaceFixture);
      
      // Setup multiple listings
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      
      const price1 = ethers.parseEther("1.0");
      const price2 = ethers.parseEther("2.0");

      const balance = await nft.balanceOf(seller.address);
      console.log("🚀 ~ balance:", balance)
      
      await marketplace.connect(seller).list(await nft.getAddress(), 1, price1);
      await marketplace.connect(seller).list(await nft.getAddress(), 2, price2);

      // Get first page
      const listings = await marketplace.getListingByPage(0, 2);
      console.log("🚀 ~ listings:", listings)
      
      expect(listings.length).to.equal(2);
      expect(listings[0].tokenId).to.equal(1);
      expect(listings[0].price).to.equal(price1);
      expect(listings[1].tokenId).to.equal(2);
      expect(listings[1].price).to.equal(price2);
    });

    it("Should handle pagination correctly", async function () {
      const { marketplace, nft, seller } = await loadFixture(deployMarketplaceFixture);
      
      // Setup multiple listings
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      
      const price1 = ethers.parseEther("1.0");
      const price2 = ethers.parseEther("2.0");
      
      await marketplace.connect(seller).list(await nft.getAddress(), 1, price1);
      await marketplace.connect(seller).list(await nft.getAddress(), 2, price2);

      // Get second page
      const listings = await marketplace.getListingByPage(1, 1);
      console.log("🚀 ~ listings:", listings)
      
      expect(listings.length).to.equal(1);
      expect(listings[0].tokenId).to.equal(2);
      expect(listings[0].price).to.equal(price2);
    });
  });
});
