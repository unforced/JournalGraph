@echo off
REM JournalGraph Startup Script for Windows
REM This script starts all services with a single command

echo Starting JournalGraph...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo WARNING: Please edit .env and add your OPENAI_API_KEY
    echo Then run this script again.
    pause
    exit /b 1
)

REM Check if OPENAI_API_KEY is set
findstr /C:"OPENAI_API_KEY=sk-" .env >nul
if errorlevel 1 (
    echo WARNING: OPENAI_API_KEY not set in .env file
    echo Please add your OpenAI API key and run again.
    pause
    exit /b 1
)

REM Start backend services with Docker Compose
echo Starting backend services (Neo4j + Python API)...
docker-compose up -d

REM Wait for services to be ready
echo Waiting for services to start...
timeout /t 5 /nobreak >nul

REM Check if backend is healthy
echo Checking backend health...
set max_attempts=30
set attempt=0

:health_check
curl -s http://localhost:8000/api/health >nul 2>&1
if not errorlevel 1 (
    echo Backend is ready!
    goto :backend_ready
)

set /a attempt+=1
if %attempt% geq %max_attempts% (
    echo ERROR: Backend failed to start. Check logs with: docker-compose logs backend
    pause
    exit /b 1
)

echo Waiting for backend... (%attempt%/%max_attempts%)
timeout /t 2 /nobreak >nul
goto :health_check

:backend_ready

REM Check if Neo4j is accessible
curl -s http://localhost:7475 >nul 2>&1
if not errorlevel 1 (
    echo Neo4j is ready! Browser available at http://localhost:7475
) else (
    echo WARNING: Neo4j browser not accessible, but this might be normal
)

REM Install npm dependencies if needed
if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
)

REM Start Electron app
echo Starting Electron app...
echo.
echo ===============================================
echo   JournalGraph is starting!
echo.
echo   Backend API: http://localhost:8000
echo   Neo4j Browser: http://localhost:7475
echo.
echo   To stop all services: stop.bat
echo   To view logs: docker-compose logs -f
echo ===============================================
echo.

call npm run dev