import { useQuery } from "@tanstack/react-query";
import { TokenBalance, TokenInfo, useWalletState } from "../contexts/state";
import { ethers, ZeroAddress } from "ethers";
import { getErc20Contract } from "../util/erc20";

export const useNativeBalance = () => {
  const { address, provider, isUnlocked } = useWalletState()

  const nativeBalance = useQuery({
    queryKey: ['balance', address, isUnlocked, provider],
    queryFn: async () => {
      if (!provider) {
        throw new Error('Provider not found');
      }
      const balance = await provider.getBalance(address)
      return {
        address: ZeroAddress,
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        balance: ethers.formatEther(balance)
      } as TokenBalance
    },
    enabled: !!address && !!provider,
    gcTime: 30_000,
  })

  return nativeBalance
}

export const useTokenBalances = () => {
  const { address, provider, importedToken } = useWalletState()

  const tokenBalances = useQuery({
    queryKey: ['tokenBalances', address, provider],
    queryFn: async () => {
      return Promise.all(importedToken.map(async (token) => {
        if (!provider) return {
          ...token,
          balance: '0'
        }
        const contract = getErc20Contract(token.address, provider)
        const balance = await contract.balanceOf(address)
        return {
          ...token,
          balance: ethers.formatUnits(balance, token.decimals)
        }
      }))
    },
    enabled: !!address && !!provider && !!importedToken,
    gcTime: 30_000
  })

  return tokenBalances
}

export const useBalances = () => {
  const nativeBalance = useNativeBalance()
  const tokenBalances = useTokenBalances()

  return {
    nativeBalance: nativeBalance.data,
    data: [nativeBalance.data, ...(tokenBalances.data || [])].filter(Boolean) as TokenBalance[],
    isLoading: nativeBalance.isLoading || tokenBalances.isLoading,
    isError: nativeBalance.isError || tokenBalances.isError,
    error: nativeBalance.error || tokenBalances.error
  }
}

