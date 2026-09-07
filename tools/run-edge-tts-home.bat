@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."
if not exist ".local" mkdir ".local"

for /f "usebackq delims=" %%P in (`py -3 -c "import sys,pathlib;print(pathlib.Path(sys.executable).with_name('pythonw.exe'))"`) do set "PYW=%%P"
if not exist "%PYW%" (
  echo pythonw not found>> ".local\edge-tts-home.log"
  exit /b 1
)

start "" "%PYW%" "%CD%\tools\run-edge-tts-home.py"
exit /b 0
