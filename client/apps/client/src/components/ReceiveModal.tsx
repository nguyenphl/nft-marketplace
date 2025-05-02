import QRCode from 'qrcode.react';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export function ReceiveModal({ isOpen, onClose, address }: ReceiveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Receive</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCode value={address} size={200} />
          </div>

          <div className="w-full">
            <p className="text-sm text-gray-400 mb-2">Wallet Address</p>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                readOnly
                value={address}
                className="w-full p-2 bg-gray-700 rounded text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
