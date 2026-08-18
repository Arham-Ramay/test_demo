import { useEffect, useState } from 'react';
import { SiEthereum } from 'react-icons/si';
import { FiAlertCircle } from 'react-icons/fi';
import contractApi from '../../services/contractApi';

/**
 * Live view of the tokenised-property contracts, read through the smart
 * contract API rather than from the browser: the server owns the RPC endpoint,
 * the ABIs and the addresses, so the UI stays a thin consumer.
 */
function OnChainSummary({ nftId = 1 }) {
  const [state, setState] = useState({ status: 'loading', collection: null, escrow: null });

  useEffect(() => {
    let cancelled = false;

    Promise.all([contractApi.getCollection(), contractApi.getEscrow(nftId)])
      .then(([collectionRes, escrowRes]) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          collection: collectionRes.collection,
          escrow: escrowRes.escrow,
        });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [nftId]);

  if (state.status === 'loading') {
    return (
      <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 text-center text-secondary-500 dark:text-secondary-400">
        Reading contract state…
      </div>
    );
  }

  // The chain is optional infrastructure for a marketing page: if it is down,
  // the section degrades to a note instead of breaking the home page.
  if (state.status === 'error') {
    return (
      <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 flex items-start gap-3 text-sm text-secondary-500 dark:text-secondary-400">
        <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          On-chain data is unavailable right now.{' '}
          <span className="opacity-70">{state.message}</span>
        </span>
      </div>
    );
  }

  const { collection, escrow } = state;

  const stats = [
    { label: 'Collection', value: `${collection.name} (${collection.symbol})` },
    { label: 'Properties tokenised', value: collection.totalSupply },
    { label: 'Network', value: collection.network },
    { label: `Escrow #${escrow.nftId}`, value: `${escrow.purchasePrice.ether} ETH` },
    { label: 'Earnest required', value: `${escrow.escrowAmount.ether} ETH` },
    { label: 'In escrow', value: `${escrow.contractBalance.ether} ETH` },
  ];

  return (
    <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-6 shadow-md dark:shadow-none">
      <div className="flex items-center gap-2 mb-6">
        <SiEthereum className="text-primary-600 dark:text-primary-400" aria-hidden="true" />
        <h3 className="text-lg font-semibold">Live contract state</h3>
        <span className="ml-auto text-xs font-mono text-secondary-500 dark:text-secondary-400">
          {collection.address.slice(0, 8)}…{collection.address.slice(-6)}
        </span>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">{stat.label}</dt>
            <dd className="text-lg font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <Badge active={escrow.isListed}>Listed</Badge>
        <Badge active={escrow.inspectionPassed}>Inspection passed</Badge>
        <Badge active={escrow.approvals.buyer}>Buyer approved</Badge>
        <Badge active={escrow.approvals.seller}>Seller approved</Badge>
        <Badge active={escrow.approvals.lender}>Lender approved</Badge>
        <Badge active={escrow.readyToFinalize}>Ready to finalize</Badge>
      </div>
    </div>
  );
}

function Badge({ active, children }) {
  const tone = active
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-secondary-100 text-secondary-500 dark:bg-secondary-700 dark:text-secondary-400';

  return <span className={`px-2.5 py-1 rounded-full font-medium ${tone}`}>{children}</span>;
}

export default OnChainSummary;
