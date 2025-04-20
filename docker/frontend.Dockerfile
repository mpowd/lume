FROM python:3.11-slim

WORKDIR /app

COPY frontend/requirements.txt .

RUN pip install --upgrade pip

RUN pip install --no-cache-dir -r requirements.txt

CMD ["streamlit", "run", "frontend/Manage_Chatbots.py", "--server.port", "8501", "--server.address", "0.0.0.0"]