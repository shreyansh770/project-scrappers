FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY lib/ lib/
COPY scrapers/ scrapers/
COPY scripts/ scripts/
COPY config.yml .

# Default: run all scrapers
CMD ["python", "scripts/run_all.py"]
