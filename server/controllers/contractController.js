const asyncErrorHandler = require('../middlewares/helpers/asyncErrorHandler');
const {
  requireAddress,
  requireTokenId,
  requireAmountWei,
  requireString,
  requireBoolean,
  requireTxHash,
} = require('../middlewares/validator/contractValidator');
const config = require('../config/blockchain');
const { getChainStatus, getProvider } = require('../services/blockchain/provider');
const { describeReceipt } = require('../services/blockchain/txBuilder');
const { guard } = require('../services/blockchain/chainErrors');
const realEstate = require('../services/blockchain/realEstateService');
const escrow = require('../services/blockchain/escrowService');

/**
 * Controllers stay thin on purpose: validate input, call one service, shape the
 * response. No ethers types and no chain logic leak into this layer, which is
 * what makes the services reusable from a worker, a cron job or a test.
 */

// --- meta -------------------------------------------------------------------

// GET /api/contract/health
exports.health = asyncErrorHandler(async (req, res) => {
  const status = await guard('Unable to reach the blockchain node.', getChainStatus);

  res.status(200).json({
    success: true,
    chain: status,
    contracts: config.configuredContracts,
  });
});

// GET /api/contract/transactions/:hash
exports.getTransaction = asyncErrorHandler(async (req, res) => {
  const hash = requireTxHash(req.params.hash);

  const receipt = await guard('Failed to read the transaction.', () =>
    getProvider().getTransactionReceipt(hash)
  );

  // No receipt yet simply means the transaction is still in the mempool.
  res.status(200).json({
    success: true,
    transaction: receipt ? describeReceipt(receipt) : { hash, status: 'pending' },
  });
});

// --- RealEstate (ERC-721) ---------------------------------------------------

// GET /api/contract/real-estate
exports.getCollection = asyncErrorHandler(async (req, res) => {
  res.status(200).json({ success: true, collection: await realEstate.getCollection() });
});

// GET /api/contract/real-estate/tokens/:tokenId
exports.getToken = asyncErrorHandler(async (req, res) => {
  const tokenId = requireTokenId(req.params.tokenId);
  res.status(200).json({ success: true, token: await realEstate.getToken(tokenId) });
});

// GET /api/contract/real-estate/owners/:address
exports.getOwnerBalance = asyncErrorHandler(async (req, res) => {
  const owner = requireAddress(req.params.address, 'address');
  res.status(200).json({ success: true, ...(await realEstate.getBalanceOf(owner)) });
});

// POST /api/contract/real-estate/mint/prepare
exports.prepareMint = asyncErrorHandler(async (req, res) => {
  const tokenURI = requireString(req.body.tokenURI, 'tokenURI', { maxLength: 2048 });
  const from = requireAddress(req.body.from, 'from');

  res.status(200).json({
    success: true,
    transaction: await realEstate.prepareMint({ tokenURI, from }),
    signWith: 'wallet',
  });
});

// POST /api/contract/real-estate/mint  (platform signer)
exports.mint = asyncErrorHandler(async (req, res) => {
  const tokenURI = requireString(req.body.tokenURI, 'tokenURI', { maxLength: 2048 });

  res.status(201).json({
    success: true,
    result: await realEstate.mintAsPlatform({ tokenURI }),
  });
});

// --- Escrow -----------------------------------------------------------------

// GET /api/contract/escrow
exports.getEscrowParties = asyncErrorHandler(async (req, res) => {
  res.status(200).json({ success: true, escrow: await escrow.getParties() });
});

// GET /api/contract/escrow/:nftId
exports.getEscrowState = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  res.status(200).json({ success: true, escrow: await escrow.getEscrowState(nftId) });
});

// POST /api/contract/escrow/:nftId/list/prepare
exports.prepareList = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  const from = requireAddress(req.body.from, 'from');
  const buyer = requireAddress(req.body.buyer, 'buyer');
  const purchasePriceWei = requireAmountWei(req.body, 'purchasePrice');
  const escrowAmountWei = requireAmountWei(req.body, 'escrowAmount');

  res.status(200).json({
    success: true,
    transaction: await escrow.prepareList({
      nftId,
      buyer,
      purchasePriceWei,
      escrowAmountWei,
      from,
    }),
    signWith: 'seller',
  });
});

// POST /api/contract/escrow/:nftId/deposit/prepare
exports.prepareDeposit = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  const from = requireAddress(req.body.from, 'from');
  const valueWei = requireAmountWei(req.body, 'amount');

  res.status(200).json({
    success: true,
    transaction: await escrow.prepareDepositEarnest({ nftId, from, valueWei }),
    signWith: 'buyer',
  });
});

// POST /api/contract/escrow/:nftId/approve/prepare
exports.prepareApprove = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  const from = requireAddress(req.body.from, 'from');

  res.status(200).json({
    success: true,
    transaction: await escrow.prepareApproveSale({ nftId, from }),
    signWith: 'buyer | seller | lender',
  });
});

// POST /api/contract/escrow/:nftId/inspection/prepare
exports.prepareInspection = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  const from = requireAddress(req.body.from, 'from');
  const passed = requireBoolean(req.body.passed, 'passed');

  res.status(200).json({
    success: true,
    transaction: await escrow.prepareInspectionStatus({ nftId, passed, from }),
    signWith: 'inspector',
  });
});

// POST /api/contract/escrow/:nftId/finalize/prepare
exports.prepareFinalize = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  const from = requireAddress(req.body.from, 'from');

  res.status(200).json({
    success: true,
    transaction: await escrow.prepareFinalizeSale({ nftId, from }),
    signWith: 'any party',
  });
});

// POST /api/contract/escrow/:nftId/cancel/prepare
exports.prepareCancel = asyncErrorHandler(async (req, res) => {
  const nftId = requireTokenId(req.params.nftId, 'nftId');
  const from = requireAddress(req.body.from, 'from');

  res.status(200).json({
    success: true,
    transaction: await escrow.prepareCancelSale({ nftId, from }),
    signWith: 'any party',
  });
});
