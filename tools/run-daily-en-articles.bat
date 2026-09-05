@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

cd /d "%~dp0\.."
if not exist ".local" mkdir ".local"

set "LOG=%CD%\.local\daily-en-articles.log"
set "PATH=%LOCALAPPDATA%\cursor-agent;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\cursor\resources\app\bin;%PATH%"

echo.>> "%LOG%"
echo ===== %DATE% %TIME% start =====>> "%LOG%"

if not exist "tools\daily-en-articles-prompt.txt" (
  echo missing tools\daily-en-articles-prompt.txt>> "%LOG%"
  exit /b 1
)
if not exist ".local\en-article-secrets.env" (
  echo missing .local\en-article-secrets.env>> "%LOG%"
  exit /b 1
)

where agent >nul 2>&1
if errorlevel 1 (
  echo agent CLI not found>> "%LOG%"
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo node not found>> "%LOG%"
  exit /b 1
)

agent --print --trust --force --sandbox disabled --approve-mcps --workspace "%CD%" --model cursor-grok-4.6-high -- "Read tools/daily-en-articles-prompt.txt and follow it exactly. Produce and upload today's ten English articles now." >> "%LOG%" 2>&1
set "ERR=%ERRORLEVEL%"
echo ===== %DATE% %TIME% exit %ERR% =====>> "%LOG%"
exit /b %ERR%
