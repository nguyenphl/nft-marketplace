import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { useBalances } from '../hooks/useBalance';
import { useTransfer } from '../hooks/useTransfer';
import { useMemo } from 'react';

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendTokenModal({ isOpen, onClose }: SendTokenModalProps) {
  const { data: tokens } = useBalances();
  const {
    watch,
    setValue,
    register,
    handleSubmit,
  } = useForm({
    defaultValues: {
      selectedToken: '',
      recipient: '',
      amount: ''
    }

  });

  const { isPending, data: tx, mutateAsync } = useTransfer();

  const watchToken = watch('selectedToken')
  const selectedToken = useMemo(() => tokens?.find((token) => token.address === watchToken), [tokens, watchToken])

  const onSubmit = async (data: any) => {
    const tx = await mutateAsync({
      token: selectedToken!,
      recipient: data.recipient,
      amount: data.amount
    })
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-800 rounded-lg p-6 w-full max-w-xl">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold text-white">
              Send {selectedToken?.symbol || 'Token'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token
              </label>
              <select
                {...register('selectedToken')}
                className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {(tokens || []).map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol} ({token.balance})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={watch('recipient')}
                onChange={(e) => setValue('recipient', e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={watch('amount')}
                  onChange={(e) => setValue('amount', e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {selectedToken?.symbol}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Balance: {selectedToken?.balance} {selectedToken?.symbol}
              </p>
            </div>

            {isPending && (
              <p className="text-red-500 text-sm">Sending...</p>
            )}

            {tx && (
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-2">Transaction Hash:</p>
                <p className="text-xs text-gray-400 break-all">{tx}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isPending}
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-600/50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
