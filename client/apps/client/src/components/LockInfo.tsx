import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useMutateLockTokens } from '../hooks/useLock'

export function LockInfo() {
  const { address, isConnected } = useAccount()
  const [lockMinutes, setLockMinutes] = useState('')
  const [lockAmount, setLockAmount] = useState('')
  const [error, setError] = useState('')

  const { handleLock, isPending: isLocking } = useMutateLockTokens(
    () => {
      setLockMinutes('')
      setLockAmount('')
    },
    (error: any) => {
      setError(error.message)
    }
  )

  const onLockToken = () => {
    if (!lockMinutes || !lockAmount) {
      setError('Please enter both minutes and amount')
      return
    }
    setError('')
    handleLock(Number(lockMinutes), Number(lockAmount))
  }


  const formatTimeLeft = (unlockTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (now >= unlockTime) return 'Ready to unlock'
    const diff = unlockTime - now
    const hours = diff / BigInt(3600)
    const minutes = (diff % BigInt(3600)) / BigInt(60)
    const seconds = diff % BigInt(60)
    return `${hours}h ${minutes}m ${seconds}s left`
  }

  if (!isConnected) return <div>Please connect your wallet</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      <div className="p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-medium">Your Lock Info</h3>
        <div className="mt-2 space-y-2">
          <input
            type="number"
            placeholder="Lock minutes"
            value={lockMinutes}
            onChange={(e) => setLockMinutes(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
          <input
            type="number"
            placeholder="Amount (ETH)"
            value={lockAmount}
            onChange={(e) => setLockAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
          <button
            onClick={onLockToken}
            disabled={isLocking || !lockMinutes || !lockAmount}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLocking ? 'Locking...' : 'Lock Tokens'}
          </button>
        </div>
      </div>
    </div>
  )
}
