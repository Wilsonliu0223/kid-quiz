$ErrorActionPreference = "Stop"
$tools = $PSScriptRoot
$repo = Split-Path -Parent $tools
$name = "kid-quiz-edge-tts-home"
$script = Join-Path $tools "run-edge-tts-home.py"

$pyw = (& py -3 -c "import sys, pathlib; print(pathlib.Path(sys.executable).with_name('pythonw.exe'))").Trim()
if (-not (Test-Path $pyw)) {
  throw "pythonw.exe not found: $pyw"
}

$arg = '"' + $script + '"'
$action = New-ScheduledTaskAction -Execute $pyw -Argument $arg -WorkingDirectory $repo
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
$settings.MultipleInstances = "IgnoreNew"
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Get-ScheduledTask -TaskName $name | Format-List TaskName, State
Write-Host "Installed hidden logon task $name"
