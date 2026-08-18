/**
 * Deploys RealEstate + Escrow to the local hardhat node and writes the
 * resulting addresses into server/config/.config.env, so the API picks them up
 * on the next restart.
 *
 * Uses plain ethers v5 against the node's RPC (no hardhat runtime needed), and
 * hardhat's well-known dev accounts — those keys are public by design and must
 * never appear on a real network.
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const ENV_PATH = path.resolve(__dirname, '../server/config/.config.env');

// hardhat node account #0 — publicly documented test key.
const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function artifact(name) {
  return require(path.resolve(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`));
}

/** Updates KEY=value in place, appending the key if it is not there yet. */
function setEnvValue(contents, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(contents) ? contents.replace(pattern, line) : `${contents}\n${line}\n`;
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
  const accounts = await provider.listAccounts();

  const [seller, buyer, inspector, lender] = [accounts[0], accounts[1], accounts[2], accounts[3]];

  const realEstateArtifact = artifact('RealEstate');
  const RealEstate = new ethers.ContractFactory(
    realEstateArtifact.abi,
    realEstateArtifact.bytecode,
    deployer
  );
  const realEstate = await RealEstate.deploy();
  await realEstate.deployed();

  const escrowArtifact = artifact('Escrow');
  const Escrow = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, deployer);
  const escrow = await Escrow.deploy(realEstate.address, seller, inspector, lender);
  await escrow.deployed();

  // Seed one tokenised property so the read endpoints have something to return.
  const mintTx = await realEstate.mint('ipfs://demo-property-1');
  await mintTx.wait();

  const approveTx = await realEstate.approve(escrow.address, 1);
  await approveTx.wait();

  const listTx = await escrow
    .connect(deployer)
    .list(1, buyer, ethers.utils.parseEther('20'), ethers.utils.parseEther('5'));
  await listTx.wait();

  let env = fs.readFileSync(ENV_PATH, 'utf8');
  env = setEnvValue(env, 'REAL_ESTATE_ADDRESS', realEstate.address);
  env = setEnvValue(env, 'ESCROW_ADDRESS', escrow.address);
  env = setEnvValue(env, 'SERVER_WALLET_PRIVATE_KEY', DEPLOYER_KEY);
  fs.writeFileSync(ENV_PATH, env);

  console.log(
    JSON.stringify(
      {
        realEstate: realEstate.address,
        escrow: escrow.address,
        parties: { seller, buyer, inspector, lender },
        seeded: { tokenId: 1, purchasePrice: '20 ETH', escrowAmount: '5 ETH' },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
