@echo off
echo 🚀 Starting application (Light)...

REM Start Docker in background
docker compose -f docker-compose.light.yml up -d

echo Waiting for API...
:wait_loop
timeout /t 1 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 goto wait_loop

echo Backend ready!

REM Start API logs in new window
start "API Logs" cmd /c "docker compose -f docker-compose.light.yml logs -f api"

echo Starting frontend...
cd frontend
npm install
npm run dev