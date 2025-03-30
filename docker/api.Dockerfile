# FROM python:3.11-slim

# WORKDIR /app

# COPY requirements.txt .

# RUN pip install --no-cache-dir -r requirements.txt
# # RUN pip install -r requirements.txt

# RUN python -m playwright install --with-deps chromium

# # COPY backend /app/backend

# CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# Upgrade pip first
RUN pip install --upgrade pip

# Install playwright separately with specific version
# RUN pip install playwright==1.39.0
# RUN python -m playwright install --with-deps chromium

# Install other requirements with strict version enforcement
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install crawl4ai==0.5.0.post8

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
