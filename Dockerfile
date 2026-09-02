# SupplyChain Commander AI - Production Dockerfile for Google Cloud Run / Container Deployment

# Base Image: Node 20 Slim
FROM node:20-slim

# Install Python 3 and system dependencies required for BigQuery & Multi-Agent Engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Node dependency manifests and install packages
COPY package*.json ./
RUN npm ci || npm install

# Copy Python requirement manifest and install Python packages
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Set production environment and build frontend & server bundles
ENV NODE_ENV=production
RUN npm run build

# Cloud Run default container port
EXPOSE 8080

# Default container runtime variables
ENV PORT=8080
ENV PYTHON_BIN=python3

# Start application server
CMD ["node", "dist/server.cjs"]
