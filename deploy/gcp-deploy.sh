#!/usr/bin/env bash
# ==============================================================================
# SupplyChain Commander AI - Google Cloud Deployment Script (Bash / Cloud Shell)
# ==============================================================================
set -euo pipefail

# Configuration variables (adjust as necessary)
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="supplychain-commander-ai"
REPO_NAME="supplychain-commander-repo"
IMAGE_NAME="supplychain-commander-ai"
BIGQUERY_DATASET="supply_chain_analytics"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

echo "============================================================"
echo " SupplyChain Commander AI - Google Cloud Deployment"
echo "============================================================"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: GCP Project ID is not set."
  echo "Please set it using: export GCP_PROJECT_ID=your-project-id or run: gcloud config set project your-project-id"
  exit 1
fi

echo "Deploying to Project: ${PROJECT_ID}"
echo "Region:               ${REGION}"
echo "Service Name:         ${SERVICE_NAME}"
echo "============================================================"

# 1. Enable required GCP APIs
echo "Step 1/5: Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT_ID}"

# 2. Create Artifact Registry repository if not exists
echo "Step 2/5: Ensuring Artifact Registry repository exists..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "Creating Artifact Registry repository '${REPO_NAME}'..."
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker repository for SupplyChain Commander AI" \
    --project="${PROJECT_ID}"
else
  echo "Artifact Registry repository '${REPO_NAME}' already exists."
fi

# 3. Build container image with Google Cloud Build
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"
echo "Step 3/5: Building and pushing container image via Cloud Build..."
gcloud builds submit \
  --tag "${IMAGE_URI}" \
  --project="${PROJECT_ID}"

# 4. Grant Cloud Run service account BigQuery permissions
echo "Step 4/5: Configuring Cloud Run Service Account BigQuery IAM roles..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant BigQuery Data Editor & Job User to the runtime service account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/bigquery.dataEditor" \
  --condition=None || true

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/bigquery.jobUser" \
  --condition=None || true

# 5. Deploy to Google Cloud Run
echo "Step 5/5: Deploying container to Google Cloud Run..."
ENV_VARS="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},BIGQUERY_DATASET=${BIGQUERY_DATASET}"
if [ -n "$GEMINI_API_KEY" ]; then
  ENV_VARS="${ENV_VARS},GEMINI_API_KEY=${GEMINI_API_KEY}"
fi

gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_URI}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="${ENV_VARS}" \
  --project="${PROJECT_ID}"

echo "============================================================"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform=managed --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "Deployment Complete!"
echo "Service URL: ${SERVICE_URL}"
echo "Health Check: ${SERVICE_URL}/healthz"
echo "============================================================"
