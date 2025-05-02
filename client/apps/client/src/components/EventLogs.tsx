import { formatEther } from 'viem'
import { useContractEvents } from '../hooks/useContractEvents'
import { formatAddress } from '../util/util'
import { useMutateUnlockTokens } from '../hooks/useLock'
import { useAccount } from 'wagmi'

export function EventLogs() {
  const { events, isLoading, error, refetch } = useContractEvents()
  const { address } = useAccount()

  const { handleUnlock } = useMutateUnlockTokens(
    () => {
      refetch()
    },
  )

  const onUnlock = (id: number) => {
    console.log("🚀 ~ onUnlock ~ id:", id)
    return handleUnlock(id).then((x) => {
      console.log(x)

      return refetch()
    })
  }

  if (isLoading) {
    return <div>Loading events...</div>
  }

  if (error) {
    return <div>Error loading events: {error.message}</div>
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Event Logs</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.blockNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatAddress(event.user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatEther(event.amount)} ETH
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {event.type === 'TokenLocked' && event.unlockTime ? (
                    BigInt(Math.floor(Date.now() / 1000)) >= event.unlockTime ? (
                      <button
                        onClick={() => onUnlock(+event.id - 1)}
                        disabled={!address || address.toLowerCase() !== event.user.toLowerCase()}
                        className="btn-xs p-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        title={!address ? "Connect wallet to unlock" : address.toLowerCase() !== event.user.toLowerCase() ? "Only the token owner can unlock" : "Unlock"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      </button>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Locked
                      </span>
                    )
                  ) : event.type === 'TokenUnlocked' ? (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      Unlocked
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
