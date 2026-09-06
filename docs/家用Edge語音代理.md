# 家用 Edge 神經語音（只給 kid-quiz）

這台已在 07:30 產英文的 Windows 當語音代理：本機跑 `edge-tts`（非官方、走 Edge 神經音），平板只下載幾秒 mp3，不抓 300MB 模型。**電腦沒開，神經音就暫停**，網站會改走 Google TTS。

## 你要做的（一次）

1. 用本專案 `docs/google-apps-script.gs` **全文覆蓋** Apps Script → 儲存 → **部署新版本**（網址可不變）。
2. 在這台電腦開 PowerShell（專案目錄）執行：

```powershell
powershell -ExecutionPolicy Bypass -File tools\install-edge-tts-home-task.ps1
Start-ScheduledTask -TaskName kid-quiz-edge-tts-home
```

之後每次登入 Windows 會自動開。日誌：`.local/edge-tts-home.log`。

3. 平板／手機開 https://wilsonliu0223.github.io/kid-quiz/ ，Ctrl+Shift+R 後點朗讀。

## 原理

- 本機 `127.0.0.1:8765` 合成 mp3
- `cloudflared` 給一個 `https://*.trycloudflare.com`（GitHub Pages 是 HTTPS，不能打區網 HTTP）
- 腳本把網址登記到 Apps Script（`setTtsProxy`），網頁用 `getTtsProxy` 拿到
- trycloudflare 網址會變，所以**不要寫死進 git**
