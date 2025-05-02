import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { useWalletState } from '../contexts/state';
import { getErc20Contract } from '../util/erc20';

interface ImportTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportTokenModal({ isOpen, onClose }: ImportTokenModalProps) {
  const [address, setAddress] = useState('');
  const { importedToken, set, provider } = useWalletState()

  const handleImport = async () => {
    if (!provider) return
    const contract = getErc20Contract(address, provider)
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals()
    ])
    const tokenInfo = {
      address,
      name,
      symbol,
      decimals: Number(decimals)
    }
    set({ importedToken: [...importedToken, tokenInfo] })
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-xl font-bold text-white mb-4">
            Import Token
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Token Contract Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Import
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 text-white p-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
