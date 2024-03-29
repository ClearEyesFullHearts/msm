# The instructions for the first stage
FROM node:18-alpine as build-stage

RUN apk add --no-cache python3 make g++

COPY ./package*.json ./
COPY ./apps/main/package*.json ./apps/main/
COPY ./shared/tracing/package*.json ./shared/tracing/
COPY ./shared/dynamolayer/package*.json ./shared/dynamolayer/
COPY ./shared/encryption/package*.json ./shared/encryption/
COPY ./shared/secrets/package*.json ./shared/secrets/
COPY ./shared/auth/package*.json ./shared/auth/
COPY ./shared/error/package*.json ./shared/error/
RUN npm install

# The instructions for second stage
FROM node:18-alpine as production-stage

WORKDIR /usr/src/app
COPY --from=build-stage node_modules node_modules

COPY ./shared/tracing/ ./shared/tracing/
COPY ./shared/auth/ ./shared/auth/
COPY ./shared/error/ ./shared/error/
COPY ./shared/secrets/ ./shared/secrets/
COPY ./shared/encryption/ ./shared/encryption/
COPY ./shared/dynamolayer/ ./shared/dynamolayer/
COPY ./apps/main/ ./apps/main/

WORKDIR /usr/src/app/apps/main

EXPOSE 4000
CMD ["node", "index.js"] 
