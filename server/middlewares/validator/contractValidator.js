const { ethers } = require('ethers');
const ErrorHandler = require('../../utils/errorHandler');

/**
 * Input validation for the contract API.
 *
 * Kept deliberately close to the chain's own types: an address must be a real
 * checksummable address, an amount must survive BigNumber parsing. Rejecting
 * here means a bad request costs one 400 instead of a wasted RPC round-trip.
 */
function requireAddress(value, field) {
  if (!value || !ethers.utils.isAddress(value)) {
    throw new ErrorHandler(`"${field}" must be a valid Ethereum address.`, 400);
  }
  return ethers.utils.getAddress(value);
}

function requireTokenId(value, field = 'tokenId') {
  const id = String(value ?? '');
  if (!/^\d+$/.test(id)) {
    throw new ErrorHandler(`"${field}" must be a non-negative integer.`, 400);
  }
  return id;
}

/** Accepts either { wei } or { ether } and always returns wei. */
function requireAmountWei(body, field) {
  const { [field]: amount, [`${field}Ether`]: ether } = body;

  try {
    if (ether !== undefined) return ethers.utils.parseEther(String(ether)).toString();
    if (amount !== undefined) return ethers.BigNumber.from(String(amount)).toString();
  } catch (error) {
    throw new ErrorHandler(`"${field}" is not a valid amount.`, 400);
  }

  throw new ErrorHandler(`"${field}" or "${field}Ether" is required.`, 400);
}

function requireString(value, field, { maxLength = 512 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ErrorHandler(`"${field}" is required.`, 400);
  }
  if (value.length > maxLength) {
    throw new ErrorHandler(`"${field}" must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function requireBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw new ErrorHandler(`"${field}" must be a boolean.`, 400);
  }
  return value;
}

function requireTxHash(value, field = 'hash') {
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(value || ''))) {
    throw new ErrorHandler(`"${field}" must be a 32-byte transaction hash.`, 400);
  }
  return value;
}

module.exports = {
  requireAddress,
  requireTokenId,
  requireAmountWei,
  requireString,
  requireBoolean,
  requireTxHash,
};
