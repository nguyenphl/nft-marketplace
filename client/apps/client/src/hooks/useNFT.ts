import { MarketPlace__factory, TrainingNFT__factory } from "@client/typechain"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ethers } from "ethers"
import { useMemo } from "react"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"
import { CONTRACT_ADDRESSES } from "../constants/env"
import { getContract } from "viem"

export interface NFT {
  contractAddress: string
  tokenId: string
  name?: string
}

export const useContract = (contractAddress: string) => {
  const { data: walletClient } = useWalletClient()

  return useMemo(() => {
    if (!walletClient) return null

    const ethersProvider = new ethers.BrowserProvider(walletClient.transport);

    return TrainingNFT__factory.connect(contractAddress as `0x${string}`, ethersProvider as any)
  }, [walletClient, contractAddress])
}

export const useUserNFTs = () => {
  const { address } = useAccount()
  const contract = useContract(CONTRACT_ADDRESSES.TRAINING_NFT)

  return useQuery({
    queryKey: ['user-nfts', address],
    queryFn: async () => {
      if (!contract) return []

      const nfts = await contract.balanceOf(address!)
      const tokenIds = await Promise.all(new Array(+nfts.toString()).fill(0).map(async (_, i) => contract?.tokenOfOwnerByIndex(address!, BigInt(i))))

      return tokenIds.map((id) => ({
        contractAddress: CONTRACT_ADDRESSES.TRAINING_NFT,
        tokenId: id.toString(),
        name: `NFT #${id.toString()}`,
      }))
    },
    enabled: !!address && !!contract,
    gcTime: 0,
    refetchInterval: 1000,

  })
}

export const useIsApproved = (contractAddress: string, tokenId: string) => {
  const { address } = useAccount()
  const contract = useContract(contractAddress)

  return useQuery({
    queryKey: ['is-approved', contractAddress, tokenId],
    queryFn: async () => {
      console.log("🚀 ~ useIsApproved:", contract)
      if (!contract) return false

      const isApproved = await contract.isApprovedForAll(address!, CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS)
      console.log("🚀 ~ queryFn: ~ isApproved:", isApproved)

      if (isApproved) return true

      const approved = await contract.getApproved(tokenId)
      console.log("🚀 ~ queryFn: ~ approved:", approved)

      return approved === CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS
    },
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 3000,
  })
}

export const useApprove = (contractAddress: string, tokenId: string) => {
  const contract = useContract(contractAddress)
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!contract || !walletClient || !publicClient) return false

      const tx = await walletClient.sendTransaction({
        to: contractAddress as `0x${string}`,
        data: contract.interface.encodeFunctionData('approve', [CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS, tokenId]) as `0x${string}`,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })

      console.log("🚀 ~ mutationFn: ~ receipt:", receipt)
      return tx
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-approved', contractAddress, tokenId] })
    }
  })
}

export const useMutateListNFT = (contractAddress: string, tokenId: string) => {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (price: string) => {
      if (!walletClient || !publicClient) return false
      const contract = MarketPlace__factory.connect(CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`)

      const tx = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`,
        data: contract.interface.encodeFunctionData('list', [contractAddress, tokenId, ethers.parseEther(price)]) as `0x${string}`,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })

      console.log("🚀 ~ mutationFn: ~ receipt:", receipt)
      return tx
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-nft'] })
    }
  })
}

export const useMutateCancelListNFT = (contractAddress: string, tokenId: string) => {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!walletClient || !publicClient) return false
      const contract = MarketPlace__factory.connect(CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`)

      const tx = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`,
        data: contract.interface.encodeFunctionData('cancelListing', [contractAddress, tokenId]) as `0x${string}`,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })

      console.log("🚀 ~ mutationFn: ~ receipt:", receipt)
      return tx
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-nft'] })
    }
  })
}

export const useMutateBuyNFT = (contractAddress: string, tokenId: string) => {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!walletClient || !publicClient) return false

      const price = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`,
        abi: MarketPlace__factory.abi,
        functionName: 'getListingPrice',
        args: [contractAddress as `0x${string}`, tokenId as any],
      })

      const contract = MarketPlace__factory.connect(CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`)

      const tx = await walletClient.sendTransaction({
        to: CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`,
        data: contract.interface.encodeFunctionData('buy', [contractAddress, tokenId]) as `0x${string}`,
        value: price
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })

      console.log("🚀 ~ mutationFn: ~ receipt:", receipt)
      return tx
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-nft'] })
    }
  })
}

export interface ListedNFT {
  id: string
  contractAddress: string
  tokenId: string
  price: string
  name: string;
  seller: string;
}

export const useListNFT = () => {
  const { data: walletClient } = useWalletClient()

  return useInfiniteQuery({
    queryKey: ['list-nft'],
    queryFn: async ({ pageParam = 0 }) => {
      if (!walletClient) return []

      const provider = new ethers.BrowserProvider(walletClient.transport)
      const contract = MarketPlace__factory.connect(CONTRACT_ADDRESSES.MARKETPLACE_ADDRESS as `0x${string}`, provider as any)

      const result = await contract.getListingByPage(pageParam * 10, 10)
      return result.filter(item => item.isActive).map((item) => ({
        id: `${item.nftAddress}-${item.tokenId}`,
        contractAddress: item.nftAddress,
        tokenId: item.tokenId.toString(),
        price: item.price.toString(),
        name: `NFT #${item.tokenId.toString()}`,
        seller: item.seller,
        isActive: item.isActive,
      }))
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length > 0 ? pages.length + 1 : undefined
    },
    enabled: !!walletClient,
    initialPageParam: 0,
    gcTime: 30_000,
    staleTime: 30_000,
    refetchInterval: 3000,
  })
}
