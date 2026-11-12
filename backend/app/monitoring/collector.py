import os
import platform
import socket
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import psutil

from app.schemas.metrics import (
    CpuMetrics,
    MemoryMetrics,
    DiskPartitionMetrics,
    DiskMetrics,
    NetworkInterfaceMetrics,
    NetworkMetrics,
    SystemProcessMetrics,
    HostMetricsSnapshot,
)


class SystemMetricsCollector:
    """
    High-performance system telemetry collector utilizing psutil.
    Samples real host CPU, memory, storage partitions, network interfaces, and process state.
    Calculates dynamic transfer rates using stateful previous-tick measurements.
    """

    def __init__(self):
        self._last_net_time: Optional[float] = None
        self._last_net_bytes_sent: int = 0
        self._last_net_bytes_recv: int = 0
        self._host_name: str = socket.gethostname()
        self._platform_str: str = f"{platform.system()} {platform.release()} ({platform.machine()})"

        # Prime psutil cpu_percent non-blocking baseline
        psutil.cpu_percent(interval=None)
        psutil.cpu_percent(percpu=True)

    def collect_cpu(self) -> CpuMetrics:
        overall = psutil.cpu_percent(interval=None)
        per_cpu = psutil.cpu_percent(percpu=True)
        count_logical = psutil.cpu_count(logical=True) or 1
        count_physical = psutil.cpu_count(logical=False)

        load_1m, load_5m, load_15m = None, None, None
        if hasattr(os, "getloadavg"):
            try:
                load = os.getloadavg()
                load_1m, load_5m, load_15m = round(load[0], 2), round(load[1], 2), round(load[2], 2)
            except (OSError, AttributeError):
                pass

        ctx_switches = None
        try:
            cpu_stats = psutil.cpu_stats()
            ctx_switches = cpu_stats.ctx_switches
        except Exception:
            pass

        return CpuMetrics(
            overall_percent=round(overall, 1),
            per_cpu_percent=[round(p, 1) for p in per_cpu],
            count_physical=count_physical,
            count_logical=count_logical,
            load_avg_1m=load_1m,
            load_avg_5m=load_5m,
            load_avg_15m=load_15m,
            ctx_switches=ctx_switches,
        )

    def collect_memory(self) -> MemoryMetrics:
        vm = psutil.virtual_memory()
        swap = psutil.swap_memory()

        return MemoryMetrics(
            total_bytes=vm.total,
            available_bytes=vm.available,
            used_bytes=vm.used,
            free_bytes=vm.free,
            percent=round(vm.percent, 1),
            swap_total_bytes=swap.total,
            swap_used_bytes=swap.used,
            swap_percent=round(swap.percent, 1),
        )

    def collect_disk(self) -> DiskMetrics:
        partitions_list = []
        try:
            partitions = psutil.disk_partitions(all=False)
            for part in partitions:
                # Filter out cdrom/empty drives on Windows or pseudo-filesystems
                if "cdrom" in part.opts or part.fstype == "":
                    continue
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    partitions_list.append(
                        DiskPartitionMetrics(
                            device=part.device,
                            mountpoint=part.mountpoint,
                            fstype=part.fstype,
                            total_bytes=usage.total,
                            used_bytes=usage.used,
                            free_bytes=usage.free,
                            percent=round(usage.percent, 1),
                        )
                    )
                except (PermissionError, OSError):
                    continue
        except Exception:
            pass

        read_bytes, write_bytes, read_count, write_count = 0, 0, 0, 0
        try:
            io_counters = psutil.disk_io_counters()
            if io_counters:
                read_bytes = io_counters.read_bytes
                write_bytes = io_counters.write_bytes
                read_count = io_counters.read_count
                write_count = io_counters.write_count
        except Exception:
            pass

        return DiskMetrics(
            partitions=partitions_list,
            read_bytes=read_bytes,
            write_bytes=write_bytes,
            read_count=read_count,
            write_count=write_count,
        )

    def collect_network(self) -> NetworkMetrics:
        net_io = psutil.net_io_counters(pernic=True)
        interfaces = []
        total_sent = 0
        total_recv = 0

        for iface_name, counters in net_io.items():
            total_sent += counters.bytes_sent
            total_recv += counters.bytes_recv
            interfaces.append(
                NetworkInterfaceMetrics(
                    interface=iface_name,
                    bytes_sent=counters.bytes_sent,
                    bytes_recv=counters.bytes_recv,
                    packets_sent=counters.packets_sent,
                    packets_recv=counters.packets_recv,
                    errin=counters.errin,
                    errout=counters.errout,
                    dropin=counters.dropin,
                    dropout=counters.dropout,
                )
            )

        now = time.perf_counter()
        sent_rate = 0.0
        recv_rate = 0.0

        if self._last_net_time is not None:
            dt = now - self._last_net_time
            if dt > 0:
                sent_diff = max(0, total_sent - self._last_net_bytes_sent)
                recv_diff = max(0, total_recv - self._last_net_bytes_recv)
                sent_rate = round(sent_diff / dt, 2)
                recv_rate = round(recv_diff / dt, 2)

        self._last_net_time = now
        self._last_net_bytes_sent = total_sent
        self._last_net_bytes_recv = total_recv

        return NetworkMetrics(
            interfaces=interfaces,
            total_bytes_sent=total_sent,
            total_bytes_recv=total_recv,
            bytes_sent_rate_per_sec=sent_rate,
            bytes_recv_rate_per_sec=recv_rate,
        )

    def collect_system(self) -> SystemProcessMetrics:
        process_count = len(psutil.pids())
        boot_timestamp = psutil.boot_time()
        uptime_seconds = round(time.time() - boot_timestamp, 1)

        return SystemProcessMetrics(
            process_count=process_count,
            thread_count=None,
            boot_time=datetime.fromtimestamp(boot_timestamp, timezone.utc),
            uptime_seconds=uptime_seconds,
        )

    def snapshot(self) -> HostMetricsSnapshot:
        """Takes a complete instantaneous telemetry snapshot."""
        return HostMetricsSnapshot(
            timestamp=datetime.now(timezone.utc),
            host_name=self._host_name,
            platform=self._platform_str,
            cpu=self.collect_cpu(),
            memory=self.collect_memory(),
            disk=self.collect_disk(),
            network=self.collect_network(),
            system=self.collect_system(),
        )


metrics_collector = SystemMetricsCollector()
