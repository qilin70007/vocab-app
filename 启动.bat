@echo off
chcp 936 >nul 2>&1
title Vocab App
echo.
echo ========================================
echo   Vocab App Starting...
echo ========================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTEN"') do (
    echo Killing old process PID=%%a ...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

cd /d "E:\Tina\自研背单词软件"
if errorlevel 1 (
    echo [ERROR] Cannot find project directory
    pause
    exit /b 1
)

node server.js
if errorlevel 1 (
echo.
echo [ERROR] Server failed to start!
)
pause
