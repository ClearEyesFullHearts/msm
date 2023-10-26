#!/bin/bash

set -a
. ./.$1.env
set +a

cd ../..

# Send all images to ECR
# aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/q0f4v2r9
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com

docker build -f docker/files/ws-connect.dockerfile -t mft-msm-ws-connect.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-ws-connect.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-ws-connect.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-ws-connect.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/ws-disconnect.dockerfile -t mft-msm-ws-disconnect.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-ws-disconnect.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-ws-disconnect.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-ws-disconnect.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/ws-fallback.dockerfile -t mft-msm-ws-fallback.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-ws-fallback.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-ws-fallback.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-ws-fallback.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/main-api-lambda.dockerfile -t mft-msm-main.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-main.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-main.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-main.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/clean-daily.dockerfile -t mft-msm-clean-daily.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-clean-daily.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-clean-daily.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-clean-daily.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/clean-account.dockerfile -t mft-msm-clean-account.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-clean-account.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-clean-account.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-clean-account.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/clean-message.dockerfile -t mft-msm-clean-message.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-clean-message.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-clean-message.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-clean-message.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/notification.dockerfile -t mft-msm-notification.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-notification.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-notification.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-notification.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/validation.dockerfile -t mft-msm-validation.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-validation.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-validation.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-validation.${STACK_STAGE}.${IMAGE_TAG}

docker build -f docker/files/mark-msg-read.dockerfile -t mft-msm-mark-read.${STACK_STAGE}.${IMAGE_TAG} .
docker image tag mft-msm-mark-read.${STACK_STAGE}.${IMAGE_TAG} ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-mark-read.${STACK_STAGE}.${IMAGE_TAG}
docker push ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/cantlose:mft-msm-mark-read.${STACK_STAGE}.${IMAGE_TAG}

# copy cloudformation templates to the S3 bucket
aws s3 cp aws/templates/msm_cleanup_formation.yaml s3://msm-cloudformation-template
aws s3 cp aws/templates/msm_main_formation.yaml s3://msm-cloudformation-template
aws s3 cp aws/templates/msm_notification_formation.yaml s3://msm-cloudformation-template
aws s3 cp aws/templates/msm_validate_formation.yaml s3://msm-cloudformation-template
aws s3 cp aws/templates/msm_wss_api_template.yaml s3://msm-cloudformation-template
aws s3 cp aws/templates/msm_message_read_formation.yaml s3://msm-cloudformation-template

# Deploy master stack
aws cloudformation deploy \
    --stack-name "$MASTER_STACK_NAME" \
    --template-file aws/templates/msm_master_formation.yaml \
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
    --parameter-overrides \
        MSMStageName="$STACK_STAGE" \
        MSMImageTag="$IMAGE_TAG" \
        MSMTableName="$DYNAMO_TABLE" \
        MSMSecretName="$SECRET_NAME" \
        MSMSecretID="$SECRET_ARN" \
        MSMHostedZoneID="$HOSTED_ZONE_ID" \
        MSMHttpApiCertificateID="$HTTP_CERTIFICATE" \
        MSMWssApiCertificateID="$WSS_CERTIFICATE" \
        MSMHttpApiDomainName="$HTTP_DOMAIN" \
        MSMWssApiDomainName="$WSS_DOMAIN" \