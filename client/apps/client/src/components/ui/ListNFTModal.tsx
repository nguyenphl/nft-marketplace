import { Dialog, Transition } from '@headlessui/react'
import { useState } from 'react'
import { NFT, useApprove, useIsApproved, useMutateListNFT } from '../../hooks/useNFT'
import { NFTImage } from './NFTImage'
import { Spinner } from '../marketplace/spinner'

interface ListNFTModalProps {
  onClose: () => void
  nft: NFT
}

export function ListNFTModal({
  onClose,
  nft,
}: ListNFTModalProps) {
  const [price, setPrice] = useState('')
  const { data: isApproved, isLoading: isApprovedLoading } = useIsApproved(nft.contractAddress, nft.tokenId)
  const { mutateAsync: listNFT, isPending: isListing } = useMutateListNFT(nft.contractAddress, nft.tokenId)
  const { mutateAsync: approve, isPending: isApproving } = useApprove(nft.contractAddress, nft.tokenId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isApproved) {
      await listNFT(price)
      onClose()
    } else {
      await approve()
    }
  }

  const getButtonText = () => {
    if (isApproving) return 'Approving...'
    if (isListing) return 'Listing...'
    return isApproved ? 'List for Sale' : 'Approve'
  }

  return (
    <Transition appear show={!!nft} as="div">
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-6">
                  List NFT for Sale
                </Dialog.Title>

                <div className="space-y-8">
                  {/* NFT Preview */}
                  <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-xl">
                    <div className="w-32 h-32 flex-shrink-0">
                      <NFTImage
                        nftAddress={nft.contractAddress}
                        tokenId={nft.tokenId}
                        className="rounded-xl shadow-md"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{nft.name}</h4>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Token ID</p>
                        <p className="text-base font-medium text-gray-900">{nft.tokenId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price Input */}
                  <div>
                    <label htmlFor="price" className="block text-lg font-semibold text-gray-900 mb-3">
                      Set Your Price
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="block w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                        required
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-lg font-medium text-gray-500">ETH</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl px-5 py-3 text-base font-semibold text-gray-700 hover:bg-gray-100 border-2 border-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={isListing || isApproving}
                      className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {(isListing || isApproving || isApprovedLoading) && <Spinner />}
                      {getButtonText()}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
