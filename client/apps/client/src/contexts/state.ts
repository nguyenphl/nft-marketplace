import { ethers } from 'ethers';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Network, NETWORKS } from '../constants/networks';
import WalletKit from '@reown/walletkit';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export type TokenBalance = TokenInfo & {
  balance: string;
}

type WalletState = {
  address: string;
  isUnlocked: boolean;
  network: Network;
  importedToken: TokenInfo[];
  provider: ethers.JsonRpcProvider | null;
  signer: ethers.Wallet | null;
  encryptedInfo: string;
  set: (state: Partial<WalletState>) => void;
  get: () => WalletState;
};

export const useWalletState = create<WalletState>()(
  persist(
    (set, get) => ({
      address: '',
      isUnlocked: false,
      network: NETWORKS[11155111],
      importedToken: [],
      provider: null,
      signer: null,
      encryptedInfo: '',
      set,
      get
    }),
    {
      name: 'sample-wallet',
      onRehydrateStorage: (state) => {
        // This runs before state is rehydrated
        console.log('hydration starts');
        // Return handler that runs after state is rehydrated
        return (state, error) => {
          if (error) {
            console.error('an error happened during hydration', error);
          } else {
            console.log('hydration finished');
            state?.set({
              isUnlocked: false
            });
          }
        };
      },
    },
  ),
);

