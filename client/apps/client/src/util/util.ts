
export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatTransactionHash = (transactionHash: string) => {
  return `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`
}

export const getExplorerUrl = (transactionHash: string) => {
  return `https://sepolia.etherscan.io/tx/${transactionHash}`
}

