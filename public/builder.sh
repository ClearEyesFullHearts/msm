#!/bin/bash

myVar=none
myVar=$(git log --pretty=format:'%H' -n 1)
echo $myVar
echo "VITE_API_URL=https://api.ysypya.com
VITE_WSS_URL=wss://socket.ysypya.com
VITE_CHAIN_SALT=BNgn87BFaoc3xunf0KaOKQ==
VITE_CHAIN_NETWORK=sepolia
VITE_CHAIN_API_KEY=hZOfL11C3G4een-0wzE5lCsRn2o-EAN9
VITE_CHAIN_CONTRACT=0xeCb67f9705110bf703a0E34CA04749e46823c3be
VITE_PUBLIC_VAPID_KEY=BKsOGQP66VNVwrjUhi3CZRUiGDxzSFJPaiCqcrN3tyaIVSySMkNRVoaIbX9VcuFrHfiHqxfwEbQ67kbNjCHAclk
VITE_COMMIT_HASH=${myVar}" > .env.production

rm -r dist

BUILD_HASH=$myVar npm run build

rm -r ../trust/dist

cp -R ./dist ../trust/

cd ../trust

node serve > /dev/null 2>&1 &
BUILD_HASH=$myVar node trustClient