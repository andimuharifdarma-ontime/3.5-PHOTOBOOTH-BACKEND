"""Windows printer helpers (Windows 10 / 11). Used when CUPS `lp` is unavailable."""

from __future__ import annotations

import json
import logging
import subprocess
from typing import Any

IS_WIN32 = True

try:
    import win32api
    import win32print

    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False


def _status_label(raw_status: int) -> str:
    if not WIN32_AVAILABLE:
        return "unknown"
    mapping = {
        win32print.PRINTER_STATUS_IDLE: "idle",
        win32print.PRINTER_STATUS_PRINTING: "printing",
        win32print.PRINTER_STATUS_OFFLINE: "offline",
        win32print.PRINTER_STATUS_PAPER_OUT: "paper_out",
        win32print.PRINTER_STATUS_ERROR: "error",
        win32print.PRINTER_STATUS_PAUSED: "paused",
    }
    for flag, label in mapping.items():
        if raw_status & flag:
            return label
    return "idle" if raw_status == 0 else "unknown"


def _is_online(raw_status: int) -> bool:
    if not WIN32_AVAILABLE:
        return True
    offline_flags = (
        win32print.PRINTER_STATUS_OFFLINE
        | win32print.PRINTER_STATUS_ERROR
        | win32print.PRINTER_STATUS_PAPER_JAM
        | win32print.PRINTER_STATUS_PAPER_PROBLEM
    )
    return (raw_status & offline_flags) == 0


def get_printers() -> dict[str, Any]:
    default_printer = ""
    printers: list[dict[str, Any]] = []

    if WIN32_AVAILABLE:
        try:
            default_printer = win32print.GetDefaultPrinter()
        except Exception:
            default_printer = ""

        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        try:
            for _flags, _desc, name, _comment in win32print.EnumPrinters(flags):
                status_code = 0
                hardware_status = "unknown"
                try:
                    handle = win32print.OpenPrinter(name)
                    try:
                        info = win32print.GetPrinter(handle, 2)
                        status_code = int(info.get("Status") or 0)
                        hardware_status = _status_label(status_code)
                    finally:
                        win32print.ClosePrinter(handle)
                except Exception as exc:
                    logging.warning("Gagal membaca status printer %s: %s", name, exc)

                is_online = _is_online(status_code)
                printers.append(
                    {
                        "name": name,
                        "status": hardware_status,
                        "hardware_status": hardware_status,
                        "device_uri": "",
                        "is_default": name == default_printer,
                        "is_online": is_online,
                        "details": f"Windows printer ({hardware_status})",
                    }
                )
        except Exception as exc:
            logging.error("EnumPrinters gagal: %s", exc)
    else:
        try:
            script = (
                "Get-Printer | Select-Object Name, PrinterStatus, Default | ConvertTo-Json -Compress"
            )
            out = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command", script],
                text=True,
                stderr=subprocess.STDOUT,
                timeout=15,
            )
            payload = json.loads(out or "[]")
            if isinstance(payload, dict):
                payload = [payload]
            for item in payload:
                name = item.get("Name") or ""
                if not name:
                    continue
                if item.get("Default"):
                    default_printer = name
                printers.append(
                    {
                        "name": name,
                        "status": "idle",
                        "hardware_status": str(item.get("PrinterStatus") or "unknown"),
                        "device_uri": "",
                        "is_default": bool(item.get("Default")),
                        "is_online": True,
                        "details": "Windows printer (PowerShell)",
                    }
                )
        except Exception as exc:
            logging.error("PowerShell Get-Printer gagal: %s", exc)

    return {
        "status": "success",
        "default_printer": default_printer,
        "printers": printers,
    }


def dispatch_print(local_path: str, quantity: int, printer_name: str | None = None) -> None:
    if quantity < 1 or quantity > 20:
        raise ValueError("Quantity must be between 1 and 20")

    target = printer_name
    if WIN32_AVAILABLE:
        if not target:
            target = win32print.GetDefaultPrinter()
        for _ in range(quantity):
            win32api.ShellExecute(0, "printto", local_path, f'"{target}"', ".", 0)
        return

    args = ["powershell", "-NoProfile", "-Command"]
    for _ in range(quantity):
        if printer_name:
            cmd = (
                f'Start-Process -FilePath "{local_path}" '
                f'-Verb PrintTo -ArgumentList "{printer_name}"'
            )
        else:
            cmd = f'Start-Process -FilePath "{local_path}" -Verb Print'
        result = subprocess.run(args + [cmd], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr or result.stdout or "Gagal mencetak via PowerShell")
