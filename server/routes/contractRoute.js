const express = require('express');
const {
  health,
  getTransaction,
  getCollection,
  getToken,
  getOwnerBalance,
  prepareMint,
  mint,
  getEscrowParties,
  getEscrowState,
  prepareList,
  prepareDeposit,
  prepareApprove,
  prepareInspection,
  prepareFinalize,
  prepareCancel,
} = require('../controllers/contractController');
const { chainRateLimiter } = require('../middlewares/helpers/rateLimiter');

const router = express.Router();

/**
 * Smart contract API.
 *
 * Naming convention: GET reads on-chain state, POST .../prepare returns an
 * unsigned transaction for the user's wallet to sign, and a bare POST means the
 * server broadcasts with its own signer (admin only).
 *
 * Every route is rate limited because each one costs an RPC call to a node we
 * usually pay per request for.
 */
router.use(chainRateLimiter);

// Meta
router.route('/health').get(health);
router.route('/transactions/:hash').get(getTransaction);

// RealEstate (ERC-721)
router.route('/real-estate').get(getCollection);
router.route('/real-estate/tokens/:tokenId').get(getToken);
router.route('/real-estate/owners/:address').get(getOwnerBalance);
router.route('/real-estate/mint/prepare').post(prepareMint);
router.route('/real-estate/mint').post(mint);

// Escrow
router.route('/escrow').get(getEscrowParties);
router.route('/escrow/:nftId').get(getEscrowState);
router.route('/escrow/:nftId/list/prepare').post(prepareList);
router.route('/escrow/:nftId/deposit/prepare').post(prepareDeposit);
router.route('/escrow/:nftId/approve/prepare').post(prepareApprove);
router.route('/escrow/:nftId/inspection/prepare').post(prepareInspection);
router.route('/escrow/:nftId/finalize/prepare').post(prepareFinalize);
router.route('/escrow/:nftId/cancel/prepare').post(prepareCancel);

module.exports = router;
