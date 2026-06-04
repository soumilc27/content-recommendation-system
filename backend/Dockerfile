FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Ensure the repository root is on PYTHONPATH for imports
ENV PYTHONPATH=/app

# Expose the port (Railway provides $PORT env var)
EXPOSE 8000

# Start the FastAPI server using uvicorn
CMD ["python3", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}" ]
