@echo off
chcp 65001 >nul 2>&1
title 重置学习进度
echo.
echo ⚠️  此操作将重置所有学习进度！
echo.
set /p confirm=确认重置？(输入 yes 确认): 
if /i "%confirm%"=="yes" (
    cd /d "%~dp0"
    node init_progress.js
    echo.
    echo ✅ 重置完成！
) else (
    echo 已取消。
)
pause
