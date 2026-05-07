FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (respects .dockerignore — excludes venv/, .env, __pycache__)
COPY . .

# Ensure start script has Unix line endings and is executable
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

EXPOSE 8000

# Health check for Coolify / Docker orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["bash", "start.sh"]