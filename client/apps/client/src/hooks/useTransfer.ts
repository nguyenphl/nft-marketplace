import { useMutation } from "@tanstack/react-query";
import { ethers, ZeroAddress } from "ethers";
import { TokenInfo, useWalletState } from "../contexts/state";
import { getErc20Contract } from "../util/erc20";

const transferNative = async (signer: ethers.Wallet, recipient: string, amount: string) => {
  const tx = await signer.sendTransaction({
    to: recipient,
    value: ethers.parseEther(amount)
  })
  return tx.hash
}

const transferToken = async (signer: ethers.Wallet, token: TokenInfo, recipient: string, amount: string) => {
  const contract = getErc20Contract(token.address, signer.provider!).connect(signer) as ethers.Contract;

  const tx = await contract.transfer(recipient, ethers.parseUnits(amount, token.decimals))
  return tx.hash
}

export const useTransfer = () => {
  const { signer } = useWalletState()
  return useMutation({
    mutationFn: async ({ token, recipient, amount }: { token: TokenInfo, recipient: string, amount: string }) => {
      if (!signer) return

      if (token.address === ZeroAddress) {
        return transferNative(signer, recipient, amount)
      }
      return transferToken(signer, token, recipient, amount)
    },
  })
}
