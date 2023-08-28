const NETWORK = `${import.meta.env.VITE_CHAIN_NETWORK}`;
const API_KEY = `${import.meta.env.VITE_CHAIN_API_KEY}`;
const CONTRACT_ADDRESS = `${import.meta.env.VITE_CHAIN_CONTRACT}`;
const API_URL = `${import.meta.env.VITE_API_URL}`;
const BASE_URL = `${import.meta.env.BASE_URL}`;

    
export default {
    NETWORK: NETWORK,
    API_KEY: API_KEY,
    CONTRACT_ADDRESS: CONTRACT_ADDRESS,
    BASE_URL: BASE_URL,
    API_URL: API_URL,
}