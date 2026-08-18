const { ethers } = require('ethers');
const config = require('../../config/blockchain');
const { getContractConfig, getInterface } = require('./contractRegistry');
const { getProvider } = require('./provider');
const { guard } = require('./chainErrors');

/**
 * Builds an *unsigned* transaction for the browser wallet to sign.
 *
 * This is the default path for anything that moves value or changes ownership:
 * the server never holds the user's key, it only does the part it is good at
 * (knowing the address, the ABI, the gas estimate) and hands back a payload
 * that maps 1:1 onto `eth_sendTransaction`.
 */
async function buildTransaction({ contract, method, args = [], from, value }) {
  const { address } = getContractConfig(contract);
  const iface = getInterface(contract);
  const data = iface.encodeFunctionData(method, args);

  const tx = {
    to: address,
    data,
    value: value ? ethers.BigNumber.from(value).toHexString() : '0x0',
    chainId: config.chainId,
  };

  // Estimating from the caller's address surfaces a revert (wrong role, wrong
  // state) as a 400 here rather than as a failed transaction the user paid for.
  if (from) {
    tx.from = from;
    const gasLimit = await guard(`Gas estimation failed for ${contract}.${method}.`, () =>
      getProvider().estimateGas({ ...tx, from })
    );
    tx.gasLimit = gasLimit.toHexString();
  }

  return tx;
}

/** Uniform response body for a broadcast transaction. */
function describeReceipt(receipt) {
  return {
    hash: receipt.transactionHash,
    status: receipt.status === 1 ? 'success' : 'reverted',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    explorerUrl: config.blockExplorer
      ? `${config.blockExplorer.replace(/\/$/, '')}/tx/${receipt.transactionHash}`
      : null,
  };
}

module.exports = { buildTransaction, describeReceipt };
