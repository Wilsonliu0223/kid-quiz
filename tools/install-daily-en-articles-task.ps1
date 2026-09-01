$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $PSScriptRoot "run-daily-en-articles.bat"))) {
  $root = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$tools = $PSScriptRoot
$bat = Join-Path $tools "run-daily-en-articles.bat"
$repo = Split-Path -Parent $tools
$name = "kid-quiz-daily-en-articles"

$action = New-ScheduledTaskAction -Execute $bat -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At 7:30am
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -WakeToRun `
  -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Get-ScheduledTask -TaskName $name | Format-List TaskName, State
Get-ScheduledTaskInfo -TaskName $name | Format-List NextRunTime, LastTaskResult
