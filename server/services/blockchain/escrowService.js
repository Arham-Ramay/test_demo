const { ethers } = require('ethers');
const { getContract } = require('./contractRegistry');
const { buildTransaction } = require('./txBuilder');
const { guard } = require('./chainErrors');

const CONTRACT = 'escrow';

/** The four fixed roles the Escrow contract is deployed with. */
async function getParties() {
  const contract = getContract(CONTRACT);

  return guard('Failed to read escrow parties.', async () => {
    const [nftAddress, seller, inspector, lender] = await Promise.all([
      contract.nftAddress(),
      contract.seller(),
      contract.inspector(),
      contract.lender(),
    ]);

    return { address: contract.address, nftAddress, seller, inspector, lender };
  });
}

/**
 * Full on-chain state of one escrow, including who still has to approve.
 * Batched into a single service call so the UI needs one request, not six.
 */
async function getEscrowState(nftId) {
  const contract = getContract(CONTRACT);

  return guard(`Failed to read escrow state for NFT ${nftId}.`, async () => {
    const [isListed, purchasePrice, escrowAmount, buyer, inspectionPassed, seller, lender] =
      await Promise.all([
        contract.isListed(nftId),
        contract.purchasePrice(nftId),
        contract.escrowAmount(nftId),
        contract.buyer(nftId),
        contract.inspectionPassed(nftId),
        contract.seller(),
        contract.lender(),
      ]);

    const [buyerApproved, sellerApproved, lenderApproved, balance] = await Promise.all([
      contract.approval(nftId, buyer),
      contract.approval(nftId, seller),
      contract.approval(nftId, lender),
      contract.getBalance(),
    ]);

    return {
      nftId: String(nftId),
      isListed,
      buyer,
      purchasePrice: {
        wei: purchasePrice.toString(),
        ether: ethers.utils.formatEther(purchasePrice),
      },
      escrowAmount: {
        wei: escrowAmount.toString(),
        ether: ethers.utils.formatEther(escrowAmount),
      },
      contractBalance: {
        wei: balance.toString(),
        ether: ethers.utils.formatEther(balance),
      },
      inspectionPassed,
      approvals: { buyer: buyerApproved, seller: sellerApproved, lender: lenderApproved },
      // Derived once here so every client agrees on what "ready" means.
      readyToFinalize:
        inspectionPassed &&
        buyerApproved &&
        sellerApproved &&
        lenderApproved &&
        balance.gte(purchasePrice),
    };
  });
}

/**
 * Writes are role-gated by the contract (onlyBuyer / onlySeller / onlyInspector),
 * so they are all returned as unsigned transactions: the caller signs with the
 * account that actually holds the role. Gas estimation in buildTransaction
 * rejects a wrong-role call before the user pays for it.
 */
function prepareList({ nftId, buyer, purchasePriceWei, escrowAmountWei, from }) {
  return buildTransaction({
    contract: CONTRACT,
    method: 'list',
    args: [nftId, buyer, purchasePriceWei, escrowAmountWei],
    from,
  });
}

function prepareDepositEarnest({ nftId, from, valueWei }) {
  return buildTransaction({
    contract: CONTRACT,
    method: 'depositEarnest',
    args: [nftId],
    from,
    value: valueWei,
  });
}

function prepareApproveSale({ nftId, from }) {
  return buildTransaction({ contract: CONTRACT, method: 'approveSale', args: [nftId], from });
}

function prepareInspectionStatus({ nftId, passed, from }) {
  return buildTransaction({
    contract: CONTRACT,
    method: 'updateInspectionStatus',
    args: [nftId, passed],
    from,
  });
}

function prepareFinalizeSale({ nftId, from }) {
  return buildTransaction({ contract: CONTRACT, method: 'finalizeSale', args: [nftId], from });
}

function prepareCancelSale({ nftId, from }) {
  return buildTransaction({ contract: CONTRACT, method: 'cancelSale', args: [nftId], from });
}

module.exports = {
  getParties,
  getEscrowState,
  prepareList,
  prepareDepositEarnest,
  prepareApproveSale,
  prepareInspectionStatus,
  prepareFinalizeSale,
  prepareCancelSale,
};
