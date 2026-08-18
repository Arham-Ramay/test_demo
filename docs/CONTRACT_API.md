# Smart Contract API

Backend layer that lets the RentVerse frontend (or any other client) interact
with the `RealEstate` (ERC-721) and `Escrow` contracts in `/contracts`.

Base path: `/api/contract`

---

## Design

### 1. Reads go through the server, writes are signed by the user

The one decision that shapes everything else: **the server never holds a user's
private key**.

| Operation | Path | Who signs |
|---|---|---|
| Read on-chain state | `GET …` | nobody — server RPC call |
| User-facing write | `POST …/prepare` | the user's wallet, in the browser |
| Platform/admin write | `POST …` (no `/prepare`) | server signer, if configured |

A `/prepare` endpoint returns a ready-to-sign transaction object
(`to`, `data`, `value`, `chainId`, `gasLimit`) that maps 1:1 onto
`eth_sendTransaction`. The server contributes what it is authoritative about —
contract address, ABI encoding, gas estimate — and nothing else.

Because gas is estimated **from the caller's address**, a caller without the
required role (`onlyBuyer`, `onlySeller`, `onlyInspector`) gets a `400` with the
contract's own revert string *before* paying for a failing transaction:

```json
{ "success": false, "message": "Transaction would revert on-chain. Only buyer can call this method" }
```

The server-signed path exists only for operations the platform genuinely owns
(e.g. tokenising its own listing) and returns `501` when no key is configured.

### 2. Layering

```
routes/contractRoute.js          HTTP surface + rate limiting
controllers/contractController.js validate input → call one service → shape response
services/blockchain/
  provider.js                    cached provider / signer
  contractRegistry.js            logical name → cached ethers.Contract
  txBuilder.js                   unsigned tx construction + gas estimation
  realEstateService.js           ERC-721 domain operations
  escrowService.js               escrow domain operations
  chainErrors.js                 ethers error → HTTP error
config/blockchain.js             all chain settings, env-driven
abis/*.json                      human-readable ABI fragments
```

Controllers contain no ethers types, so the services are equally callable from a
worker, a cron job or a test. Adding a contract is a config + ABI change; no
route, controller or service needs to know it exists.

### 3. Scalability / maintainability notes

- **Config-driven network.** `RPC_URL`, `CHAIN_ID` and the contract addresses
  come from env, so the same build runs against a local Hardhat node, a testnet
  or mainnet. `configuredContracts` reports what is actually usable.
- **Cached provider and contract instances.** Building a provider per request
  multiplies sockets and RPC traffic; instances are memoised per
  `(contract, mode)`.
- **Uniform errors.** `chainErrors.js` maps ethers codes to HTTP status codes
  (`NETWORK_ERROR → 503`, `INSUFFICIENT_FUNDS → 402`, `CALL_EXCEPTION → 400`, …)
  and digs the human revert reason out of the nested RPC envelope, so clients
  get a stable contract instead of provider noise.
- **Rate limiting.** Every route costs a metered RPC call, so all of them sit
  behind a limiter. The in-memory implementation is per-process on purpose — in
  a multi-instance deployment the same interface is backed by Redis or the API
  gateway.
- **Validation at the edge.** Addresses, token ids, amounts and tx hashes are
  validated before any RPC round-trip.
- **Amounts.** Every value is accepted as either `…` (wei) or `…Ether`, and
  returned as both, so the client never has to guess units.

### What is deliberately not built

Auth/roles on admin endpoints (the project already has `isAuthenticatedUser` /
`authorizeRoles` to reuse), event indexing into MongoDB for history, webhook
callbacks on confirmation, and idempotency keys for broadcast writes. These are
noted rather than implemented because the goal here is the structure.

---

## Endpoints

### Meta

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Node connectivity, chain id, block number, configured contracts |
| GET | `/transactions/:hash` | Receipt status of a broadcast transaction (`pending` if not mined) |

### RealEstate (ERC-721)

| Method | Path | Description |
|---|---|---|
| GET | `/real-estate` | Collection name, symbol, total supply, address |
| GET | `/real-estate/tokens/:tokenId` | Owner + tokenURI |
| GET | `/real-estate/owners/:address` | Number of property NFTs held |
| POST | `/real-estate/mint/prepare` | Unsigned mint tx — `{ tokenURI, from }` |
| POST | `/real-estate/mint` | Platform-signed mint — `{ tokenURI }` |

### Escrow

| Method | Path | Description |
|---|---|---|
| GET | `/escrow` | Contract parties (seller, inspector, lender, nft address) |
| GET | `/escrow/:nftId` | Full escrow state incl. approvals and `readyToFinalize` |
| POST | `/escrow/:nftId/list/prepare` | `{ from, buyer, purchasePriceEther, escrowAmountEther }` |
| POST | `/escrow/:nftId/deposit/prepare` | `{ from, amountEther }` |
| POST | `/escrow/:nftId/approve/prepare` | `{ from }` |
| POST | `/escrow/:nftId/inspection/prepare` | `{ from, passed }` |
| POST | `/escrow/:nftId/finalize/prepare` | `{ from }` |
| POST | `/escrow/:nftId/cancel/prepare` | `{ from }` |

---

## Examples

```bash
# Chain + contract status
curl localhost:4000/api/contract/health

# Live escrow state for property #1
curl localhost:4000/api/contract/escrow/1

# Earnest deposit: returns a transaction for the buyer's wallet to sign
curl -X POST localhost:4000/api/contract/escrow/1/deposit/prepare \
  -H 'Content-Type: application/json' \
  -d '{"from":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","amountEther":"5"}'
```

Response:

```json
{
  "success": true,
  "transaction": {
    "to": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "data": "0xe740f770…0001",
    "value": "0x4563918244f40000",
    "chainId": 31337,
    "from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "gasLimit": "0x6512"
  },
  "signWith": "buyer"
}
```

The client then hands that object straight to the wallet:

```js
const { transaction } = await contractApi.prepareDeposit(1, { from: address, amountEther: '5' });
const hash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [transaction] });
```
