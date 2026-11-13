<#
.SYNOPSIS
    Stops any running instances of Prometheus server.
#>

$processes = Get-Process prometheus -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($p in $processes) {
        Write-Host "Stopping prometheus (PID: $($p.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "[OK] Stopped prometheus." -ForegroundColor Green
} else {
    Write-Host "[INFO] No prometheus processes are currently running." -ForegroundColor Cyan
}
