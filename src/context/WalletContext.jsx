import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext(null);

const STORAGE_KEY = 'rentverse-wallet-connected';

/** Chain ids we surface by name; anything else is shown as "Chain <id>". */
const CHAIN_NAMES = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  137: 'Polygon',
  80002: 'Amoy',
  31337: 'Localhost',
};

export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function chainName(chainId) {
  if (!chainId) return '';
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const hasProvider = typeof window !== 'undefined' && Boolean(window.ethereum);

  const readAccountState = useCallback(async (account) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const [network, rawBalance] = await Promise.all([
      provider.getNetwork(),
      provider.getBalance(account),
    ]);

    setAddress(account);
    setChainId(network.chainId);
    setBalance(Number(ethers.utils.formatEther(rawBalance)).toFixed(4));
  }, []);

  const disconnect = useCallback(() => {
    // MetaMask has no programmatic disconnect: we drop our own session state
    // and stop auto-reconnecting on the next page load.
    setAddress(null);
    setChainId(null);
    setBalance(null);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const connect = useCallback(async () => {
    if (!hasProvider) {
      setError('No wallet found. Install MetaMask to continue.');
      window.open('https://metamask.io/download/', '_blank', 'noopener');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) throw new Error('No account returned by the wallet.');

      await readAccountState(accounts[0]);
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (err) {
      // 4001 is the EIP-1193 "user rejected request" code — not worth shouting about.
      setError(err.code === 4001 ? 'Connection request was rejected.' : err.message);
    } finally {
      setIsConnecting(false);
    }
  }, [hasProvider, readAccountState]);

  // Silently restore a previously approved session (no wallet popup).
  useEffect(() => {
    if (!hasProvider || !window.localStorage.getItem(STORAGE_KEY)) return;

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => (accounts.length ? readAccountState(accounts[0]) : disconnect()))
      .catch(() => disconnect());
  }, [hasProvider, readAccountState, disconnect]);

  // Keep the UI in sync when the user switches account or network in the wallet.
  useEffect(() => {
    if (!hasProvider) return undefined;

    const onAccountsChanged = (accounts) => {
      if (!accounts.length) disconnect();
      else readAccountState(accounts[0]).catch(() => disconnect());
    };
    const onChainChanged = () => {
      if (address) readAccountState(address).catch(() => disconnect());
    };

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener('chainChanged', onChainChanged);
    };
  }, [hasProvider, address, readAccountState, disconnect]);

  const value = useMemo(
    () => ({
      address,
      shortAddress: shortenAddress(address),
      chainId,
      network: chainName(chainId),
      balance,
      isConnected: Boolean(address),
      isConnecting,
      hasProvider,
      error,
      connect,
      disconnect,
    }),
    [address, chainId, balance, isConnecting, hasProvider, error, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
