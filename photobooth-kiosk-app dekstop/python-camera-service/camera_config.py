"""Baca/tulis exposure settings DSLR via gphoto2."""

from __future__ import annotations

import logging
import re
from typing import Any

try:
    import gphoto2 as gp

    GP_AVAILABLE = True
except ImportError:
    GP_AVAILABLE = False

MODE_KEY_ALIASES = (
    "autoexposuremode",
    "exposuremode",
    "shootingmode",
    "ae mode",
    "drivemode",
)

ISO_KEY_ALIASES = ("iso", "isospeed", "iso speed")
APERTURE_KEY_ALIASES = ("aperture", "f-number", "fnumber", "f number")
SHUTTER_KEY_ALIASES = ("shutterspeed", "shutter speed", "exposuretime", "exposure time")


def _normalize_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def _matches_alias(name: str, aliases: tuple[str, ...]) -> bool:
    normalized = _normalize_key(name)
    return any(_normalize_key(alias) == normalized for alias in aliases)


def _find_widget(root, aliases: tuple[str, ...]):
    if root is None:
        return None
    try:
        if _matches_alias(root.get_name(), aliases):
            return root
    except Exception:
        pass

    try:
        child_count = root.count_children()
    except Exception:
        return None

    for index in range(child_count):
        try:
            child = root.get_child(index)
        except Exception:
            continue
        found = _find_widget(child, aliases)
        if found is not None:
            return found
    return None


def _widget_payload(widget) -> dict[str, Any]:
    if widget is None:
        return {"value": None, "choices": []}

    value = None
    choices: list[str] = []

    try:
        value = widget.get_value()
    except Exception as exc:
        logging.debug("Gagal baca nilai widget: %s", exc)

    try:
        raw_choices = widget.get_choices() or []
        choices = [str(choice) for choice in raw_choices]
    except Exception as exc:
        logging.debug("Gagal baca pilihan widget: %s", exc)

    return {
        "value": None if value is None else str(value),
        "choices": choices,
    }


def _parse_shoot_mode(raw: str | None) -> tuple[str, str]:
    if not raw:
        return "—", "Tidak diketahui"

    text = str(raw).strip()
    lower = text.lower()

    if lower in {"m", "manual"} or "manual" in lower:
        return "M", text
    if lower in {"tv", "t", "time value"} or "shutter priority" in lower or "time value" in lower:
        return "Tv", text
    if lower in {"av", "a", "aperture value"} or "aperture priority" in lower or "aperture value" in lower:
        return "Av", text
    if lower in {"p", "program"} or lower.startswith("program"):
        return "P", text
    if "bulb" in lower:
        return "B", text
    if "auto" in lower:
        return "Auto", text

    token = re.split(r"[\s(]", text)[0]
    if token:
        return token[:4], text
    return "—", text


def _simulated_settings() -> dict[str, Any]:
    return {
        "status": "success",
        "connected": False,
        "simulated": True,
        "shoot_mode": "M",
        "shoot_mode_raw": "Manual (simulasi)",
        "shoot_mode_label": "Manual",
        "is_manual": True,
        "iso": {"value": "400", "choices": ["100", "200", "400", "800", "1600"]},
        "aperture": {"value": "5.6", "choices": ["4.0", "4.5", "5.0", "5.6", "6.3", "7.1", "8.0"]},
        "shutter": {"value": "1/125", "choices": ["1/60", "1/80", "1/100", "1/125", "1/160", "1/200"]},
        "editable": False,
        "message": "Mode simulasi — sambungkan kamera DSLR untuk kontrol exposure nyata.",
    }


def read_camera_settings(camera, context, *, connected: bool) -> dict[str, Any]:
    if not GP_AVAILABLE or not connected or camera is None:
        return _simulated_settings()

    try:
        config = camera.get_config(context)
    except Exception as exc:
        logging.error("Gagal membaca config kamera: %s", exc)
        payload = _simulated_settings()
        payload["message"] = f"Gagal membaca config kamera: {exc}"
        return payload

    mode_widget = _find_widget(config, MODE_KEY_ALIASES)
    iso_widget = _find_widget(config, ISO_KEY_ALIASES)
    aperture_widget = _find_widget(config, APERTURE_KEY_ALIASES)
    shutter_widget = _find_widget(config, SHUTTER_KEY_ALIASES)

    mode_raw = None
    if mode_widget is not None:
        try:
            mode_raw = mode_widget.get_value()
        except Exception:
            mode_raw = None

    shoot_code, shoot_label = _parse_shoot_mode(
        None if mode_raw is None else str(mode_raw),
    )
    is_manual = shoot_code == "M"

    return {
        "status": "success",
        "connected": True,
        "simulated": False,
        "shoot_mode": shoot_code,
        "shoot_mode_raw": None if mode_raw is None else str(mode_raw),
        "shoot_mode_label": shoot_label,
        "is_manual": is_manual,
        "iso": _widget_payload(iso_widget),
        "aperture": _widget_payload(aperture_widget),
        "shutter": _widget_payload(shutter_widget),
        "editable": is_manual,
        "message": None
        if is_manual
        else "Kontrol ISO / F / Shutter hanya tersedia saat mode kamera Manual (M).",
    }


def _set_widget_value(widget, value: str) -> None:
    if widget is None:
        raise ValueError("Pengaturan kamera tidak ditemukan di perangkat ini.")
    widget.set_value(value)


def update_camera_settings(
    camera,
    context,
    *,
    connected: bool,
    iso: str | None = None,
    aperture: str | None = None,
    shutter: str | None = None,
) -> dict[str, Any]:
    if not GP_AVAILABLE or not connected or camera is None:
        raise ValueError("Kamera tidak terhubung.")

    if not any([iso, aperture, shutter]):
        raise ValueError("Tidak ada pengaturan yang diubah.")

    config = camera.get_config(context)
    current = read_camera_settings(camera, context, connected=True)
    if not current.get("is_manual"):
        raise ValueError(
            "Kamera tidak dalam mode Manual (M). Ubah mode di body kamera terlebih dahulu.",
        )

    iso_widget = _find_widget(config, ISO_KEY_ALIASES)
    aperture_widget = _find_widget(config, APERTURE_KEY_ALIASES)
    shutter_widget = _find_widget(config, SHUTTER_KEY_ALIASES)

    if iso is not None:
        _set_widget_value(iso_widget, iso)
    if aperture is not None:
        _set_widget_value(aperture_widget, aperture)
    if shutter is not None:
        _set_widget_value(shutter_widget, shutter)

    camera.set_config(config, context)
    logging.info(
        "Camera settings updated: iso=%s aperture=%s shutter=%s",
        iso,
        aperture,
        shutter,
    )
    return read_camera_settings(camera, context, connected=True)
