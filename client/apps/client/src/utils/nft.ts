/**
 * Generates a deterministic avatar URL based on NFT address and token ID
 * Uses DiceBear's pixel-art avatars for consistent, unique images
 */
export function generateNFTImageUrl(nftAddress: string, tokenId: string): string {
  // Combine address and tokenId to create a unique seed
  const seed = `${nftAddress}-${tokenId}`.toLowerCase()

  // Use DiceBear's pixel-art avatars
  // Options documentation: https://www.dicebear.com/styles/pixel-art
  const options = [
    'backgroundColor=ffffff',
    'scale=90',
  ].join('&')

  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&${options}`
}
