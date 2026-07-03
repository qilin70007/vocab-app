@echo off
chcp 936 >nul
title Vocab App
cd /d "%~dp0"

:: Try PowerShell launcher first
if exist "%~dp0Æô¶¯.ps1" (
    powershell -ExecutionPolicy Bypass -File "%~dp0Æô¶¯.ps1"
    if %errorlevel% neq 0 (
        echo PowerShell failed, trying direct launch...
        goto :NODIRECT
    )
    goto :EOF
)

:NODIRECT
:: Direct fallback
echo Starting directly with node.exe
if not exist "server.js" (
    echo [ERR] missing server.js
    pause
    exit /b 1
)
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)
node server.js
pause