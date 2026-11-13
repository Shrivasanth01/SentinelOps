<#
.SYNOPSIS
    Downloads and extracts Prometheus for standalone local Windows execution.
.DESCRIPTION
    For development environments without Docker Desktop, downloads the official Prometheus
    Windows release (v2.53.3) into infrastructure/prometheus/bin.
#>

[CmdletBinding()]
param(
    [string]$Version = "2.53.3",
    [string]$TargetDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $TargetDir) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
    $TargetDir = Join-Path $RepoRoot "infrastructure\prometheus\bin"
}

$ResolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
if (-not (Test-Path -Path $ResolvedTargetDir)) {
    New-Item -ItemType Directory -Path $ResolvedTargetDir -Force | Out-Null
}

$ExePath = Join-Path $ResolvedTargetDir "prometheus.exe"
if (Test-Path -Path $ExePath) {
    Write-Host "[OK] Prometheus already present at: $ExePath" -ForegroundColor Green
    exit 0
}

$ZipUrl = "https://github.com/prometheus/prometheus/releases/download/v$Version/prometheus-$Version.windows-amd64.zip"
$ZipPath = Join-Path $ResolvedTargetDir "prometheus-$Version.zip"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Downloading Prometheus v$Version for Windows Standalone         " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "URL: $ZipUrl" -ForegroundColor Gray

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing

Write-Host "[INFO] Extracting archive..." -ForegroundColor Yellow
$ExtractTemp = Join-Path $ResolvedTargetDir "temp_extract"
Expand-Archive -Path $ZipPath -DestinationPath $ExtractTemp -Force

$SubFolder = Join-Path $ExtractTemp "prometheus-$Version.windows-amd64"
if (Test-Path -Path (Join-Path $SubFolder "prometheus.exe")) {
    Copy-Item -Path (Join-Path $SubFolder "prometheus.exe") -Destination $ExePath -Force
    if (Test-Path -Path (Join-Path $SubFolder "promtool.exe")) {
        Copy-Item -Path (Join-Path $SubFolder "promtool.exe") -Destination (Join-Path $ResolvedTargetDir "promtool.exe") -Force
    }
}

# Cleanup zip and temp
Remove-Item -Path $ExtractTemp -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Prometheus ready at: $ExePath" -ForegroundColor Green
