@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
if not exist ".local" mkdir ".local"

echo.
echo  === kid-quiz 家用背景（重開機後點這支）===
echo.
echo  不要再開 Cursor 裡那些 8876／8877 HTTP：那是開發預覽，網站用 GitHub Pages。
echo.

rem 語音：edge-tts + cloudflared（常駐）。已有排程就用排程，否則 pythonw 背景開。
schtasks /Query /TN "kid-quiz-edge-tts-home" >nul 2>&1
if errorlevel 1 (
  echo  語音：沒有工作排程，改用 run-edge-tts-home.bat
  call "%~dp0tools\run-edge-tts-home.bat"
  if errorlevel 1 (
    echo  語音啟動失敗。請看 .local\edge-tts-home.log
  ) else (
    echo  語音已在背景開。日誌 .local\edge-tts-home.log
  )
) else (
  schtasks /Run /TN "kid-quiz-edge-tts-home"
  echo  語音：已請工作排程 kid-quiz-edge-tts-home 執行
)

echo.
echo  每日英文十篇：不是常駐。工作排程 kid-quiz-daily-en-articles 每天 07:30。
echo  今天缺文再雙擊 tools\run-daily-en-articles.bat（會跑很久，開機不要每次點）。
echo.
echo  換新電腦還要一次：Python、cloudflared、複製 .local\en-article-secrets.env
echo  然後執行 tools\install-edge-tts-home-task.ps1 與 tools\install-daily-en-articles-task.bat
echo.
timeout /t 8 >nul
exit /b 0
