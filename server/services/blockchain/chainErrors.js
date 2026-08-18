const ErrorHandler = require('../../utils/errorHandler');

/**
 * Translates ethers/RPC failures into the ErrorHandler shape the rest of the
 * API already uses, so a controller never has to know what an ethers error
 * looks like and clients get a stable contract instead of raw provider noise.
 */
const CODE_MAP = {
  NETWORK_ERROR: [503, 'Blockchain node is unreachable.'],
  SERVER_ERROR: [503, 'Blockchain node returned an error.'],
  TIMEOUT: [504, 'Blockchain node timed out.'],
  INSUFFICIENT_FUNDS: [402, 'Signer has insufficient funds for this transaction.'],
  NONCE_EXPIRED: [409, 'Transaction nonce already used. Retry the request.'],
  REPLACEMENT_UNDERPRICED: [409, 'A pending transaction is already in flight.'],
  UNPREDICTABLE_GAS_LIMIT: [400, 'Transaction would revert on-chain.'],
  CALL_EXCEPTION: [400, 'Contract call reverted.'],
  INVALID_ARGUMENT: [400, 'Invalid argument for this contract call.'],
};

/**
 * Digs the human-readable require() message out of a revert.
 *
 * ethers nests the node's response several layers deep and the outer message
 * carries the whole RPC envelope, so we walk the chain and pull out the actual
 * reason string. Anything we cannot shorten is dropped rather than echoed —
 * a 2KB provider blob is not an API error message.
 */
const REVERT_PATTERNS = [
  /reverted with reason string ['"]([^'"]+)['"]/,
  /execution reverted:?\s*([^"'\\]{1,160})/,
];

function collectCandidates(error, depth = 0) {
  if (!error || depth > 4) return [];

  return [
    error.data?.message,
    error.error?.data?.message,
    error.reason,
    error.message,
    ...collectCandidates(error.error, depth + 1),
  ].filter((value) => typeof value === 'string' && value);
}

function revertReason(error) {
  const candidates = collectCandidates(error);

  for (const candidate of candidates) {
    for (const pattern of REVERT_PATTERNS) {
      const match = pattern.exec(candidate);
      if (match) return match[1].trim();
    }
  }

  // No revert string: keep a short reason, drop anything provider-sized.
  const short = candidates.find((value) => value.length <= 160);
  return short || null;
}

function toApiError(error, context = 'Blockchain call failed.') {
  if (error instanceof ErrorHandler) return error;

  const [status, message] = CODE_MAP[error?.code] || [502, context];
  const reason = revertReason(error);

  return new ErrorHandler(reason ? `${message} ${reason}` : message, status);
}

/** Wraps a service call so every rejection leaves as an ErrorHandler. */
async function guard(context, fn) {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, context);
  }
}

module.exports = { toApiError, guard };
