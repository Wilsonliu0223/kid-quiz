$ErrorActionPreference = "Stop"
$tools = $PSScriptRoot
$bat = Join-Path $tools "run-edge-tts-home.bat"
$repo = Split-Path -Parent $tools
$name = "kid-quiz-edge-tts-home"

$action = New-ScheduledTaskAction -Execute $bat -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -Hidden `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Get-ScheduledTask -TaskName $name | Format-List TaskName, State
Write-Host "Installed logon task $name"
