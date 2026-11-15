<#
.SYNOPSIS
    Starts Prometheus Blackbox Exporter on port 9115.
.DESCRIPTION
    Launches blackbox_exporter.exe configured with infrastructure/blackbox_exporter/blackbox.yml.
#>

[CmdletBinding()]
param(
    [string]$TargetDir = "",
    [int]$Port = 9115,
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
    $TargetDir = Join-Path $RepoRoot "infrastructure\blackbox_exporter"
}

$ResolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
$BinDir = Join-Path $ResolvedTargetDir "bin"
$ExePath = Join-Path $BinDir "blackbox_exporter.exe"
$ConfigFile = Join-Path $ResolvedTargetDir "blackbox.yml"

if (-not (Test-Path -Path $ExePath)) {
    Write-Host "[INFO] blackbox_exporter.exe not found. Installing..." -ForegroundColor Yellow
    & "$PSScriptRoot\install_blackbox_exporter.ps1"
}

if (-not (Test-Path -Path $ExePath)) {
    Write-Error "blackbox_exporter.exe could not be found at $ExePath."
    exit 1
}

# Check if port 9115 is already occupied
$ActiveConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($ActiveConn) {
    Write-Host "[OK] Blackbox Exporter or a service is already listening on port $Port (PID: $($ActiveConn.OwningProcess[0]))." -ForegroundColor Green
    Write-Host "     Probe endpoint: http://localhost:$Port/probe" -ForegroundColor Cyan
    exit 0
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting Blackbox Exporter Service Prober                      " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Binary:     $ExePath" -ForegroundColor Gray
Write-Host "Config:     $ConfigFile" -ForegroundColor Gray
Write-Host "Binding:    0.0.0.0:$Port" -ForegroundColor Green

$ArgsList = @(
    "--config.file=$ConfigFile",
    "--web.listen-address=0.0.0.0:$Port"
)

if ($Foreground) {
    & $ExePath @ArgsList
} else {
    $Proc = Start-Process -FilePath $ExePath -ArgumentList $ArgsList -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    if ($Proc.HasExited) {
        Write-Error "Blackbox Exporter failed to start. Exit code: $($Proc.ExitCode)"
        exit 1
    } else {
        Write-Host "[OK] Blackbox Exporter started in background! (PID: $($Proc.Id))" -ForegroundColor Green
        Write-Host "     Probe endpoint: http://localhost:$Port/probe" -ForegroundColor Cyan
    }
}
