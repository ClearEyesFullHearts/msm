import { useAuthStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';
const mycrypto = new CryptoHelper();

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    delete: request('DELETE')
};

function request(method) {
    return async (url, body) => {
        const headers = await authHeader(url, method, body);
        const requestOptions = {
            method,
            headers
        };
        if (body) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(body);
        }
        return fetch(url, requestOptions).then(handleResponse);
    }
}

// helper functions

async function authHeader(url, method, body) {
    // return auth header with jwt if user is logged in and request is to the api url
    const { user, signing } = useAuthStore();
    
    const isLoggedIn = !!user?.token;
    const isApiUrl = url.startsWith(import.meta.env.VITE_API_URL);
    if (isLoggedIn && isApiUrl) {
        const { token, contacts, ...restUser } = user;
        const headers = {
            Authorization: `Bearer ${token}`
        }
        if(['POST', 'PUT', 'DELETE'].includes(method)){
            const data = JSON.stringify({
                ...restUser,
                ...body,
            });
            
            const signature = await mycrypto.sign(signing, data);
            headers['X-msm-Sig'] = signature;
        }
        return headers;
    } else {
        return {};
    }
}

async function handleResponse(response) {
    const isJson = response.headers?.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    // check for error response
    if (!response.ok) {
        const { user, logout } = useAuthStore();
        if ([401, 403].includes(response.status) && user) {
            // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
            logout();
        }

        // get error message from body or default to response status
        const error = (data && data.message) || response.status;
        return Promise.reject(error);
    }

    return data;
}
