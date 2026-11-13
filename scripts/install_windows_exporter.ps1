<#
.SYNOPSIS
    Installs and configures Windows Exporter for SentinelOps real-time host monitoring.
.DESCRIPTION
    Downloads the official windows_exporter binary (v0.32.1), places it in infrastructure/windows_exporter,
    and configures Windows Firewall to allow scrape traffic on port 9182 restricted to the local development environment.
#>

[CmdletBinding()]
param(
    [string]$Version = "0.32.1",
    [string]$TargetDir = "",
    [int]$Port = 9182
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
    $TargetDir = Join-Path $RepoRoot "infrastructure\windows_exporter"
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " SentinelOps — Windows Exporter Installer (Phase 2 Telemetry)   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Ensure target directory exists
$ResolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
if (-not (Test-Path -Path $ResolvedTargetDir)) {
    Write-Host "[INFO] Creating directory: $ResolvedTargetDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ResolvedTargetDir -Force | Out-Null
}

$ExePath = Join-Path $ResolvedTargetDir "windows_exporter.exe"
$DownloadUrl = "https://github.com/prometheus-community/windows_exporter/releases/download/v$Version/windows_exporter-$Version-amd64.exe"

# 2. Download windows_exporter if not already present
if (Test-Path -Path $ExePath) {
    Write-Host "[OK] windows_exporter.exe already present at: $ExePath" -ForegroundColor Green
} else {
    Write-Host "[INFO] Downloading windows_exporter v$Version from:" -ForegroundColor Yellow
    Write-Host "       $DownloadUrl" -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing
        Write-Host "[OK] Downloaded successfully to $ExePath" -ForegroundColor Green
    } catch {
        Write-Error "Failed to download windows_exporter: $_"
        exit 1
    }
}

# 3. Configure Windows Firewall (Restricted to Localhost / Local Subnet)
Write-Host "`n[INFO] Checking Windows Firewall rule for TCP Port $Port..." -ForegroundColor Yellow
$RuleName = "SentinelOps-WindowsExporter-9182"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    try {
        $existingRule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
        if ($existingRule) {
            Write-Host "[OK] Firewall rule '$RuleName' already exists." -ForegroundColor Green
        } else {
            New-NetFirewallRule -DisplayName $RuleName `
                                -Direction Inbound `
                                -Action Allow `
                                -Protocol TCP `
                                -LocalPort $Port `
                                -RemoteAddress 127.0.0.1, 172.16.0.0/12, 10.0.0.0/8, 192.168.0.0/16, LocalSubnet `
                                -Description "SentinelOps Windows Exporter Scrape Port restricted to local dev" | Out-Null
            Write-Host "[OK] Firewall rule created and restricted to local development addresses." -ForegroundColor Green
        }
    } catch {
        Write-Warning "Could not configure firewall rule automatically: $_"
    }
} else {
    Write-Host "[NOTICE] Not running as Administrator. To restrict port $Port via Windows Firewall, run in an elevated PowerShell:" -ForegroundColor Yellow
    Write-Host "  New-NetFirewallRule -DisplayName '$RuleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -RemoteAddress 127.0.0.1,LocalSubnet" -ForegroundColor Gray
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " Installation Complete!                                          " -ForegroundColor Green
Write-Host " To start the exporter, run:                                     " -ForegroundColor Cyan
Write-Host "   .\scripts\start_windows_exporter.ps1                         " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
