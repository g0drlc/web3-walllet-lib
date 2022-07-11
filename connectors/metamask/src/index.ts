import type detectEthereumProvider from '@metamask/detect-provider';
import {
  Actions,
  AddEthereumChainParameter,
  Connector,
  Provider,
  ProviderConnectInfo,
  ProviderNoFoundError,
  ProviderRpcError,
  WatchAssetParameters,
} from '@web3-wallet/types';

type MetaMaskProvider = Provider & {
  isMetaMask?: boolean;
  isConnected?: () => boolean;
  providers?: MetaMaskProvider[];
};

function parseChainId(chainId: string) {
  return Number.parseInt(chainId, 16);
}

/**
 * @param options - Options to pass to `@metamask/detect-provider`
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface MetaMaskConstructorArgs {
  actions: Actions;
  options?: Parameters<typeof detectEthereumProvider>[0];
  onError?: (error: Error) => void;
}

const providerNotFoundError = new ProviderNoFoundError('MetaMask Not Found');

export class MetaMask extends Connector {
  /** {@inheritdoc Connector.provider} */
  public provider?: MetaMaskProvider;

  private readonly options?: Parameters<typeof detectEthereumProvider>[0];
  private lazyInitialized = false;

  constructor({ actions, options, onError }: MetaMaskConstructorArgs) {
    super(actions, onError);
    this.options = options;
  }

  public detectProvider = async () => {
    if (this.provider) this.provider;

    const m = await import('@metamask/detect-provider');

    const provider = await m.default(this.options);

    if (!provider) throw providerNotFoundError;

    this.provider = provider as MetaMaskProvider;

    // handle the case when e.g. metamask and coinbase wallet are both installed
    if (this.provider.providers?.length) {
      this.provider =
        this.provider.providers.find((p) => p.isMetaMask) ??
        this.provider.providers[0];
    }

    return this.provider;
  };

  private async lazyInitialize(): Promise<void> {
    if (this.lazyInitialized) return;

    try {
      const provider = await this.detectProvider();

      provider.on('connect', ({ chainId }: ProviderConnectInfo): void => {
        this.actions.update({ chainId: parseChainId(chainId) });
      });

      provider.on('disconnect', (error: ProviderRpcError): void => {
        this.actions.resetState();
        this.onError?.(error);
      });

      provider.on('chainChanged', (chainId: string): void => {
        this.actions.update({ chainId: parseChainId(chainId) });
      });

      provider.on('accountsChanged', (accounts: string[]): void => {
        if (accounts.length === 0) {
          // handle this edge case by disconnecting
          this.actions.resetState();
        } else {
          this.actions.update({ accounts });
        }
      });
    } finally {
      this.lazyInitialized = true;
    }
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    const cancelActivation = this.actions.startActivation();

    await this.lazyInitialize();
    if (!this.provider) return cancelActivation();

    try {
      const [chainId, accounts] = await Promise.all([
        this.provider.request({ method: 'eth_chainId' }) as Promise<string>,
        this.provider.request({ method: 'eth_accounts' }) as Promise<string[]>,
      ]);

      if (accounts.length) {
        this.actions.update({ chainId: parseChainId(chainId), accounts });
      } else {
        throw new Error('No accounts returned');
      }
    } catch (error) {
      console.debug('Could not connect eagerly', error);
      cancelActivation();
    }
  }

  private switchChain = async (
    desiredChainIdOrChainParameters: number | AddEthereumChainParameter,
  ): Promise<void> => {
    try {
      await this.lazyInitialize();
    } catch (_) {
      throw providerNotFoundError;
    }

    const desiredChainId =
      typeof desiredChainIdOrChainParameters === 'number'
        ? desiredChainIdOrChainParameters
        : desiredChainIdOrChainParameters.chainId;

    const desiredChainIdHex = `0x${desiredChainId.toString(16)}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await this.provider!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: desiredChainIdHex }],
      });
    } catch (err: unknown) {
      const error = err as ProviderRpcError;
      const shouldTryToAddChain =
        desiredChainIdOrChainParameters &&
        typeof desiredChainIdOrChainParameters !== 'number' &&
        (error.code === 4902 || error.code === -32603);

      if (!shouldTryToAddChain) throw error;
      // if we're here, we can try to add a new network
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await this.provider!.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            ...desiredChainIdOrChainParameters,
            chainId: desiredChainIdHex,
          },
        ],
      });

      /**
       * chain added successfully, try activate again with the added chain
       */
      this.activate(desiredChainId);
    }
  };

  /**
   * Initiates a connection.
   *
   * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
   * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
   * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
   * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
   * specified parameters first, before being prompted to switch.
   */
  public async activate(
    desiredChainIdOrChainParameters?: number | AddEthereumChainParameter,
  ): Promise<void> {
    let cancelActivation: () => void = () => {};

    if (!this.provider?.isConnected?.()) {
      cancelActivation = this.actions.startActivation();
    }

    try {
      await this.lazyInitialize();
    } catch (_) {
      throw providerNotFoundError;
    }

    try {
      const [chainId, accounts] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.provider!.request({ method: 'eth_chainId' }) as Promise<string>,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.provider!.request({ method: 'eth_requestAccounts' }) as Promise<
          string[]
        >,
      ]);

      const receivedChainId = parseChainId(chainId);
      const desiredChainId =
        typeof desiredChainIdOrChainParameters === 'number'
          ? desiredChainIdOrChainParameters
          : desiredChainIdOrChainParameters?.chainId;

      // if there's no desired chain, or it's equal to the received, update
      if (!desiredChainId || receivedChainId === desiredChainId) {
        return this.actions.update({ chainId: receivedChainId, accounts });
      }

      // if we're here, we can try to switch networks
      await this.switchChain(
        desiredChainIdOrChainParameters as number | AddEthereumChainParameter,
      );
    } catch (error) {
      cancelActivation?.();
      throw error;
    }
  }

  public async watchAsset({
    address,
    symbol,
    decimals,
    image,
  }: WatchAssetParameters): Promise<true> {
    if (!this.provider) throw new Error('No provider');

    return this.provider
      .request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Initially only supports ERC20, but eventually more!
          options: {
            address, // The address that the token is at.
            symbol, // A ticker symbol or shorthand, up to 5 chars.
            decimals, // The number of decimals in the token
            image, // A string url of the token logo
          },
        },
      })
      .then((success) => {
        if (!success) throw new Error('Rejected');
        return true;
      });
  }
}
