import axios from 'axios';

/**
 * Thin client for the smart contract API.
 *
 * The base URL is env-driven so the same build works against a local node, a
 * staging chain or production without a code change.
 */
const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
});

/** Unwraps the API's { success, message } envelope into a plain Error. */
function toError(error) {
  return new Error(error.response?.data?.message || error.message || 'Request failed');
}

async function get(path) {
  try {
    const { data } = await client.get(path);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

async function post(path, body) {
  try {
    const { data } = await client.post(path, body);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export const contractApi = {
  health: () => get('/contract/health'),
  getCollection: () => get('/contract/real-estate'),
  getToken: (tokenId) => get(`/contract/real-estate/tokens/${tokenId}`),
  getEscrow: (nftId) => get(`/contract/escrow/${nftId}`),
  prepareMint: (payload) => post('/contract/real-estate/mint/prepare', payload),
  prepareDeposit: (nftId, payload) => post(`/contract/escrow/${nftId}/deposit/prepare`, payload),
  prepareApprove: (nftId, payload) => post(`/contract/escrow/${nftId}/approve/prepare`, payload),
};

export default contractApi;
