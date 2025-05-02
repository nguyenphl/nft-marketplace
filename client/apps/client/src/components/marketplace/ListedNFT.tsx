import React, { useState } from "react"
import { ListedNFT as ListedNFTType, useListNFT, useMutateBuyNFT } from "../../hooks/useNFT"
import { NFTCard } from "../ui/NFTCard"
import { ethers } from "ethers"
import { Spinner } from "./spinner"
import { BuyNFTModal } from "../ui/BuyNFTModal"
import { useAccount } from "wagmi"

export const ListedNFT = () => {
  const account = useAccount();
  const { data, isLoading } = useListNFT()
  const [selectedNFT, setSelectedNFT] = useState<ListedNFTType | null>(null)
  const { mutateAsync: buyNFT, } = useMutateBuyNFT(
    selectedNFT?.contractAddress || '',
    selectedNFT?.tokenId || ''
  );

  const handleConfirm = () => {
    if (!selectedNFT) return;

    buyNFT(undefined, {
      onSuccess: () => {
        console.log('NFT purchased successfully');
        setSelectedNFT(null);
      },
      onError: (err) => {
        console.error('Error purchasing NFT:', err);
        setSelectedNFT(null);
      },
    });
  };
  return (
    <>
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Available NFTs {isLoading && <Spinner />}</h2>
      <div className="grid grid-cols-4 gap-6">
        {data?.pages.map((group, i) => (
          <React.Fragment key={i}>
            {group.map((item) => (
              <NFTCard
                key={`${item.id}`}
                tokenId={item.tokenId}
                name={item.name}
                seller={item.seller}
                nftAddress={item.contractAddress}
                actionLabel={account.address == item.seller ? 'Cancel' : `${ethers.formatEther(item.price || '0')} ETH`}
                onAction={() => setSelectedNFT(item)}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </section>
    {selectedNFT && (
        <BuyNFTModal
          isOpen={!!selectedNFT}
          onClose={() => setSelectedNFT(null)}
          onConfirm={handleConfirm}
          nftAddress={selectedNFT.contractAddress}
          tokenId={selectedNFT.tokenId}
          price={BigInt(selectedNFT.price)}
          seller={selectedNFT.seller}
        />
      )}
    </>
  )
}
