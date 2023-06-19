#!/bin/bash

myVar=none
myVar=$(git log --pretty=format:'%H' -n 1)
echo $myVar
BUILD_HASH=$myVar npm run build
cp -R ./dist ../trust/dist