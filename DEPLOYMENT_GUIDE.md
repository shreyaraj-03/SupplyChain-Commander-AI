# SupplyChain Commander AI - Google Cloud Deployment Guide

This guide provides step-by-step instructions to build, configure, and deploy **SupplyChain Commander AI** to **Google Cloud Run** with **Google BigQuery** and **Artifact Registry**.

---

## Prerequisites

1. **Google Cloud SDK (`gcloud`)** installed on your machine or use **Google Cloud Shell**.
   - Verify installation: `gcloud --version`
2. **Google Cloud Project** created with billing enabled.
3. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   ```

---

## Quick Deployment (Automated Scripts)

### Option A: Using Bash / macOS / Linux / Cloud Shell
```bash
# 1. Set your GCP Project ID
export GCP_PROJECT_ID="your-project-id"

# 2. (Optional) Set your Gemini API Key if using live Gemini generation
export GEMINI_API_KEY="your-gemini-api-key"

# 3. Run the automated deployment script
chmod +x deploy/gcp-deploy.sh
./deploy/gcp-deploy.sh
```

### Option B: Using Windows PowerShell
```powershell
# 1. Set your GCP Project ID
$env:GCP_PROJECT_ID = "your-project-id"

# 2. (Optional) Set your Gemini API Key
$env:GEMINI_API_KEY = "your-gemini-api-key"

# 3. Run the deployment script
.\deploy\gcp-deploy.ps1
```

---

## Manual Step-by-Step Deployment Instructions

If you prefer running each `gcloud` command step-by-step:

### Step 1: Set Project and Region Variables
```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="supplychain-commander-ai"
export REPO_NAME="supplychain-commander-repo"
export DATASET_NAME="supply_chain_analytics"

gcloud config set project $PROJECT_ID
```

---

### Step 2: Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  --project=$PROJECT_ID
```

---

### Step 3: Create an Artifact Registry Docker Repository
```bash
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker repository for SupplyChain Commander AI" \
  --project=$PROJECT_ID
```

---

### Step 4: Build and Push the Container Image via Cloud Build
```bash
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

gcloud builds submit --tag $IMAGE_URI --project=$PROJECT_ID
```

---

### Step 5: Configure IAM Permissions for BigQuery Streaming
Cloud Run runs under the default Compute Service Account. Grant it BigQuery permissions:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant BigQuery Data Editor (read/write access to dataset tables)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/bigquery.dataEditor"

# Grant BigQuery Job User (permission to run queries & load jobs)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/bigquery.jobUser"
```

---

### Step 6: Deploy to Google Cloud Run
```bash
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE_URI \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},BIGQUERY_DATASET=${DATASET_NAME},PYTHON_BIN=/opt/venv/bin/python" \
  --project=$PROJECT_ID
```

---

### Step 7: Verify Live Deployment

1. **Retrieve the live Cloud Run URL**:
   ```bash
   gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --format='value(status.url)'
   ```
2. **Test Health Endpoint**:
   ```bash
   curl https://<YOUR-CLOUD-RUN-URL>/healthz
   ```
   *Expected Response:*
   ```json
   {
     "status": "HEALTHY",
     "service": "SupplyChain Commander AI",
     "environment": "production"
   }
   ```
3. **Open the Operations UI**: Open `https://<YOUR-CLOUD-RUN-URL>` in your web browser.

---

## Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment mode | `production` |
| `PORT` | Container HTTP listen port | `8080` |
| `PYTHON_BIN` | Path to container Python interpreter | `/opt/venv/bin/python` |
| `GCP_PROJECT_ID` | Google Cloud Project ID | `your-project-id` |
| `BIGQUERY_DATASET` | BigQuery dataset for telemetry and logs | `supply_chain_analytics` |
| `GEMINI_API_KEY` | Optional Gemini API key for live generation | `AQ...` |

---

## BigQuery Schema & Tables

When the container runs in Google Cloud, it streams data to your BigQuery dataset:
- `products`: Product catalog and inventory specifications
- `warehouses`: Regional distribution nodes and storage capacities
- `suppliers`: Upstream manufacturing and logistics vendors
- `purchase_orders`: Inbound supplier orders and arrival schedules
- `customer_orders`: Downstream delivery commitments and SLA tiers
- `historical_disruptions`: Historical supply chain incidents
- `detected_risks`: AI data-detected risk signals
- `dynamic_disruptions`: Converted actionable disruption events
- `mitigation_executions`: Authorized autonomous recovery execution logs
