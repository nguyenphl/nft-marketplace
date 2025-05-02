import { generateNFTImageUrl } from '../../utils/nft'

interface NFTImageProps {
  nftAddress?: string
  tokenId: string
  className?: string
}

export function NFTImage({ nftAddress = '', tokenId, className = '' }: NFTImageProps) {
  const imageUrl = generateNFTImageUrl(nftAddress, tokenId)

  return (
    <div className={`relative aspect-square overflow-hidden ${className}`}>
      <img
        src={imageUrl}
        alt={`NFT #${tokenId}`}
        className="w-full h-full object-cover rounded-lg"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  )
}
