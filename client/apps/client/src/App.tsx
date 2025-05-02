import { QueryClient } from '@tanstack/react-query';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { WalletPage } from './pages/WalletPage';
import { WagmiProvider } from 'wagmi'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { WalletConnectProvider } from './config/walletconnect';
import MarketplacePage from './pages/MarketPlace';
import { config } from './config/wagmi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})


function App() {
  return (
    <WagmiProvider config={config}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <WalletConnectProvider />
        <Router>
          <Routes>
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="*" element={<Navigate to="/marketplace" replace />} />
          </Routes>
        </Router>
      </PersistQueryClientProvider>

    </WagmiProvider>
  );
}

export default App;
