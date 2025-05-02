import { Lock__factory } from '@client/typechain'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { LOCK_CONTRACT_ADDRESS } from '../config'
import { RPC_URL } from '../util/rpc'

const provider = new ethers.JsonRpcProvider(RPC_URL)
const lockContract = Lock__factory.connect(LOCK_CONTRACT_ADDRESS, provider as any)
const BLOCK_RANGE = 10000

interface EventLog {
  id: string
  type: 'TokenLocked' | 'TokenUnlocked'
  user: string
  amount: bigint
  unlockTime?: bigint
  blockNumber: number
  transactionHash: string
}

interface ChunkCache {
  fromBlock: number
  toBlock: number
  events: EventLog[]
}

const processLogs = async (from: string, to: string): Promise<EventLog[]> => {
  const [locked, unlocked] = await Promise.all([
    lockContract.queryFilter(lockContract.getEvent('TokenLocked'), from, to),
    lockContract.queryFilter(lockContract.getEvent('TokenUnlocked'), from, to)
  ])

  return locked.map<EventLog>(item => {
    return ({
      id: item.args.id.toString(),
      type: 'TokenLocked',
      user: item.args.user,
      amount: item.args.amount,
      unlockTime: item.args.unlockTime,
      blockNumber: item.blockNumber,
      transactionHash: item.transactionHash
    })
  }).concat(
    unlocked.map<EventLog>(item => ({
      id: item.args.id.toString(),
      type: 'TokenUnlocked',
      user: item.args.user,
      amount: item.args.amount,
      blockNumber: item.blockNumber,
      transactionHash: item.transactionHash,
      unlockTime: 0n
    }))
  )
}

const formatEvent = (eventLogs: EventLog[]) => {
  return eventLogs.filter(log => log.type === 'TokenLocked').map(log => {
    const isUnlocked = eventLogs.find(l => l.type === 'TokenUnlocked' && l.id === log.id)
    return {
      id: log.id,
      type: isUnlocked ? 'TokenUnlocked' : 'TokenLocked',
      user: log.user,
      amount: log.amount,
      unlockTime: log.unlockTime,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash
    }
  })
}

const fetchPastEvents = async (queryClient: any) => {
  try {

    const latestBlock = await provider.getBlockNumber()

    const cachedChunks = queryClient.getQueryData(['contractEventChunks']) as ChunkCache[] || []

    const lastCachedBlock = cachedChunks.length > 0
    ? Math.max(...cachedChunks.map(chunk => chunk.toBlock))
    : 8018559

    const ranges = []
    let fromBlock = lastCachedBlock + 1
    while (fromBlock < latestBlock) {
      const toBlock = Math.min(fromBlock + BLOCK_RANGE, latestBlock)
      ranges.push({
        from: '0x' + fromBlock.toString(16),
        to: '0x' + toBlock.toString(16)
      })
      fromBlock = toBlock + 1
    }

    const newEvents: EventLog[] = []

    for (const range of ranges) {
      const rangeEvents = await processLogs(range.from, range.to)

      const fromBlockNum = parseInt(range.from, 16)
      const toBlockNum = parseInt(range.to, 16)
      queryClient.setQueryData(['contractEventChunks'], (old: ChunkCache[] = []) => [
        ...old,
        {
          fromBlock: fromBlockNum,
          toBlock: toBlockNum,
          events: rangeEvents
        }
      ])

      newEvents.push(...rangeEvents)
    }

    return formatEvent([
      ...newEvents,
      ...cachedChunks.flatMap(chunk => chunk.events)
    ]).sort((a, b) => b.blockNumber - a.blockNumber)
  } catch (error) {
    return []
  }
}

export function useContractEvents() {
  const queryClient = useQueryClient()

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['contractEvents', LOCK_CONTRACT_ADDRESS],
    queryFn: () => fetchPastEvents(queryClient),
    staleTime: 30000,
    refetchInterval: 30000,
  })

  return {
    events,
    isLoading,
    error,
    refetch
  }
}
