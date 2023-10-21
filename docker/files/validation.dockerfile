# The instructions for the first stage
FROM node:18-alpine as build-stage

RUN apk add --no-cache python3 make g++

COPY ./package*.json ./
COPY ./shared/tracing/package*.json ./shared/tracing/
COPY ./apps/validation/package*.json ./apps/validation/
COPY ./shared/dynamolayer/package*.json ./shared/dynamolayer/
COPY ./shared/secrets/package*.json ./shared/secrets/
RUN npm install

# The instructions for second stage
FROM public.ecr.aws/lambda/nodejs:18-x86_64 as production-stage

COPY --from=build-stage node_modules ${LAMBDA_TASK_ROOT}/node_modules

COPY ./shared/tracing/ ${LAMBDA_TASK_ROOT}/shared/tracing/
COPY ./shared/secrets/ ${LAMBDA_TASK_ROOT}/shared/secrets/
COPY ./shared/dynamolayer/ ${LAMBDA_TASK_ROOT}/shared/dynamolayer/
COPY ./apps/validation/config ${LAMBDA_TASK_ROOT}/config
COPY ./apps/validation/src ${LAMBDA_TASK_ROOT}/src
COPY ./apps/validation/index.js ${LAMBDA_TASK_ROOT}/index.js

CMD [ "index.handler" ]