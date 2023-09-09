# The instructions for the first stage
FROM node:18-alpine as build-stage

RUN apk add --no-cache python3 make g++

COPY ./package*.json ./
COPY ./apps/ws/disconnect/package*.json ./apps/ws/disconnect/
COPY ./shared/dynamolayer/package*.json ./shared/dynamolayer/
COPY ./shared/encryption/package*.json ./shared/encryption/
RUN npm install

# The instructions for second stage
FROM public.ecr.aws/lambda/nodejs:18-x86_64 as production-stage

COPY --from=build-stage node_modules ${LAMBDA_TASK_ROOT}/node_modules

COPY ./shared/encryption/ ${LAMBDA_TASK_ROOT}/shared/encryption/
COPY ./shared/dynamolayer/ ${LAMBDA_TASK_ROOT}/shared/dynamolayer/
COPY ./apps/ws/disconnect/config ${LAMBDA_TASK_ROOT}/config
COPY ./apps/ws/disconnect/index.js ${LAMBDA_TASK_ROOT}/index.js

CMD [ "index.handler" ]