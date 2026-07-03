@echo off
title Vocab App
chcp 936 >nul 2>&1
echo ============================
echo   Vocab App Starting...
echo ============================

:: Kill old process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Change to script directory
cd /d "%~dp0"

:: Check node
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js first.
    pause
    exit /b 1
)

:: Install deps if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

:: Check data
if not exist "data\words_800.json" (
    echo [ERROR] Missing data\words_800.json
    pause
    exit /b 1
)

echo Starting server...
echo Open browser: http://localhost:3000
echo.
node server.js
if errorlevel 1 (
    echo [ERROR] Server failed to start
    pause
)