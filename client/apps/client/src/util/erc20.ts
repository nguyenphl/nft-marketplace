import { ERC20, ERC20__factory } from "@client/typechain";
import { ethers } from "ethers";


export interface Erc20Activity {
  action: 'received' | 'sent' | 'approved',
  amount: string,
  from: string,
  to: string,
  blockNumber: number,
  timestamp: number,
  txHash: string
}

export const getErc20Contract = (address: string, provider: ethers.Wallet | ethers.Provider) => {
  return ERC20__factory.connect(address, provider as any)
}

export const getErc20Events = async (contract: ERC20, userAddress: string, fromBlock: number, toBlock: number) => {
  console.log("🚀 ~ getErc20Events ~ fromBlock:", fromBlock, toBlock)
  const [
    approvedByUserEvents,
    approvedForUserEvents,
    sentByUserEvents,
    receivedByUserEvents,
  ] = await Promise.all([
    contract.queryFilter(contract.filters.Approval(userAddress), fromBlock, toBlock),
    contract.queryFilter(contract.filters.Approval(undefined, userAddress), fromBlock, toBlock),
    contract.queryFilter(contract.filters.Transfer(userAddress), fromBlock, toBlock),
    contract.queryFilter(contract.filters.Transfer(undefined, userAddress), fromBlock, toBlock),
  ])

  const result = await Promise.all(
    ([] as Promise<Erc20Activity>[]).concat(
      approvedByUserEvents.map(async event => ({
        action: 'approved',
        amount: event.args.value.toString(),
        from: event.args.owner,
        to: event.args.spender,
        blockNumber: event.blockNumber,
        timestamp: (await event.getBlock()).timestamp,
        txHash: event.transactionHash,
      }) as const)
    )
      .concat(
        approvedForUserEvents.map(async event => ({
          action: 'approved',
          amount: event.args.value.toString(),
          from: event.args.spender,
          to: event.args.owner,
          blockNumber: event.blockNumber,
          timestamp: (await event.getBlock()).timestamp,
          txHash: event.transactionHash,
        }) as const)
      )
      .concat(
        sentByUserEvents.map(async event => ({
          action: 'sent',
          amount: event.args.value.toString(),
          from: event.args.from,
          to: event.args.to,
          blockNumber: event.blockNumber,
          timestamp: (await event.getBlock()).timestamp,
          txHash: event.transactionHash,
        }) as const)
      )
      .concat(
        receivedByUserEvents.map(async event => ({
          action: 'received',
          amount: event.args.value.toString(),
          from: event.args.from,
          to: event.args.to,
          blockNumber: event.blockNumber,
          timestamp: (await event.getBlock()).timestamp,
          txHash: event.transactionHash,
        }) as const)
      )
  )

  return result.sort((a, b) => b.blockNumber - a.blockNumber);
}
