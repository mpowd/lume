FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# Upgrade pip first
RUN pip install --upgrade pip

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install crawl4ai==0.5.0.post8

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
