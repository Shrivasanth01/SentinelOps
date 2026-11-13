<#
.SYNOPSIS
    Starts the Windows Exporter for SentinelOps real-time host telemetry.
.DESCRIPTION
    Launches windows_exporter.exe with the collectors required by SentinelOps Phase 2:
    cpu, memory, logical_disk, net, os, system on port 9182.
#>

[CmdletBinding()]
param(
    [string]$TargetDir = "",
    [int]$Port = 9182,
    [string]$ListenAddress = "0.0.0.0",
    [string]$Collectors = "cpu,memory,logical_disk,net,os,system",
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
    $TargetDir = Join-Path $RepoRoot "infrastructure\windows_exporter"
}

$ResolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
$ExePath = Join-Path $ResolvedTargetDir "windows_exporter.exe"

if (-not (Test-Path -Path $ExePath)) {
    Write-Host "[INFO] windows_exporter.exe not found at $ExePath. Running installer..." -ForegroundColor Yellow
    & "$PSScriptRoot\install_windows_exporter.ps1"
}

if (-not (Test-Path -Path $ExePath)) {
    Write-Error "windows_exporter.exe is not available at $ExePath."
    exit 1
}

# Check if port is already active
$ActiveConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($ActiveConn) {
    Write-Host "[OK] Windows Exporter or a service is already listening on port $Port (PID: $($ActiveConn.OwningProcess[0]))." -ForegroundColor Green
    Write-Host "     Verify metrics at: http://localhost:$Port/metrics" -ForegroundColor Cyan
    exit 0
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting Windows Exporter for SentinelOps Host Monitoring      " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Binary:     $ExePath" -ForegroundColor Gray
Write-Host "Binding:    ${ListenAddress}:${Port}" -ForegroundColor Gray
Write-Host "Collectors: $Collectors" -ForegroundColor Gray
Write-Host "Metrics:    http://localhost:$Port/metrics" -ForegroundColor Green

$ArgsList = @(
    "--web.listen-address=${ListenAddress}:${Port}",
    "--collectors.enabled=$Collectors",
    "--log.level=info"
)

if ($Foreground) {
    & $ExePath @ArgsList
} else {
    $Proc = Start-Process -FilePath $ExePath -ArgumentList $ArgsList -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 1
    if ($Proc.HasExited) {
        Write-Error "Windows Exporter failed to start. Exit code: $($Proc.ExitCode)"
        exit 1
    } else {
        Write-Host "[OK] Windows Exporter started in background! (PID: $($Proc.Id))" -ForegroundColor Green
        Write-Host "     Scraping endpoint: http://localhost:$Port/metrics" -ForegroundColor Cyan
    }
}
