const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, './.config.env') });

/**
 * Single source of truth for every chain-facing setting.
 *
 * Everything is env-driven so the same build can point at a local Hardhat node,
 * a testnet or mainnet without a code change. Contract entries are keyed by a
 * logical name, which is what the rest of the API refers to — services never
 * hardcode an address or an ABI path.
 */
const contracts = {
  realEstate: {
    address: process.env.REAL_ESTATE_ADDRESS || '',
    abi: require('../abis/RealEstate.json'),
  },
  escrow: {
    address: process.env.ESCROW_ADDRESS || '',
    abi: require('../abis/Escrow.json'),
  },
};

const blockchainConfig = {
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  chainId: Number(process.env.CHAIN_ID) || 31337,
  networkName: process.env.CHAIN_NAME || 'localhost',
  blockExplorer: process.env.BLOCK_EXPLORER_URL || '',

  // Optional. Only needed for endpoints that broadcast a transaction from the
  // server itself (admin/relayer operations). User-facing writes are returned
  // as unsigned transactions and signed in the browser wallet instead.
  signerKey: process.env.SERVER_WALLET_PRIVATE_KEY || '',

  // How many confirmations a write endpoint waits for before responding.
  confirmations: Number(process.env.TX_CONFIRMATIONS) || 1,

  contracts,
};

/** Contracts that are usable right now (i.e. have an address configured). */
blockchainConfig.configuredContracts = Object.entries(contracts)
  .filter(([, entry]) => entry.address)
  .map(([name]) => name);

blockchainConfig.hasSigner = Boolean(blockchainConfig.signerKey);

module.exports = blockchainConfig;
