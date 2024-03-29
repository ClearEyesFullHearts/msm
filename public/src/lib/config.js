const NETWORK = `${import.meta.env.VITE_CHAIN_NETWORK}`;
const API_KEY = `${import.meta.env.VITE_CHAIN_API_KEY}`;
const CONTRACT_ADDRESS = `${import.meta.env.VITE_CHAIN_CONTRACT}`;
const API_URL = `${import.meta.env.VITE_API_URL}`;
const BASE_URL = `${import.meta.env.BASE_URL}`;
const COMMIT_HASH = `${import.meta.env.VITE_COMMIT_HASH}`;
const WSS_URL = `${import.meta.env.VITE_WSS_URL}`;
const VAPID_KEY = `${import.meta.env.VITE_PUBLIC_VAPID_KEY}`;
const CHAIN_SALT = `${import.meta.env.VITE_CHAIN_SALT}`;

export default {
  NETWORK,
  API_KEY,
  CONTRACT_ADDRESS,
  BASE_URL,
  API_URL,
  COMMIT_HASH,
  WSS_URL,
  VAPID_KEY,
  CHAIN_SALT,
};
