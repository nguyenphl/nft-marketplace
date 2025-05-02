import { useActivity, useActivityAchemy } from '../hooks/useActivity';

export function ActivityList() {
  const { data } = useActivityAchemy();
  console.log("🚀 ~ ActivityList ~ data:", data)

  return (
    <div className="overflow-x-auto">
      {data?.events.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-icons-outlined text-4xl text-gray-600 mb-2">receipt_long</span>
          <p className="text-gray-400">No activity yet</p>
        </div>
      ) : (
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">From</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">To</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data?.events.map((activity) => (
              <tr key={activity.txHash} className="hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.action === 'sent' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      <span className="material-icons-outlined text-sm">
                        {activity.action === 'sent' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    </div>
                    <span className="font-medium">{activity.action === 'sent' ? 'Sent' : 'Received'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {activity.from.slice(0, 6)}...{activity.from.slice(-4)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {activity.to.slice(0, 6)}...{activity.to.slice(-4)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{(+activity.amount).toFixed(6)}</span>
                  <span className="ml-1 text-gray-400">{activity.symbol}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(activity.timestamp * 1000).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 inline-flex items-center"
                  >
                    <span className="material-icons-outlined text-sm">open_in_new</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
