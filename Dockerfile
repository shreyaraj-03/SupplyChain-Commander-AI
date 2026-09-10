# SupplyChain Commander AI - Production Dockerfile for Google Cloud Run
FROM node:20-slim

# Install Python 3, venv, and system certificates for BigQuery & Multi-Agent Engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up isolated Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy and install Node dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Set production environment and build frontend & server bundles
ENV NODE_ENV=production
RUN npm run build

# Google Cloud Run default configuration
EXPOSE 8080
ENV PORT=8080
ENV PYTHON_BIN=/opt/venv/bin/python

# Launch production server
CMD ["node", "dist/server.cjs"]
