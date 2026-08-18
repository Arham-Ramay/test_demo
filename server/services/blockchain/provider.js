const { ethers } = require('ethers');
const config = require('../../config/blockchain');
const ErrorHandler = require('../../utils/errorHandler');

/**
 * Provider / signer access.
 *
 * Both are lazily created and then cached: an ethers provider keeps its own
 * connection pool and polling state, so building a new one per request would
 * multiply sockets and RPC traffic for no benefit.
 */
let provider;
let signer;

function getProvider() {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
      chainId: config.chainId,
      name: config.networkName,
    });
  }
  return provider;
}

/**
 * Wallet used for server-broadcast (admin) writes. Absent by design in most
 * deployments — see the "prepare unsigned transaction" flow in the services.
 */
function getSigner() {
  if (!config.hasSigner) {
    throw new ErrorHandler(
      'This endpoint requires a server signer. Set SERVER_WALLET_PRIVATE_KEY, or use the /prepare endpoint and sign in the wallet.',
      501
    );
  }
  if (!signer) {
    signer = new ethers.Wallet(config.signerKey, getProvider());
  }
  return signer;
}

/** Cheap connectivity probe used by the health endpoint. */
async function getChainStatus() {
  const network = await getProvider().getNetwork();
  const blockNumber = await getProvider().getBlockNumber();

  return {
    rpcUrl: config.rpcUrl.replace(/\/[a-zA-Z0-9_-]{16,}$/, '/***'), // never leak the API key in a response
    chainId: network.chainId,
    network: network.name,
    blockNumber,
    hasSigner: config.hasSigner,
    signerAddress: config.hasSigner ? getSigner().address : null,
  };
}

module.exports = { getProvider, getSigner, getChainStatus };
