# ============================================================================
# SentinelOps — Grafana Loki Windows Installation Script
# Downloads and extracts Loki Windows 64-bit binary to infrastructure/loki/bin
# ============================================================================

$ErrorActionPreference = "Stop"

$LokiVersion = "3.0.0"
$DownloadUrl = "https://github.com/grafana/loki/releases/download/v${LokiVersion}/loki-windows-amd64.exe.zip"
$TargetDir = Join-Path $PSScriptRoot "..\infrastructure\loki\bin"
$ZipFile = Join-Path $TargetDir "loki.zip"
$ExeFile = Join-Path $TargetDir "loki.exe"

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$DataDir = Join-Path $PSScriptRoot "..\infrastructure\loki\data"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

if (Test-Path $ExeFile) {
    Write-Host "[+] Loki executable already present at: $ExeFile" -ForegroundColor Green
    exit 0
}

Write-Host "[*] Downloading Grafana Loki v${LokiVersion} for Windows (AMD64)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipFile -UseBasicParsing

Write-Host "[*] Extracting archive..." -ForegroundColor Cyan
Expand-Archive -Path $ZipFile -DestinationPath $TargetDir -Force
Remove-Item -Path $ZipFile -Force

# Rename extracted executable to loki.exe if needed
$ExtractedExe = Get-ChildItem -Path $TargetDir -Filter "*loki*amd64*.exe" | Select-Object -First 1
if ($ExtractedExe) {
    Rename-Item -Path $ExtractedExe.FullName -NewName "loki.exe" -Force
}

if (Test-Path $ExeFile) {
    Write-Host "[+] Successfully installed Grafana Loki to: $ExeFile" -ForegroundColor Green
} else {
    Write-Error "[-] Installation verification failed: loki.exe not found."
}

