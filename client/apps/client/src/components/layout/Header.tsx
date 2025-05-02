import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'ethers'
import { useWeb3Modal } from '@web3modal/wagmi/react'

export function Header() {
  const { address, chain } = useAccount()
  const { open } = useWeb3Modal()
  const { data: balance } = useBalance({
    address,
  })

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">NFT Marketplace</h1>
          {address ? (
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-600">
                <p>Network: <span className="font-medium">{chain?.name || 'Not Connected'}</span></p>
                <p>Balance: <span className="font-medium">{balance ? `${formatEther(balance.value)} ${balance.symbol}` : '0'}</span></p>
              </div>
              <div onClick={() => open()} className="bg-gray-100 rounded-lg px-4 py-2 cursor-pointer">
                <p className="text-sm font-medium text-gray-900">
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </p>
              </div>
            </div>
          ) : (
            <div onClick={() => open()} className="bg-gray-100 rounded-lg px-4 py-2 cursor-pointer">
              <p className="text-sm font-medium text-gray-900">
                Connect Wallet
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
