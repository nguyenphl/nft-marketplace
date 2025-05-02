import { useWriteContract } from "wagmi"
import { LOCK_CONTRACT_ADDRESS } from "../config"

const LOCK_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unlockTime",
        "type": "uint256"
      }
    ],
    "name": "TokenLocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokenUnlocked",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getLockInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "unlockTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "internalType": "struct Lock.LockInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_minutes",
        "type": "uint256"
      }
    ],
    "name": "lockTokens",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "unlock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const useMutateLockTokens = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const { writeContract: lockTokens,  ...rest } = useWriteContract({
    mutation: {
      onSuccess,
      onError
    }
  })
  const handleLock = (minutes: number, amount: number) => {
    lockTokens({
      address: LOCK_CONTRACT_ADDRESS,
      abi: LOCK_ABI,
      functionName: 'lockTokens',
      args: [BigInt(minutes)],
      value: BigInt(Number(amount) * 1e18),
    })
  }

  return {
    handleLock,
    ...rest
  }
}

export const useMutateUnlockTokens = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const { writeContractAsync: unlockTokens, ...rest } = useWriteContract({
    mutation: {
      onSuccess,
      onError
    }
  })

  const handleUnlock = (id: number) => {
    return unlockTokens({
      address: LOCK_CONTRACT_ADDRESS,
      abi: LOCK_ABI,
      functionName: 'unlock',
      args: [BigInt(id)]
    })
  }

  return {
    handleUnlock,
    ...rest
  }
}
