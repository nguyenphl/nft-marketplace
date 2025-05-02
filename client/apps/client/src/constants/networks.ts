export interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  blockExplorer: string;
}

export const NETWORKS: { [key: number]: Network } = {
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://base-sepolia.drpc.org',
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.basescan.org'
  }
};
