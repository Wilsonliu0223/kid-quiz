@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-daily-en-articles-task.ps1"
if errorlevel 1 pause & exit /b 1
echo 已設定：每天 07:30 背景執行
echo 日誌：%CD%\..\.local\daily-en-articles.log
pause
