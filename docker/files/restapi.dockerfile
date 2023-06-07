# The instructions for the first stage
FROM node:18-alpine as build-stage

RUN apk add --no-cache python3 make g++

COPY ./package*.json ./
COPY ./apps/main/package*.json ./apps/main/
COPY ./shared/datalayer/package*.json ./shared/datalayer/
RUN npm install

# The instructions for second stage
FROM node:18-alpine as production-stage

WORKDIR /usr/src/app
COPY --from=build-stage node_modules node_modules

COPY ./shared/datalayer/ ./shared/datalayer/
COPY ./apps/main/ ./apps/main/

WORKDIR /usr/src/app/apps/main

EXPOSE 4000
CMD ["node", "index.js"] 
