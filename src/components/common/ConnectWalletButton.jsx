import { FiLogOut } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { useWallet } from '../../context/WalletContext';

/**
 * Single wallet entry point, reused by the navbar and the home hero.
 * `variant` only changes the shell styling, never the behaviour.
 */
function ConnectWalletButton({ variant = 'default', className = '' }) {
  const { isConnected, isConnecting, shortAddress, network, balance, error, connect, disconnect } =
    useWallet();

  const base =
    'inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed';

  const shells = {
    default: 'px-4 py-2 text-white bg-primary-600 hover:bg-primary-700 shadow-sm',
    hero: 'px-6 py-3 text-base text-primary-700 bg-white hover:bg-primary-50 shadow-lg dark:bg-primary-600 dark:text-white dark:hover:bg-primary-500',
    block:
      'w-full justify-center px-3 py-2 text-base text-white bg-primary-600 hover:bg-primary-700',
  };

  if (isConnected) {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary-50 text-primary-700 dark:bg-secondary-700 dark:text-primary-200">
            <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
            {shortAddress}
          </span>
          <button
            type="button"
            onClick={disconnect}
            aria-label="Disconnect wallet"
            title="Disconnect"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md text-secondary-500 hover:text-red-600 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700 transition-colors"
          >
            <FiLogOut size={16} />
          </button>
        </div>
        {(balance || network) && (
          <span className="text-xs text-secondary-500 dark:text-secondary-400">
            {balance ? `${balance} ETH` : ''}
            {balance && network ? ' · ' : ''}
            {network}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={connect}
        disabled={isConnecting}
        className={`${base} ${shells[variant] || shells.default}`}
      >
        <FaWallet aria-hidden="true" />
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-500 max-w-[16rem] text-center">
          {error}
        </span>
      )}
    </div>
  );
}

export default ConnectWalletButton;
