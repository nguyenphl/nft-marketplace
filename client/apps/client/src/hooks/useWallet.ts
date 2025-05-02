import { AES } from "crypto-js";
import CryptoJS from 'crypto-js';
import { ethers } from "ethers";
import { useWalletState } from "../contexts/state";

export const useWallet = () => {
  const { address, network, importedToken, provider, signer, encryptedInfo, isUnlocked, set } = useWalletState()

  const importWallet = async (privateKey: string, passcode: string) => {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const encryptedInfo = await AES.encrypt(privateKey, passcode).toString()
    set({
      encryptedInfo,
      address: wallet.address,
      isUnlocked: true,
      signer: wallet,
      provider
    })
  }

  const unlockWallet = async (passcode: string) => {
    console.log("🚀 ~ unlockWal ~ encryptedInfo:", encryptedInfo)
    const decryptedInfo = await AES.decrypt(encryptedInfo, passcode).toString(CryptoJS.enc.Utf8)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const wallet = new ethers.Wallet(decryptedInfo, provider)
    set({
      address: wallet.address,
      isUnlocked: true,
      signer: wallet,
      provider
    })
  }

  const switchNetwork = async (chainId: number) => {
  }

  return {
    address,
    network,
    importedToken,
    provider,
    signer,
    encryptedInfo,
    isUnlocked,
    importWallet,
    unlockWallet,
    switchNetwork
  }
}
