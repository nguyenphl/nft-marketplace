import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { http } from 'wagmi'
import { localhost, sepolia } from 'wagmi/chains'
import { RPC_URL } from '../util/rpc'

const projectId = '0078419d9313902a48ac7de6f5c5467e' // Get this from https://cloud.walletconnect.com

const metadata = {
  name: 'Token Lock DApp',
  description: 'Lock your tokens for a specified period of time',
  url: 'https://your-app-url.com',
  icons: ['https://your-app-url.com/icon.png']
}

const chains = [sepolia, localhost] as const
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports: {
    [sepolia.id]: http(RPC_URL),
    [localhost.id]: http('http://localhost:8545'),
  },
})

createWeb3Modal({
  wagmiConfig: config,
  projectId,
})

export { config }
