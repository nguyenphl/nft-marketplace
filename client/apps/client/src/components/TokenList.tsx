import { useState } from 'react';
import { ImportTokenModal } from './ImportTokenModal';

interface Token {
  address: string;
  symbol: string;
  balance: string;
}

interface TokenListProps {
  tokens: Token[];
}

export function TokenList({ tokens }: TokenListProps) {
  const [showImportTokenModal, setShowImportTokenModal] = useState(false);

  return (
    <div className="space-y-4">
      {tokens.filter(Boolean).map((token) => (
        <div key={token?.address} className="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
            <div>
              <p className="font-medium">{token?.symbol}</p>
              <p className="text-sm text-gray-400">{token?.balance}</p>
            </div>
          </div>
          <p className="font-medium">{token?.balance} {token?.symbol}</p>
        </div>
      ))}

      <button
        onClick={() => setShowImportTokenModal(true)}
        className="w-full mt-4 py-3 text-sm text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-400/10 transition-colors flex items-center justify-center gap-2"
      >
        <span className="material-icons-outlined text-sm">add_circle_outline</span>
        Import Token
      </button>

      <ImportTokenModal
        isOpen={showImportTokenModal}
        onClose={() => setShowImportTokenModal(false)}
      />
    </div>
  );
}
