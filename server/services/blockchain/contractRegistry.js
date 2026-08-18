const { ethers } = require('ethers');
const config = require('../../config/blockchain');
const ErrorHandler = require('../../utils/errorHandler');
const { getProvider, getSigner } = require('./provider');

/**
 * Resolves a logical contract name to an ethers Contract instance.
 *
 * Instances are cached per (name, mode) because building one parses the whole
 * ABI. Adding a contract to the platform is a config + ABI change only; no
 * service, controller or route needs to know it exists.
 */
const cache = new Map();

function getContractConfig(name) {
  const entry = config.contracts[name];

  if (!entry) {
    throw new ErrorHandler(`Unknown contract "${name}".`, 400);
  }
  if (!entry.address) {
    throw new ErrorHandler(
      `Contract "${name}" has no address configured for network ${config.networkName}.`,
      503
    );
  }
  return entry;
}

/**
 * @param {string} name       logical contract name (see config/blockchain.js)
 * @param {'read'|'write'} mode  'write' attaches the server signer
 */
function getContract(name, mode = 'read') {
  const key = `${name}:${mode}`;
  if (cache.has(key)) return cache.get(key);

  const { address, abi } = getContractConfig(name);
  const runner = mode === 'write' ? getSigner() : getProvider();
  const contract = new ethers.Contract(address, abi, runner);

  cache.set(key, contract);
  return contract;
}

/**
 * Interface-only instance, used to ABI-encode calldata for transactions the
 * *user* will sign in their own wallet. Needs no address and no signer.
 */
function getInterface(name) {
  const { abi } = getContractConfig(name);
  return new ethers.utils.Interface(abi);
}

module.exports = { getContract, getContractConfig, getInterface };
