@echo off
REM JournalGraph Stop Script for Windows
REM This script stops all services

echo Stopping JournalGraph services...

REM Stop Docker Compose services
docker-compose down

echo All services stopped!
echo.
echo To completely remove data volumes, run:
echo   docker-compose down -v

pause