import { formatEther } from 'viem'
import { useAccount, useBalance, useChainId, useDisconnect } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { useWeb3Modal } from '@web3modal/wagmi/react'

export function WalletConnect() {
  const { address, isConnected,  } = useAccount()
  const { disconnect,  } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const chainId = useChainId()
  const { open } = useWeb3Modal()

  if (isConnected) {
    if (chainId !== sepolia.id) {
      return (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-red-600">
            Please switch to Sepolia network
          </span>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <span className="text-sm font-medium">
          {balance ? formatEther(balance.value) : '0'} ETH
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      Connect Wallet
    </button>
  )
}
