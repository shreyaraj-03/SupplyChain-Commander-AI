# ==============================================================================
# SupplyChain Commander AI - Google Cloud Deployment Script (Windows PowerShell)
# Secrets are handled via GCP Secret Manager - never baked into Docker images.
# ==============================================================================
param (
    [string]$ProjectId    = $env:GCP_PROJECT_ID,
    [string]$Region       = "us-central1",
    [string]$ServiceName  = "supplychain-commander-ai",
    [string]$RepoName     = "supplychain-commander-repo",
    [string]$ImageName    = "supplychain-commander-ai",
    [string]$BigQueryDataset = "supply_chain_analytics",
    [string]$GeminiApiKey = $env:GEMINI_API_KEY
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " SupplyChain Commander AI - GCP Deployment (PowerShell)" -ForegroundColor Cyan
Write-Host " Secrets handled via Secret Manager. No keys in images." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Resolve project ID
if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null)
}
if (-not $ProjectId) {
    Write-Error "GCP Project ID not specified. Provide -ProjectId or set `$env:GCP_PROJECT_ID."
    exit 1
}

Write-Host "Project:      $ProjectId"  -ForegroundColor Green
Write-Host "Region:       $Region"     -ForegroundColor Green
Write-Host "Service:      $ServiceName" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Enable required GCP APIs
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[1/7] Enabling required Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  bigquery.googleapis.com `
  secretmanager.googleapis.com `
  --project=$ProjectId

Write-Host "      APIs enabled." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Store GEMINI_API_KEY securely in Secret Manager
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[2/7] Storing GEMINI_API_KEY in Secret Manager..." -ForegroundColor Yellow

if (-not $GeminiApiKey) {
    Write-Warning "GEMINI_API_KEY is not set. The deployed service will run without it."
} else {
    # Check if the secret already exists
    $secretExists = (gcloud secrets describe GEMINI_API_KEY --project=$ProjectId 2>$null)

    if (-not $secretExists) {
        Write-Host "      Creating secret 'GEMINI_API_KEY'..."
        # Create secret from stdin (no key written to any file)
        $GeminiApiKey | gcloud secrets create GEMINI_API_KEY `
          --data-file=- `
          --replication-policy=automatic `
          --project=$ProjectId
    } else {
        Write-Host "      Updating existing secret 'GEMINI_API_KEY'..."
        $GeminiApiKey | gcloud secrets versions add GEMINI_API_KEY `
          --data-file=- `
          --project=$ProjectId
    }
    Write-Host "      GEMINI_API_KEY stored securely in Secret Manager." -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Create Artifact Registry Docker repository (idempotent)
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[3/7] Ensuring Artifact Registry repository exists..." -ForegroundColor Yellow
$repoCheck = (gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectId 2>$null)
if (-not $repoCheck) {
    Write-Host "      Creating repository '$RepoName'..."
    gcloud artifacts repositories create $RepoName `
      --repository-format=docker `
      --location=$Region `
      --description="Docker repository for SupplyChain Commander AI" `
      --project=$ProjectId
    Write-Host "      Repository created." -ForegroundColor Green
} else {
    Write-Host "      Repository '$RepoName' already exists." -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Build & push container image via Cloud Build
# No secrets are included in the image - .env is excluded via .dockerignore
# ─────────────────────────────────────────────────────────────────────────────
$ImageUri = "$Region-docker.pkg.dev/$ProjectId/$RepoName/${ImageName}:latest"
Write-Host "`n[4/7] Building container image via Cloud Build..." -ForegroundColor Yellow
Write-Host "      Image: $ImageUri"
Write-Host "      (Source uploaded to Cloud Build - .env excluded by .dockerignore)"
gcloud builds submit --tag $ImageUri --project=$ProjectId
Write-Host "      Build and push complete." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Grant IAM permissions to the Cloud Run Compute Service Account
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[5/7] Configuring IAM permissions..." -ForegroundColor Yellow
$ProjectNumber = (gcloud projects describe $ProjectId --format='value(projectNumber)')
$ComputeSa = "${ProjectNumber}-compute@developer.gserviceaccount.com"
Write-Host "      Service Account: $ComputeSa"

# BigQuery Data Editor (read/write tables)
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$ComputeSa" `
  --role="roles/bigquery.dataEditor" `
  --condition=None 2>$null

# BigQuery Job User (run queries)
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$ComputeSa" `
  --role="roles/bigquery.jobUser" `
  --condition=None 2>$null

# Secret Manager Secret Accessor (read secrets at runtime)
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$ComputeSa" `
  --role="roles/secretmanager.secretAccessor" `
  --condition=None 2>$null

Write-Host "      IAM permissions granted." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: Deploy to Google Cloud Run (cost-optimized for $300 free tier)
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[6/7] Deploying to Google Cloud Run (cost-optimized)..." -ForegroundColor Yellow
Write-Host "      Config: 512Mi RAM, 1 vCPU, 0–3 instances (scale-to-zero)"

# Non-secret env vars
$EnvVars = "NODE_ENV=production,GCP_PROJECT_ID=$ProjectId,BIGQUERY_DATASET=$BigQueryDataset,PYTHON_BIN=/opt/venv/bin/python"

# Secret injection via Secret Manager (key never exposed in logs or CLI history)
$SecretsFlag = @()
if ($GeminiApiKey) {
    $SecretsFlag = @("--set-secrets", "GEMINI_API_KEY=GEMINI_API_KEY:latest")
}

$DeployArgs = @(
    "run", "deploy", $ServiceName,
    "--image=$ImageUri",
    "--region=$Region",
    "--platform=managed",
    "--allow-unauthenticated",
    "--port=8080",
    "--memory=512Mi",
    "--cpu=1",
    "--min-instances=0",
    "--max-instances=3",
    "--set-env-vars=$EnvVars",
    "--project=$ProjectId"
) + $SecretsFlag

& gcloud @DeployArgs

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7: Verify live deployment
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[7/7] Verifying deployment..." -ForegroundColor Yellow
$ServiceUrl = (gcloud run services describe $ServiceName `
  --platform=managed --region=$Region --project=$ProjectId `
  --format='value(status.url)')

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Service URL:   $ServiceUrl" -ForegroundColor Green
Write-Host " Health Check:  $ServiceUrl/healthz" -ForegroundColor Green
Write-Host " Operations UI: $ServiceUrl" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# Auto health check
Write-Host "`nRunning health check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ServiceUrl/healthz" -Method Get -TimeoutSec 30
    Write-Host "Health check PASSED:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Warning "Health check failed (service may still be warming up): $_"
    Write-Host "Try manually: curl $ServiceUrl/healthz"
}
