@echo off
chcp 65001 >nul 2>&1
title Vocab App - 背单词
echo.
echo ========================================
echo   背单词 App 启动中...
echo ========================================
echo.

:: Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo 关闭旧进程 PID=%%a ...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Change to this script's directory
cd /d "%~dp0"
echo 当前目录: %cd%
echo.

:: Check node_modules exists
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] npm install 失败！
        pause
        exit /b 1
    )
    echo.
)

:: Check data exists
if not exist "data\words_800.json" (
    echo [错误] 找不到 data\words_800.json，请确认文件完整！
    pause
    exit /b 1
)

echo 正在启动服务器...
echo 打开浏览器访问: http://localhost:3000
echo.
echo 按 Ctrl+C 可以停止服务器
echo.

node server.js
if errorlevel 1 (
    echo.
    echo [错误] 服务器启动失败！
)
pause
