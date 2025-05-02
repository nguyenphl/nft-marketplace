import { formatEther } from 'ethers'
import { NFTImage } from './NFTImage'
import { useAccount } from 'wagmi'
import { useMutateCancelListNFT } from '../../hooks/useNFT'

interface NFTCardProps {
  tokenId: string
  name?: string
  nftAddress?: string
  price?: bigint
  seller?: string
  onAction?: () => void
  actionLabel?: string
}

export function NFTCard({
  tokenId,
  name = `NFT #${tokenId}`,
  nftAddress,
  price,
  seller,
  onAction,
  actionLabel,
}: NFTCardProps) {
  const account = useAccount();
  const { mutateAsync: cancelNFT } = useMutateCancelListNFT(nftAddress!, tokenId)
  const formattedPrice = price ? formatEther(price.toString()) : null

  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-shadow">
      <div className="aspect-square relative overflow-hidden rounded-t-xl">
        <NFTImage
          nftAddress={nftAddress}
          tokenId={tokenId}
          className="w-full h-full"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900">{name}</h3>
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gray-600">Token ID: {tokenId}</p>
          {formattedPrice && (
            <p className="text-lg font-medium text-gray-900">
              {formattedPrice} ETH
            </p>
          )}
          {seller && (
            <p className="text-sm text-gray-500">
              Seller: {seller.slice(0, 6)}...{seller.slice(-4)}
            </p>
          )}
          {onAction && actionLabel && (
            <button
              onClick={
                account.address != seller ? onAction : () => {
                  cancelNFT();
                }
              }
              className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
