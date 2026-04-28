# CI/CD Setup Guide for Azure Container Apps

This guide explains how to set up the CI/CD pipeline for deploying the Nimbus MCP server to Azure Container Apps using GitHub Actions.

## Prerequisites

Before setting up the CI/CD pipeline, you need:

- Azure subscription with permissions to create resources
- Azure Container Registry (ACR)
- Azure Container Apps environment

## Azure Resources Setup

```bash
# Staging
export RESOURCE_GROUP="Containers"
export CONTAINER_REGISTRY="jupiterstagingcr"
export CONTAINER_APP_ENV="staging"
export CONTAINER_APP_NAME="jupiter-docs-api"
export IMAGE_NAME="jupiter-docs-api"
export IMAGE_TAG="latest"

# Preprod
export RESOURCE_GROUP="JupiterPreProd"
export CONTAINER_REGISTRY="jupiterstagingcr"
export CONTAINER_APP_ENV="jupiter-private-container-app-env-preprod"
export CONTAINER_APP_NAME="jupiter-docs-api-preprod"
export IMAGE_NAME="jupiter-docs-api"
export IMAGE_TAG="latest"
```

### 1. Build

```bash
az acr login --name $CONTAINER_REGISTRY
ACR_LOGIN_SERVER=$(az acr show --name $CONTAINER_REGISTRY --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query "passwords[0].value" --output tsv)
az acr build --registry $CONTAINER_REGISTRY --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG .
```

### 2. Create Container App

```bash
source .env

az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --ingress external \
  --max-replicas 1 \
  --min-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --secrets \
    hmlr-pfx-base64="$HMLR_PFX_BASE64" \
    hmlr-pfx-password="$HMLR_PFX_PASSWORD" \
    hmlr-pass="$HMLR_PASS" \
    ledger-api-key="$LEDGER_API_KEY" \
    ledger-apim-subscription-key="$LEDGER_APIM_SUBSCRIPTION_KEY" \
  --env-vars \
    PORT=3000 \
    HMLR_PFX_BASE64=secretref:hmlr-pfx-base64 \
    HMLR_PFX_PASSWORD=secretref:hmlr-pfx-password \
    HMLR_USER="$HMLR_USER" \
    HMLR_PASS=secretref:hmlr-pass \
    LEDGER_API_URL="$LEDGER_API_URL" \
    LEDGER_API_KEY=secretref:ledger-api-key \
    LEDGER_APIM_SUBSCRIPTION_KEY=secretref:ledger-apim-subscription-key \
    NODE_ENV=production \
    LOG_LEVEL=info

az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    postgres-connection-string="$POSTGRES_CONNECTION_STRING"

az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    POSTGRES_CONNECTION_STRING=secretref:postgres-connection-string \
    AZURE_TENANT_ID="$AZURE_TENANT_ID" \
    AZURE_CLIENT_ID="$AZURE_CLIENT_ID" \
    AZURE_CLIENT_SECRET="$AZURE_CLIENT_SECRET" \
    LEGACY_API_URL="$LEGACY_API_URL"



```

## GitHub Secrets Setup

Configure the following repository secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

* `AZURE_CLIENT_ID`
* `AZURE_SUBSCRIPTION_ID`
* `AZURE_TENANT_ID`

Configure a `production` environment with the following variables (Settings > Environments)

* `ACR_NAME`
* `CONTAINER_APP_NAME`
* `IMAGE_NAME`
* `RESOURCE_GROUP`

## Container app updates

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG
```