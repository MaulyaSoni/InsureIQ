param(
    [int]$Port = 8000,
    [switch]$NoReload
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$reloadArg = if ($NoReload) { "" } else { " --reload" }
$cmd = "uvicorn backend.main:app --host 127.0.0.1 --port $Port$reloadArg"

Write-Host "Starting InsureIQ backend from $repoRoot"
Write-Host "Command: $cmd"

Invoke-Expression $cmd
