@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

cd /d "%~dp0\.."
if not exist ".local" mkdir ".local"
set "LOG=%CD%\.local\edge-tts-home.log"

echo.>> "%LOG%"
echo ===== %DATE% %TIME% start =====>> "%LOG%"

set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages;%PATH%"
for /d %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\Cloudflare.cloudflared*") do (
  set "PATH=%%D;%PATH%"
)

py -3 -m pip install -q edge-tts >> "%LOG%" 2>&1
if errorlevel 1 (
  echo pip install edge-tts failed>> "%LOG%"
  exit /b 1
)

py -3 "tools\run-edge-tts-home.py" >> "%LOG%" 2>&1
set "ERR=%ERRORLEVEL%"
echo ===== %DATE% %TIME% exit %ERR% =====>> "%LOG%"
exit /b %ERR%
