<#
.SYNOPSIS
    Starts Prometheus server for SentinelOps local monitoring.
.DESCRIPTION
    Launches Prometheus on port 9090 scraping Windows Exporter on port 9182.
#>

[CmdletBinding()]
param(
    [string]$TargetDir = "",
    [int]$Port = 9090,
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
    $TargetDir = Join-Path $RepoRoot "infrastructure\prometheus"
}

$ResolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
$BinDir = Join-Path $ResolvedTargetDir "bin"
$ExePath = Join-Path $BinDir "prometheus.exe"
$ConfigFile = Join-Path $ResolvedTargetDir "prometheus.local.yml"
$DataDir = Join-Path $ResolvedTargetDir "data"

if (-not (Test-Path -Path $ExePath)) {
    Write-Host "[INFO] prometheus.exe not found. Installing..." -ForegroundColor Yellow
    & "$PSScriptRoot\install_prometheus.ps1"
}

if (-not (Test-Path -Path $ExePath)) {
    Write-Error "prometheus.exe could not be found at $ExePath."
    exit 1
}

# Check if port 9090 is already occupied
$ActiveConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($ActiveConn) {
    Write-Host "[OK] Prometheus or a service is already listening on port $Port (PID: $($ActiveConn.OwningProcess[0]))." -ForegroundColor Green
    Write-Host "     Access Prometheus UI at: http://localhost:$Port" -ForegroundColor Cyan
    exit 0
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting Prometheus Telemetry Engine                           " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Binary:     $ExePath" -ForegroundColor Gray
Write-Host "Config:     $ConfigFile" -ForegroundColor Gray
Write-Host "Data Dir:   $DataDir" -ForegroundColor Gray
Write-Host "Web UI:     http://localhost:$Port" -ForegroundColor Green

$ArgsList = @(
    "--config.file=$ConfigFile",
    "--storage.tsdb.path=$DataDir",
    "--web.listen-address=0.0.0.0:$Port",
    "--web.enable-lifecycle"
)

if ($Foreground) {
    & $ExePath @ArgsList
} else {
    $Proc = Start-Process -FilePath $ExePath -ArgumentList $ArgsList -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    if ($Proc.HasExited) {
        Write-Error "Prometheus failed to start. Exit code: $($Proc.ExitCode)"
        exit 1
    } else {
        Write-Host "[OK] Prometheus started in background! (PID: $($Proc.Id))" -ForegroundColor Green
        Write-Host "     Access Prometheus UI: http://localhost:$Port" -ForegroundColor Cyan
    }
}
