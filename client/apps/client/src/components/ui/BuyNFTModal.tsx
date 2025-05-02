import { Dialog, Transition } from '@headlessui/react'
import { formatEther } from 'viem'
import { useMutateBuyNFT } from '../../hooks/useNFT'

interface BuyNFTModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  nftAddress: string,
  tokenId: string
  price: bigint
  seller: string
}

export function BuyNFTModal({
  isOpen,
  onClose,
  onConfirm,
  nftAddress,
  tokenId,
  price,
  seller,
}: BuyNFTModalProps) {
  return (
    <Transition appear show={isOpen} as="div">
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
          <div className="fixed inset-0 bg-black/25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                  Confirm Purchase
                </Dialog.Title>

                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to purchase this NFT?
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-600">Token ID: {tokenId}</p>
                    <p className="text-lg font-medium text-gray-900">
                      Price: {formatEther(price)} ETH
                    </p>
                    <p className="text-sm text-gray-500">
                      Seller: {seller.slice(0, 6)}...{seller.slice(-4)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    onClick={onConfirm}
                  >
                    Confirm Purchase
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
