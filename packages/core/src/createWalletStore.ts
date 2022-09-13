import { getAddress } from '@ethersproject/address';
import type { StoreApi } from 'zustand/vanilla';
import create from 'zustand/vanilla';

import { validateChainId } from './utils';

/**
 * The minimal WalletState to keep track with
 */
export interface WalletState {
  isConnecting: boolean;
  chainId?: number;
  accounts?: string[];
}

/**
 * WalletStore is for managing the state of WalletState
 */
export type WalletStore = StoreApi<WalletState>;

/**
 * WalletStoreActions is used to update the WalletStore
 */
export interface WalletStoreActions {
  startConnection: () => () => void;
  update: (stateUpdate: Partial<Omit<WalletState, 'isConnecting'>>) => void;
  resetState: () => void;
}

export const DEFAULT_WALLET_STATE: WalletState = {
  isConnecting: false,
  chainId: undefined,
  accounts: undefined,
};

/**
 * Create a vanilla zustand store and wallet actions for managing the WalletState
 *
 * @returns { store: WalletStore, actions: WalletStoreActions }
 */
export const createWalletStoreAndActions = (): {
  /**
   * {@link WalletStore}
   */
  store: WalletStore;
  /**
   * {@link WalletStoreActions}
   */
  actions: WalletStoreActions;
} => {
  const store = create<WalletState>()(() => DEFAULT_WALLET_STATE);

  // flag for tracking updates so we don't clobber data when cancelling activation
  let nullifier = 0;

  /**
   * Sets isConnecting to true, indicating that an connection is in progress.
   *
   * @returns endConnection - the paired endConnection function
   */
  function startConnection(): () => void {
    const nullifierCached = ++nullifier;

    store.setState({ isConnecting: true });

    const endConnection = () => {
      if (nullifier === nullifierCached)
        store.setState({ isConnecting: false });
    };

    /**
     * No matter the connection succeed or fail, should always finally call startConnection and endConnection in pair.
     */
    return endConnection;
  }

  /**
   * Used to report a `stateUpdate` which is merged with existing state. The first `stateUpdate` that results in chainId
   * and accounts being set will also set isConnecting to false, indicating a successful connection.
   *
   * @param stateUpdate - The state update to report.
   * @returns void
   */
  function update(stateUpdate: Partial<WalletState>): void {
    // validate chainId statically, independent of existing state
    if (stateUpdate.chainId !== undefined) {
      validateChainId(stateUpdate.chainId);
    }

    // validate accounts statically, independent of existing state
    if (stateUpdate.accounts !== undefined) {
      for (let i = 0; i < stateUpdate.accounts.length; i++) {
        // throw is account is not a valid ethereum address
        stateUpdate.accounts[i] = getAddress(stateUpdate.accounts[i]);
      }
    }

    nullifier++;

    store.setState((existingState): WalletState => {
      // determine the next chainId and accounts
      const chainId = stateUpdate.chainId ?? existingState.chainId;
      const accounts = stateUpdate.accounts ?? existingState.accounts;

      // ensure that the isConnecting flag is cleared when appropriate
      let isConnecting = existingState.isConnecting;
      if (isConnecting && chainId && accounts) {
        isConnecting = false;
      }

      return {
        chainId,
        accounts,
        isConnecting,
      };
    });
  }

  const resetState = (): void => {
    store.setState({
      ...DEFAULT_WALLET_STATE,
    });
  };

  return {
    store,
    actions: { startConnection, update, resetState },
  };
};