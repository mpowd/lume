@echo off
echo 🚀 Starting application (Light)...

docker compose -f docker-compose.light.yml up -d

echo Waiting for API...
:wait_loop
timeout /t 1 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 goto wait_loop

echo Backend ready!

start "API Logs" cmd /c "docker compose -f docker-compose.light.yml logs -f api"

echo Starting frontend...
cd frontend

call npm run dev

cd ..
echo Stopping Docker containers...
docker compose -f docker-compose.light.yml down