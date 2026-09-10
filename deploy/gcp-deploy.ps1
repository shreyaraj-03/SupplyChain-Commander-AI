# ==============================================================================
# SupplyChain Commander AI - Google Cloud Deployment Script (Windows PowerShell)
# ==============================================================================
param (
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = "us-central1",
    [string]$ServiceName = "supplychain-commander-ai",
    [string]$RepoName = "supplychain-commander-repo",
    [string]$ImageName = "supplychain-commander-ai",
    [string]$BigQueryDataset = "supply_chain_analytics",
    [string]$GeminiApiKey = $env:GEMINI_API_KEY
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " SupplyChain Commander AI - Google Cloud Deployment (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null)
}

if (-not $ProjectId) {
    Write-Error "GCP Project ID is not specified. Provide -ProjectId or set `$env:GCP_PROJECT_ID."
    exit 1
}

Write-Host "Deploying to Project: $ProjectId" -ForegroundColor Green
Write-Host "Region:               $Region" -ForegroundColor Green
Write-Host "Service Name:         $ServiceName" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Enable required APIs
Write-Host "Step 1/5: Enabling required Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  bigquery.googleapis.com `
  --project=$ProjectId

# 2. Ensure Artifact Registry repository exists
Write-Host "Step 2/5: Ensuring Artifact Registry repository exists..." -ForegroundColor Yellow
$repoCheck = (gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectId 2>$null)
if (-not $repoCheck) {
    Write-Host "Creating Artifact Registry repository '$RepoName'..."
    gcloud artifacts repositories create $RepoName `
      --repository-format=docker `
      --location=$Region `
      --description="Docker repository for SupplyChain Commander AI" `
      --project=$ProjectId
} else {
    Write-Host "Artifact Registry repository '$RepoName' exists."
}

# 3. Build container with Cloud Build
$ImageUri = "$Region-docker.pkg.dev/$ProjectId/$RepoName/${ImageName}:latest"
Write-Host "Step 3/5: Building container image via Cloud Build ($ImageUri)..." -ForegroundColor Yellow
gcloud builds submit --tag $ImageUri --project=$ProjectId

# 4. Configure IAM permissions for BigQuery
Write-Host "Step 4/5: Granting BigQuery IAM permissions to Cloud Run Service Account..." -ForegroundColor Yellow
$ProjectNumber = (gcloud projects describe $ProjectId --format='value(projectNumber)')
$ComputeSa = "${ProjectNumber}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$ComputeSa" `
  --role="roles/bigquery.dataEditor" `
  --condition=None 2>$null

gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$ComputeSa" `
  --role="roles/bigquery.jobUser" `
  --condition=None 2>$null

# 5. Deploy to Google Cloud Run
Write-Host "Step 5/5: Deploying to Google Cloud Run..." -ForegroundColor Yellow
$EnvVars = "NODE_ENV=production,GCP_PROJECT_ID=$ProjectId,BIGQUERY_DATASET=$BigQueryDataset"
if ($GeminiApiKey) {
    $EnvVars += ",GEMINI_API_KEY=$GeminiApiKey"
}

gcloud run deploy $ServiceName `
  --image=$ImageUri `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --port=8080 `
  --memory=2Gi `
  --cpu=2 `
  --min-instances=0 `
  --max-instances=10 `
  --set-env-vars=$EnvVars `
  --project=$ProjectId

Write-Host "============================================================" -ForegroundColor Cyan
$ServiceUrl = (gcloud run services describe $ServiceName --platform=managed --region=$Region --project=$ProjectId --format='value(status.url)')
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Service URL:  $ServiceUrl" -ForegroundColor Green
Write-Host "Health Check: $ServiceUrl/healthz" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
