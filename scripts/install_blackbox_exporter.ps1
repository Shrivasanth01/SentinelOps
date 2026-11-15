<#
.SYNOPSIS
    Downloads and extracts Prometheus Blackbox Exporter for standalone local Windows execution.
.DESCRIPTION
    Downloads official blackbox_exporter release (v0.25.0) into infrastructure/blackbox_exporter/bin.
#>

[CmdletBinding()]
param(
    [string]$Version = "0.25.0",
    [string]$TargetDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
    $TargetDir = Join-Path $RepoRoot "infrastructure\blackbox_exporter\bin"
}

$ResolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
if (-not (Test-Path -Path $ResolvedTargetDir)) {
    New-Item -ItemType Directory -Path $ResolvedTargetDir -Force | Out-Null
}

$ExePath = Join-Path $ResolvedTargetDir "blackbox_exporter.exe"
if (Test-Path -Path $ExePath) {
    Write-Host "[OK] Blackbox Exporter already present at: $ExePath" -ForegroundColor Green
    exit 0
}

$TarUrl = "https://github.com/prometheus/blackbox_exporter/releases/download/v$Version/blackbox_exporter-$Version.windows-amd64.tar.gz"
$TarPath = Join-Path $ResolvedTargetDir "blackbox_exporter-$Version.tar.gz"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Downloading Blackbox Exporter v$Version for Windows             " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "URL: $TarUrl" -ForegroundColor Gray

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
Invoke-WebRequest -Uri $TarUrl -OutFile $TarPath -UseBasicParsing

Write-Host "[INFO] Extracting archive..." -ForegroundColor Yellow
$ExtractTemp = Join-Path $ResolvedTargetDir "temp_extract"
if (-not (Test-Path -Path $ExtractTemp)) {
    New-Item -ItemType Directory -Path $ExtractTemp -Force | Out-Null
}

tar -zxvf $TarPath -C $ExtractTemp
$SubFolder = Join-Path $ExtractTemp "blackbox_exporter-$Version.windows-amd64"
if (Test-Path -Path (Join-Path $SubFolder "blackbox_exporter.exe")) {
    Copy-Item -Path (Join-Path $SubFolder "blackbox_exporter.exe") -Destination $ExePath -Force
}

# Cleanup
Remove-Item -Path $ExtractTemp -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TarPath -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Blackbox Exporter ready at: $ExePath" -ForegroundColor Green
