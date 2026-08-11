"""Adapter Windows untuk digiCamControl webserver (localhost:5513)."""

from __future__ import annotations

import io
import logging
import os
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DCC_BASE = os.getenv("DIGICAMCONTROL_URL", "http://127.0.0.1:5513").rstrip("/")
DCC_TIMEOUT = float(os.getenv("DIGICAMCONTROL_TIMEOUT", "4"))

_live_view_started = False


def _get(path: str, timeout: float | None = None) -> bytes:
    url = path if path.startswith("http") else f"{DCC_BASE}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "SelftFoto-Kiosk"})
    with urllib.request.urlopen(req, timeout=timeout or DCC_TIMEOUT) as res:
        return res.read()


def _get_text(path: str, timeout: float | None = None) -> str:
    return _get(path, timeout=timeout).decode("utf-8", errors="replace").strip()


def is_available() -> bool:
    try:
        _get("/", timeout=1.5)
        return True
    except Exception:
        return False


def start_live_view() -> bool:
    global _live_view_started
    try:
        _get("/?CMD=LiveViewWnd_Show", timeout=3)
        try:
            _get("/?CMD=All_Minimize", timeout=2)
        except Exception:
            pass
        _live_view_started = True
        return True
    except Exception as exc:
        logging.warning("Gagal start live view digiCamControl: %s", exc)
        return False


def get_live_view_frame() -> bytes | None:
    global _live_view_started
    if not _live_view_started:
        start_live_view()
    try:
        data = _get("/liveview.jpg", timeout=2)
        if data and data[:2] == b"\xff\xd8":
            return data
        if not _live_view_started:
            return None
        start_live_view()
        data = _get("/liveview.jpg", timeout=2)
        return data if data and data[:2] == b"\xff\xd8" else None
    except Exception:
        _live_view_started = False
        return None


def get_camera_name() -> str | None:
    try:
        name = _get_text("/?slc=get&param1=camera", timeout=2)
        if name and name not in {"-", "OK", "null", "None"}:
            return name
    except Exception:
        pass
    return None


def capture_to_file(dest_dir: str) -> str:
    os.makedirs(dest_dir, exist_ok=True)
    before = _safe_last_captured()

    try:
        _get("/?slc=capture", timeout=8)
    except Exception:
        _get("/?CMD=Capture", timeout=8)

    last_name = _wait_for_new_capture(before)
    image_bytes = _download_captured(last_name)
    if not image_bytes:
        raise RuntimeError("digiCamControl capture berhasil, tetapi file foto tidak ditemukan.")

    ext = Path(last_name).suffix.lower() if last_name else ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}:
        ext = ".jpg"
    dest = os.path.join(dest_dir, f"dcc_{int(time.time())}{ext}")
    with open(dest, "wb") as handle:
        handle.write(image_bytes)
    return dest


def copy_session_file(last_name: str, dest_dir: str) -> str | None:
    session_folder = _safe_get("session.folder")
    if not session_folder or not last_name:
        return None
    src = os.path.join(session_folder, last_name)
    if not os.path.isfile(src):
        return None
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, f"dcc_{int(time.time())}{Path(last_name).suffix}")
    shutil.copy2(src, dest)
    return dest


def _safe_get(param: str) -> str | None:
    try:
        value = _get_text(f"/?slc=get&param1={urllib.parse.quote(param)}", timeout=2)
        if value and value not in {"-", "OK"}:
            return value
    except Exception:
        return None
    return None


def _safe_last_captured() -> str:
    return _safe_get("lastcaptured") or ""


def _wait_for_new_capture(before: str, timeout_sec: float = 12.0) -> str | None:
    deadline = time.time() + timeout_sec
    last = before
    while time.time() < deadline:
        current = _safe_last_captured()
        if current and current not in {"-", before}:
            return current
        last = current or last
        time.sleep(0.25)
    return last if last and last not in {"-", before} else None


def _download_captured(last_name: str | None) -> bytes | None:
    candidates = []
    if last_name:
        encoded = urllib.parse.quote(last_name)
        candidates.extend([f"/image/{encoded}", f"/preview.jpg"])
    else:
        candidates.append("/preview.jpg")

    for path in candidates:
        try:
            data = _get(path, timeout=6)
            if data and (data[:2] == b"\xff\xd8" or data[:8] == b"\x89PNG\r\n\x1a\n"):
                return data
        except Exception:
            continue

    if last_name:
        copied = copy_session_file(last_name, os.path.join(os.getcwd(), "captured_photos"))
        if copied and os.path.isfile(copied):
            with open(copied, "rb") as handle:
                return handle.read()
    return None
