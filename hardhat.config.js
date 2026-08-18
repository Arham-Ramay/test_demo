/**
 * Local-chain toolchain for the smart contract API.
 *
 * Kept intentionally minimal: hardhat compiles the contracts in ./contracts and
 * runs a dev node. Deployment uses plain ethers v5 (already a project
 * dependency) instead of the full hardhat-toolbox, so the extra footprint on
 * the app is two dev dependencies.
 */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache',
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
  },
};
