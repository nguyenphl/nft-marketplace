import { QueryClient, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { TokenInfo, useWalletState } from "../contexts/state";
import { Erc20Activity, getErc20Contract, getErc20Events } from "../util/erc20";
import { Alchemy, AssetTransfersCategory, Network } from "alchemy-sdk";

const BLOCK_INITIAL = 8136863;

export const useLatestBlock = () => {
  const { provider } = useWalletState();

  const { data } = useQuery({
    queryKey: ['latest-block', provider?._network.chainId.toString()],
    queryFn: async () => {
      const result = await provider?.getBlockNumber();

      return +(result?.toString() ?? 0);
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  })

  return data;
}

const getErc20WithCache = async (queryClient: QueryClient, provider: ethers.Provider, address: string, token: TokenInfo) => {
  if (!provider) throw new Error("Provider not available");

  const cached = queryClient.getQueryData<{
    events: Erc20Activity[],
    lastBlock: number
  }>(['erc20-activity', address, token.address]);

  console.log("🚀 ~ getErc20WithCache ~ cached:", cached)
  const fromBlock = cached?.lastBlock ?? BLOCK_INITIAL;
  const latestBlock = await provider.getBlockNumber();
  const toBLock = Math.min(fromBlock + 1000, latestBlock || (fromBlock + 1000))

  const result = await getErc20Events(getErc20Contract(token.address, provider), address, fromBlock, toBLock);

  queryClient.setQueryData<{
    events: Erc20Activity[],
    lastBlock: number
  }>(['erc20-activity', address, token.address], {
    events: [...(cached?.events || []), ...result],
    lastBlock: toBLock
  })

  return {
    events: [...(cached?.events || []), ...result],
    lastBlock: toBLock,
    isFinished: toBLock >= latestBlock
  };
}


const getNativeWithCache = async (queryClient: QueryClient, provider: ethers.Provider, address: string) => {
  const config = {
    apiKey: "demo",
    network: Network.ETH_MAINNET,
  };
  const alchemy = new Alchemy(config);

  // Address we want get NFT mints from
  const toAddress = "0x43780f67BaCC76069Edd6f5EAC1Ed3173876cC6b";

  const res = await alchemy.core.getAssetTransfers({
    fromBlock: "0x0",
    fromAddress: toAddress,
    excludeZeroValue: false,
    category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.INTERNAL],
  });

  console.log(res);

}

const config = {
  apiKey: "_-VcNe2dRm0qKFf5Pi5TUOc8ywLjmpd5",
  network: Network.ETH_SEPOLIA,
};

const alchemy = new Alchemy(config);

export const useActivityAchemy = () => {
  const { address } = useWalletState();
  const { provider } = useWalletState();

  return useQuery({
    queryKey: ['activity-alchemy', address],
    queryFn: async () => {
      const [outgoing, incoming] = await Promise.all([
        alchemy.core.getAssetTransfers({
          fromAddress: address,
          category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.INTERNAL],
          maxCount: 1000,
          excludeZeroValue: false,
        }),
        alchemy.core.getAssetTransfers({
          toAddress: address,
          category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.INTERNAL],
          maxCount: 1000,
          excludeZeroValue: true,
        })
      ])

      const events: (Erc20Activity & { symbol: string, decimals: number })[] = await Promise.all(
        [
          ...outgoing.transfers.map(async item => ({
            action: 'sent',
            amount: item.value?.toString() ?? '0',
            from: item.from,
            to: item.to ?? '',
            blockNumber: parseInt(item.blockNum, 16),
            timestamp: (await provider?.getBlock(parseInt(item.blockNum, 16)))?.timestamp ?? 0,
            txHash: item.hash,
            symbol: item.asset ?? '',
            decimals: parseInt(item.rawContract?.decimal ?? '0', 16),
          }) as const),
          ...incoming.transfers.map(async item => ({
            action: 'received',
            amount: item.value?.toString() ?? '0',
            from: item.from,
            to: item.to ?? '',
            blockNumber: parseInt(item.blockNum, 16),
            timestamp: (await provider?.getBlock(parseInt(item.blockNum, 16)))?.timestamp ?? 0,
            txHash: item.hash,
            symbol: item.asset ?? '',
            decimals: parseInt(item.rawContract?.decimal ?? '0', 16),
          }) as const),
        ]
      )
      return {
        events: events.sort((a, b) => b.timestamp - a.timestamp)
      }
    }
  })
}

export const useActivity = () => {
  const { address, importedToken } = useWalletState();
  const queryClient = useQueryClient();
  const { provider } = useWalletState();

  const combinedQueries = useQueries({
    queries: importedToken.map((token) => ({
      queryKey: ['erc20-activity', address, token.address],
      queryFn: async () => {
        const result = await getErc20WithCache(queryClient, provider!, address, token);
        getNativeWithCache(queryClient, provider!, address);
        return {
          ...result,
          events: result.events.map(item => ({
            ...item,
            symbol: token.symbol ?? '',
            decimals: token.decimals ?? 0,
          }))
        }
      },
      gcTime: Infinity,
      refetchInterval: (query: any) => {
        if (query.state.data?.isFinished) {
          return false;
        }

        return 1000;
      }
    })),
    combine: (results) => {
      return {
        data: {
          events: results.map((result) => result.data?.events).flat().filter(Boolean) as (Erc20Activity & { symbol: string, decimals: number })[],
        },
        pending: results.some((result) => result.isPending),
      }
    },
  })
  return combinedQueries;
}
