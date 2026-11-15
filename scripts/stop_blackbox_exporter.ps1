<#
.SYNOPSIS
    Stops any running instances of Blackbox Exporter.
#>

$processes = Get-Process blackbox_exporter -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($p in $processes) {
        Write-Host "Stopping blackbox_exporter (PID: $($p.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "[OK] Stopped blackbox_exporter." -ForegroundColor Green
} else {
    Write-Host "[INFO] No blackbox_exporter processes are currently running." -ForegroundColor Cyan
}

