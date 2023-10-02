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
FROM public.ecr.aws/lambda/nodejs:18-x86_64 as production-stage

COPY --from=build-stage node_modules ${LAMBDA_TASK_ROOT}/node_modules

COPY ./shared/tracing/ ${LAMBDA_TASK_ROOT}/shared/tracing/
COPY ./shared/auth/ ${LAMBDA_TASK_ROOT}/shared/auth/
COPY ./shared/error/ ${LAMBDA_TASK_ROOT}/shared/error/
COPY ./shared/secrets/ ${LAMBDA_TASK_ROOT}/shared/secrets/
COPY ./shared/encryption/ ${LAMBDA_TASK_ROOT}/shared/encryption/
COPY ./shared/dynamolayer/ ${LAMBDA_TASK_ROOT}/shared/dynamolayer/
COPY ./apps/main/config ${LAMBDA_TASK_ROOT}/config
COPY ./apps/main/src ${LAMBDA_TASK_ROOT}/src
COPY ./apps/main/lambda.js ${LAMBDA_TASK_ROOT}/lambda.js

CMD [ "lambda.handler" ]