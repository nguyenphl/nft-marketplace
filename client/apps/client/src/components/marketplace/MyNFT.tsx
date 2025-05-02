import { useState } from "react"
import { NFT, useUserNFTs } from "../../hooks/useNFT"
import { NFTCard } from "../ui/NFTCard"
import { ListNFTModal } from "../ui/ListNFTModal"

export const MyNFT = () => {
  const { data } = useUserNFTs()
  const [listingNFT, setListingNFT] = useState<NFT | null>(null)

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My NFTs</h2>
      <div className="grid grid-cols-4 gap-6">
        {data?.map((nft) => (
          <NFTCard
            key={nft.tokenId}
            {...nft}
            actionLabel="List for Sale"
            onAction={() => setListingNFT(nft)}
          />
        ))}
      </div>

      {/* List NFT Modal */}
      {listingNFT && (
        <ListNFTModal
          nft={listingNFT}
          onClose={() => setListingNFT(null)}
        />
      )}
    </section>
  )
}
