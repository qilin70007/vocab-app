@echo off
title Vocab App
chcp 936 >nul
echo ============================
echo   Vocab App Starting...
echo ============================
echo.

:: Show where we are
echo Script dir: %~dp0
cd /d "%~dp0"
echo Current dir: %cd%
echo.

:: Check files exist
if not exist "server.js" (
    echo [ERROR] Missing server.js in %cd%
    pause
    exit /b 1
)
echo Found server.js

if not exist "words.json" (
    echo [WARN] Missing words.json - app may not work
) else (
    echo Found words.json
)

:: Try node
echo.
echo Trying to start Node...
echo.

node server.js

echo.
echo Server exited with code %errorlevel%
pause