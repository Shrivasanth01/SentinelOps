# ============================================================================
# SentinelOps — Start Grafana Loki Daemon
# ============================================================================

$ExeFile = Join-Path $PSScriptRoot "..\infrastructure\loki\bin\loki.exe"
$ConfigFile = Join-Path $PSScriptRoot "..\infrastructure\loki\loki.local.yml"

if (-not (Test-Path $ExeFile)) {
    Write-Host "[*] Loki executable not found. Running installer..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "install_loki.ps1")
}

$Running = Get-Process -Name "loki" -ErrorAction SilentlyContinue
if ($Running) {
    Write-Host "[!] Grafana Loki is already running with PID $($Running.Id)" -ForegroundColor Yellow
    exit 0
}

Write-Host "[*] Starting Grafana Loki daemon on 127.0.0.1:3100..." -ForegroundColor Cyan
Start-Process -FilePath $ExeFile -ArgumentList "-config.file=`"$ConfigFile`"" -WindowStyle Hidden

Start-Sleep -Seconds 2

$Started = Get-Process -Name "loki" -ErrorAction SilentlyContinue
if ($Started) {
    Write-Host "[+] Grafana Loki running successfully (PID: $($Started.Id))" -ForegroundColor Green
} else {
    Write-Error "[-] Failed to launch Grafana Loki process."
}

