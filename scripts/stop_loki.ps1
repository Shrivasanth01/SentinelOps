# ============================================================================
# SentinelOps — Stop Grafana Loki Daemon
# ============================================================================

$Running = Get-Process -Name "loki" -ErrorAction SilentlyContinue
if ($Running) {
    Write-Host "[*] Stopping Grafana Loki process (PID: $($Running.Id))..." -ForegroundColor Cyan
    Stop-Process -Id $Running.Id -Force
    Write-Host "[+] Grafana Loki stopped successfully." -ForegroundColor Green
} else {
    Write-Host "[i] No active Grafana Loki process found." -ForegroundColor Gray
}

