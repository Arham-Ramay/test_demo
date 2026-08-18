const { ethers } = require('ethers');
const config = require('../../config/blockchain');
const { getContract } = require('./contractRegistry');
const { buildTransaction, describeReceipt } = require('./txBuilder');
const { guard } = require('./chainErrors');

const CONTRACT = 'realEstate';

/** Collection-level metadata + supply. */
async function getCollection() {
  const contract = getContract(CONTRACT);

  return guard('Failed to read the RealEstate collection.', async () => {
    const [name, symbol, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
    ]);

    return {
      address: contract.address,
      name,
      symbol,
      totalSupply: totalSupply.toString(),
      network: config.networkName,
    };
  });
}

/** Everything the property page needs for one tokenised property. */
async function getToken(tokenId) {
  const contract = getContract(CONTRACT);

  return guard(`Failed to read token ${tokenId}.`, async () => {
    const [owner, tokenURI] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
    ]);

    return { tokenId: String(tokenId), owner, tokenURI };
  });
}

async function getBalanceOf(owner) {
  const contract = getContract(CONTRACT);

  return guard(`Failed to read balance of ${owner}.`, async () => {
    const balance = await contract.balanceOf(owner);
    return { owner, balance: balance.toString() };
  });
}

/**
 * Mint as the *user*: returns an unsigned transaction to sign in the wallet,
 * so the minted NFT belongs to the connected account and no key leaves it.
 */
function prepareMint({ tokenURI, from }) {
  return buildTransaction({ contract: CONTRACT, method: 'mint', args: [tokenURI], from });
}

/**
 * Mint as the *platform* (admin/relayer). Only available when a server signer
 * is configured; used for listings the platform itself tokenises.
 */
async function mintAsPlatform({ tokenURI }) {
  const contract = getContract(CONTRACT, 'write');

  return guard('Mint transaction failed.', async () => {
    const tx = await contract.mint(tokenURI);
    const receipt = await tx.wait(config.confirmations);

    // The mint id comes back through the ERC-721 Transfer event, not the
    // return value — a contract's return value is not visible to a receipt.
    const transfer = receipt.events?.find((event) => event.event === 'Transfer');
    const tokenId = transfer?.args?.tokenId ?? transfer?.args?.[2];

    return {
      ...describeReceipt(receipt),
      tokenId: tokenId ? ethers.BigNumber.from(tokenId).toString() : null,
      tokenURI,
    };
  });
}

module.exports = { getCollection, getToken, getBalanceOf, prepareMint, mintAsPlatform };
