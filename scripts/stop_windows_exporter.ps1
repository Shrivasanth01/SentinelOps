<#
.SYNOPSIS
    Stops any running instances of Windows Exporter.
#>

$processes = Get-Process windows_exporter -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($p in $processes) {
        Write-Host "Stopping windows_exporter (PID: $($p.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "[OK] Stopped windows_exporter." -ForegroundColor Green
} else {
    Write-Host "[INFO] No windows_exporter processes are currently running." -ForegroundColor Cyan
}
