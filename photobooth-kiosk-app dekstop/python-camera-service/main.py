import os
import io
import time
import math
import json
import platform
import urllib.request
import tempfile
from contextlib import asynccontextmanager
import subprocess
import shlex
from urllib.parse import urlparse
from fastapi import FastAPI, Response, HTTPException, Header, Depends, UploadFile, File
from starlette.background import BackgroundTask
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import threading
import logging
from collections import deque

import camera_config
import digicamcontrol

try:
    from PIL import Image, ImageDraw
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Konfigurasi Logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# -- Variabel Global State Kamera --
camera_connected = False
camera = None
context = None
camera_connection_error: str | None = None
camera_model: str | None = None
camera_backend: str = "none"
capture_lock = threading.Lock()

# Buffer rolling untuk Live Photo (tampung hingga 15 detik pada ~20 FPS)
live_view_buffer = deque(maxlen=300)
sim_frame_index = 0

def generate_simulated_frame():
    global sim_frame_index
    sim_frame_index += 1
    width, height = 1280, 960
    
    if not PIL_AVAILABLE:
        return b"dummy_mjpeg_frame"
        
    try:
        img = Image.new("RGB", (width, height))
        draw = ImageDraw.Draw(img)
        
        # Gradasi warna gelap mewah (violet ke pink)
        for y in range(height):
            r = int(15 + 25 * (y / height) + 10 * math.sin(sim_frame_index * 0.1))
            g = int(10 + 15 * (1 - y / height))
            b = int(35 + 40 * (y / height) + 15 * math.cos(sim_frame_index * 0.1))
            draw.line([(0, y), (width, y)], fill=(r, g, b))
            
        # Orb mengambang 1 (Ungu)
        orb_x = int(width / 2 + 150 * math.cos(sim_frame_index * 0.08))
        orb_y = int(height / 2 + 100 * math.sin(sim_frame_index * 0.12))
        orb_radius = 45 + int(5 * math.sin(sim_frame_index * 0.2))
        
        for r_offset in range(15, 0, -3):
            alpha_color = (139 + r_offset * 5, 92, 246)
            draw.ellipse(
                [orb_x - orb_radius - r_offset, orb_y - orb_radius - r_offset, 
                 orb_x + orb_radius + r_offset, orb_y + orb_radius + r_offset],
                fill=alpha_color
            )
            
        # Orb mengambang 2 (Pink)
        orb2_x = int(width / 2 + 180 * math.cos(sim_frame_index * 0.05 + math.pi))
        orb2_y = int(height / 2 + 80 * math.sin(sim_frame_index * 0.07))
        draw.ellipse(
            [orb2_x - 30, orb2_y - 30, orb2_x + 30, orb2_y + 30],
            fill=(236, 72, 153)
        )

        # Indikator teks premium
        draw.text((24, 24), "LIVE PREVIEW (SIMULATED)", fill=(255, 255, 255))
        draw.text((24, height - 36), f"DOVELENS KIOSK STUDIO - FRAME {sim_frame_index}", fill=(156, 163, 175))
        
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception as e:
        logging.error(f"Gagal membuat frame simulasi: {e}")
        return b"dummy_mjpeg_frame"

def save_live_photo(frames_with_time, output_path):
    if not frames_with_time:
        logging.warning("Buffer Live Photo kosong, dilewati.")
        return
        
    try:
        import cv2
        import numpy as np
        
        # Ekstrak frame_bytes dan timestamp
        frames = []
        times = []
        for item in frames_with_time:
            if isinstance(item, tuple) and len(item) == 2:
                times.append(item[0])
                frames.append(item[1])
            else:
                frames.append(item)
                
        if not frames:
            logging.warning("Buffer Live Photo kosong setelah diekstrak, dilewati.")
            return

        if times and len(times) == len(frames):
            paired = sorted(zip(times, frames), key=lambda p: p[0])
            times = [p[0] for p in paired]
            frames = [p[1] for p in paired]

        # Tentukan FPS dinamis
        fps = 10.0 # Default fallback
        if len(times) > 1:
            total_duration = times[-1] - times[0]
            if total_duration > 0:
                fps = len(times) / total_duration
                # Batasi FPS dalam rentang wajar (misal 5 - 30 FPS)
                fps = max(5.0, min(fps, 30.0))
                
        logging.info(f"Menyimpan Live Photo: {len(frames)} frame, estimasi durasi {times[-1] - times[0]:.2f}s, dihitung FPS: {fps:.2f}")

        # Decode the first frame to get size
        first_frame = cv2.imdecode(np.frombuffer(frames[0], dtype=np.uint8), cv2.IMREAD_COLOR)
        if first_frame is None:
            logging.error("Gagal mendecode frame JPEG pertama.")
            return
            
        height, width, _ = first_frame.shape
        
        # We try avc1 (H.264) codec first for browser-native HTML5 compatibility
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            logging.warning("Gagal membuka VideoWriter dengan codec avc1. Mencoba codec mp4v...")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
        if not out.isOpened():
            logging.error("Gagal membuka VideoWriter dengan mp4v.")
            return

        last_frame_data = first_frame
        out.write(first_frame)

        for f in frames[1:]:
            try:
                frame_data = cv2.imdecode(np.frombuffer(f, dtype=np.uint8), cv2.IMREAD_COLOR)
                if frame_data is not None:
                    out.write(frame_data)
                    last_frame_data = frame_data
            except Exception as e:
                logging.error(f"Error writing frame: {e}")

        # Tahan frame terakhir sebentar agar akhir Live Photo terasa natural (bukan putus mendadak)
        if last_frame_data is not None:
            hold_count = max(1, int(fps * 0.45))
            for _ in range(hold_count):
                out.write(last_frame_data)

        out.release()
        logging.info(f"Live Photo (MP4) disimpan ke: {output_path} dengan FPS {fps:.2f}")
    except Exception as ex:
        logging.error(f"Gagal menyimpan Live Photo ke MP4: {ex}")

try:
    import gphoto2 as gp
    GP_AVAILABLE = True
except ImportError:
    logging.warning("Library gphoto2 tidak ditemukan. Berjalan dalam mode Simulasi (Development Mode).")
    GP_AVAILABLE = False

def _parse_camera_model(summary_text: str) -> str | None:
    for line in summary_text.splitlines():
        stripped = line.strip()
        if stripped.lower().startswith("model:"):
            return stripped.split(":", 1)[1].strip()
    return None


def release_camera():
    global camera, context, camera_connected, camera_model, camera_backend
    if camera is not None:
        try:
            camera.exit(context)
        except Exception as exc:
            logging.warning("Gagal melepas kamera: %s", exc)
    camera = None
    context = None
    camera_connected = False
    camera_model = None
    camera_backend = "none"


def init_camera() -> bool:
    global camera, context, camera_connected, camera_connection_error, camera_model, camera_backend
    camera_connection_error = None
    camera_backend = "none"

    if platform.system() == "Windows" and digicamcontrol.is_available():
        release_camera()
        camera_connected = True
        camera_backend = "digicamcontrol"
        camera_model = digicamcontrol.get_camera_name() or "digiCamControl"
        digicamcontrol.start_live_view()
        logging.info("Kamera terhubung via digiCamControl (%s)", camera_model)
        return True

    if not GP_AVAILABLE:
        camera_connection_error = (
            "Kamera belum terhubung. Di Windows, buka digiCamControl dan pastikan http://localhost:5513 aktif."
            if platform.system() == "Windows"
            else "Library gphoto2 tidak tersedia."
        )
        release_camera()
        return False

    release_camera()

    # On macOS, kill ptpcamerad which automatically locks the USB camera
    import sys
    if sys.platform == "darwin":
        logging.info("macOS terdeteksi. Mencoba mematikan proses ptpcamerad bawaan Mac...")
        try:
            subprocess.run(["pkill", "-9", "-f", "ptpcamerad"], capture_output=True)
            time.sleep(1.0)
        except Exception as e:
            logging.error(f"Gagal mematikan ptpcamerad: {e}")

    try:
        logging.info("Mencoba menghubungkan ke kamera...")
        context = gp.gp_context_new()
        camera = gp.Camera()
        camera.init(context)
        camera_connected = True
        try:
            summary_text = str(camera.get_summary(context).text)
            camera_model = _parse_camera_model(summary_text)
        except Exception as exc:
            logging.warning("Gagal membaca summary kamera: %s", exc)
        logging.info(
            "Kamera berhasil terhubung%s!",
            f" ({camera_model})" if camera_model else "",
        )
        return True
    except gp.GPhoto2Error as ex:
        logging.error(f"Gagal menghubungkan kamera: {ex}")
        camera_connection_error = str(ex)
        release_camera()
        return False
    except Exception as ex:
        logging.error(f"Gagal menghubungkan kamera: {ex}")
        camera_connection_error = str(ex)
        release_camera()
        return False


def camera_status_payload() -> dict:
    dcc_available = platform.system() == "Windows" and digicamcontrol.is_available()
    if camera_connected:
        mode = "live"
    elif GP_AVAILABLE or dcc_available:
        mode = "simulation"
    else:
        mode = "unavailable"

    return {
        "camera_connected": camera_connected,
        "gphoto2_available": GP_AVAILABLE or dcc_available,
        "camera_model": camera_model,
        "connection_error": camera_connection_error,
        "mode": mode,
        "backend": camera_backend,
        "digicamcontrol": dcc_available,
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_camera()
    yield

app = FastAPI(title="Photobooth Camera Service", lifespan=lifespan)

KIOSK_ORIGINS = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
if extra_origin := os.getenv("KIOSK_FRONTEND_URL"):
    KIOSK_ORIGINS.append(extra_origin)

CAMERA_API_SECRET = os.getenv("CAMERA_API_SECRET", "dev-local-camera-secret")
CAPTURED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "captured_photos"))

def _allowed_download_hosts():
    hosts = {"localhost", "127.0.0.1"}
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    if supabase_url:
        parsed = urlparse(supabase_url)
        if parsed.hostname:
            hosts.add(parsed.hostname)
    return hosts

def verify_camera_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    if not CAMERA_API_SECRET or x_api_key != CAMERA_API_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

app.add_middleware(
    CORSMiddleware,
    allow_origins=KIOSK_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Buat folder jika belum ada agar StaticFiles tidak error
os.makedirs(CAPTURED_DIR, exist_ok=True)
app.mount("/photos", StaticFiles(directory=CAPTURED_DIR), name="photos")

@app.get("/status")
def get_status():
    return camera_status_payload()


@app.post("/camera/reconnect")
def reconnect_camera():
    with capture_lock:
        ok = init_camera()
        payload = camera_status_payload()
        payload["reconnected"] = ok
        if ok:
            payload["message"] = "Kamera berhasil terhubung."
        else:
            payload["message"] = (
                camera_connection_error
                or "Kamera tidak ditemukan. Pastikan USB terpasang dan kamera menyala."
            )
        return payload


class CameraSettingsUpdate(BaseModel):
    iso: str | None = None
    aperture: str | None = None
    shutter: str | None = None


@app.get("/camera/settings")
def get_camera_settings():
    with capture_lock:
        return camera_config.read_camera_settings(
            camera,
            context,
            connected=camera_connected,
        )


@app.put("/camera/settings")
def put_camera_settings(
    body: CameraSettingsUpdate,
    _: None = Depends(verify_camera_api_key),
):
    with capture_lock:
        try:
            return camera_config.update_camera_settings(
                camera,
                context,
                connected=camera_connected,
                iso=body.iso,
                aperture=body.aperture,
                shutter=body.shutter,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            logging.error("Gagal mengubah pengaturan kamera: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

def get_live_view_frame():
    """Mengambil satu frame dari kamera untuk Live View."""
    if camera_backend == "digicamcontrol":
        frame = digicamcontrol.get_live_view_frame()
        if frame:
            return frame
        return generate_simulated_frame()

    if not camera_connected or not GP_AVAILABLE:
        return generate_simulated_frame()
    
    with capture_lock:
        try:
            # Mengambil preview file dari kamera
            camera_file = camera.capture_preview()
            file_data = camera_file.get_data_and_size()
            return memoryview(file_data).tobytes()
        except gp.GPhoto2Error as ex:
            logging.error(f"Error mengambil live view: {ex}")
            return None

def mjpeg_generator():
    """Generator untuk mengirim MJPEG stream terus menerus."""
    while True:
        frame_bytes = get_live_view_frame()
        if frame_bytes is None:
            # Jika gagal, beri jeda sedikit lalu coba lagi
            time.sleep(0.5)
            continue
            
        # Simpan frame ke buffer rolling untuk Live Photo beserta timestamp-nya
        live_view_buffer.append((time.time(), frame_bytes))
            
        # Format batas multi-part untuk MJPEG
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.05) # ~20 FPS (Tergantung kecepatan USB kamera)

@app.get("/live-view")
def live_view():
    """Titik akhir untuk menampilkan Live View di tag <img> frontend."""
    return StreamingResponse(
        mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/capture")
def capture_photo(duration: float = 5.0):
    """Memicu jepretan kamera resolusi penuh."""
    global camera, context
    
    # Snapshot buffer live photo saat ini sebelum capture (saring sesuai durasi hitung mundur)
    current_time = time.time()
    cutoff_time = current_time - duration
    frames_snapshot = [f for f in list(live_view_buffer) if isinstance(f, tuple) and f[0] >= cutoff_time]
    timestamp = int(current_time)
    
    if camera_backend == "digicamcontrol":
        save_dir = os.path.join(os.getcwd(), "captured_photos")
        os.makedirs(save_dir, exist_ok=True)
        try:
            captured_path = digicamcontrol.capture_to_file(save_dir)
            filename_png = f"shot_{timestamp}.png"
            local_path_png = os.path.join(save_dir, filename_png)
            if PIL_AVAILABLE:
                img = Image.open(captured_path)
                img.save(local_path_png, format="PNG")
                try:
                    if os.path.abspath(captured_path) != os.path.abspath(local_path_png):
                        os.remove(captured_path)
                except Exception:
                    pass
            else:
                local_path_png = captured_path
                filename_png = os.path.basename(captured_path)

            filename_mp4 = f"shot_{timestamp}.mp4"
            local_path_mp4 = os.path.join(save_dir, filename_mp4)
            save_live_photo(frames_snapshot, local_path_mp4)
            return {
                "status": "success",
                "message": "Jepretan digiCamControl berhasil.",
                "filename": filename_png,
                "live_photo": filename_mp4,
                "local_path": local_path_png,
            }
        except Exception as exc:
            logging.error("Gagal capture digiCamControl: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not camera_connected or not GP_AVAILABLE:
        # Simulasi Capture
        logging.info("Simulasi Capture berjalan...")
        time.sleep(1)
        
        filename_png = f"shot_{timestamp}.png"
        save_dir = os.path.join(os.getcwd(), "captured_photos")
        os.makedirs(save_dir, exist_ok=True)
        local_path_png = os.path.join(save_dir, filename_png)
        
        # Simpan gambar statis simulasi (menggunakan frame terakhir dari buffer)
        frame_bytes = None
        if frames_snapshot:
            last_item = frames_snapshot[-1]
            if isinstance(last_item, tuple) and len(last_item) == 2:
                frame_bytes = last_item[1]
            else:
                frame_bytes = last_item
        
        if not frame_bytes:
            frame_bytes = generate_simulated_frame()
            
        if PIL_AVAILABLE:
            try:
                img = Image.open(io.BytesIO(frame_bytes))
                img.save(local_path_png, format="PNG")
                logging.info(f"Gambar simulasi (PNG) disimpan ke: {local_path_png}")
            except Exception as e:
                logging.error(f"Gagal mengonversi/menyimpan PNG simulasi: {e}")
                with open(local_path_png, "wb") as f:
                    f.write(frame_bytes)
        else:
            with open(local_path_png, "wb") as f:
                f.write(frame_bytes)
                
        # Simpan Live Photo (MP4)
        filename_mp4 = f"shot_{timestamp}.mp4"
        local_path_mp4 = os.path.join(save_dir, filename_mp4)
        save_live_photo(frames_snapshot, local_path_mp4)
        
        return {
            "status": "success",
            "message": "Simulasi jepretan berhasil.",
            "filename": filename_png,
            "live_photo": filename_mp4,
            "local_path": local_path_png
        }

    with capture_lock:
        try:
            logging.info("Mengambil gambar...")
            file_path = camera.capture(gp.GP_CAPTURE_IMAGE)
            logging.info(f"Gambar ditangkap, disimpan di memori kamera: {file_path.folder}/{file_path.name}")
            
            # Buat folder penyimpanan lokal jika belum ada
            save_dir = os.path.join(os.getcwd(), "captured_photos")
            os.makedirs(save_dir, exist_ok=True)
            
            # Unduh file dari kamera ke komputer
            temp_local_file_path = os.path.join(save_dir, file_path.name)
            camera_file = camera.file_get(file_path.folder, file_path.name, gp.GP_FILE_TYPE_NORMAL)
            camera_file.save(temp_local_file_path)
            logging.info(f"Gambar asli (JPEG) diunduh ke: {temp_local_file_path}")
            
            base_name, _ = os.path.splitext(file_path.name)
            filename_png = f"{base_name}.png"
            local_path_png = os.path.join(save_dir, filename_png)
            
            # Konversi JPEG ke PNG menggunakan PIL jika tersedia
            if PIL_AVAILABLE:
                try:
                    img = Image.open(temp_local_file_path)
                    img.save(local_path_png, format="PNG")
                    logging.info(f"Gambar berhasil dikonversi ke PNG: {local_path_png}")
                    try:
                        os.remove(temp_local_file_path)
                    except Exception as e:
                        logging.warning(f"Gagal menghapus file temp JPEG: {e}")
                except Exception as e:
                    logging.error(f"Gagal mengonversi JPEG ke PNG: {e}")
                    os.rename(temp_local_file_path, local_path_png)
            else:
                os.rename(temp_local_file_path, local_path_png)
            
            # Simpan Live Photo (MP4) menggunakan nama file dasar yang sama
            filename_mp4 = f"{base_name}.mp4"
            local_path_mp4 = os.path.join(save_dir, filename_mp4)
            save_live_photo(frames_snapshot, local_path_mp4)
            
            return {
                "status": "success",
                "message": "Gambar berhasil dijepret dan diunduh.",
                "filename": filename_png,
                "live_photo": filename_mp4,
                "local_path": local_path_png
            }
            
        except gp.GPhoto2Error as ex:
            logging.error(f"Error saat mengambil gambar: {ex}")
            raise HTTPException(status_code=500, detail=str(ex))

@app.get("/printers")
def get_printers():
    """Mendapatkan daftar printer yang terinstall beserta status koneksi fisik."""
    if platform.system() == "Windows":
        try:
            from windows_print import get_printers as windows_get_printers

            return windows_get_printers()
        except Exception as e:
            logging.error("Gagal mendapatkan printer Windows: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    def _get_printer_device_uris() -> dict[str, str]:
        mapping: dict[str, str] = {}
        try:
            out = subprocess.check_output(["lpstat", "-v"], text=True, stderr=subprocess.STDOUT)
            for line in out.split("\n"):
                if not line.startswith("device for "):
                    continue
                head, _, uri = line.partition(":")
                if not uri.strip():
                    continue
                queue_name = head.replace("device for ", "", 1).strip()
                mapping[queue_name] = uri.strip()
        except Exception as e:
            logging.warning(f"Gagal membaca device URI printer: {e}")
        return mapping

    def _get_macos_hardware_status() -> dict[str, dict]:
        """Status perangkat nyata dari macOS (bukan hanya antrian CUPS idle)."""
        by_uri: dict[str, dict] = {}
        by_name: dict[str, dict] = {}
        try:
            out = subprocess.check_output(
                ["system_profiler", "SPPrintersDataType", "-json"],
                text=True,
                stderr=subprocess.DEVNULL,
                timeout=10,
            )
            for item in json.loads(out).get("SPPrintersDataType", []):
                uri = (item.get("uri") or "").strip()
                display_name = (item.get("_name") or "").strip()
                raw_status = (item.get("status") or "unknown").lower()
                is_online = raw_status not in ("offline", "stopped", "error")
                payload = {
                    "hardware_status": raw_status,
                    "is_online": is_online,
                    "display_name": display_name,
                }
                if uri:
                    by_uri[uri] = payload
                if display_name:
                    by_name[display_name.lower()] = payload
                    by_name[display_name.replace(" ", "_").lower()] = payload
        except Exception as e:
            logging.warning(f"system_profiler printer status unavailable: {e}")
        return {"by_uri": by_uri, "by_name": by_name}

    def _lookup_hardware_status(queue_name: str, uri: str, mac_maps: dict) -> dict | None:
        if uri and uri in mac_maps["by_uri"]:
            return mac_maps["by_uri"][uri]
        normalized = queue_name.replace("_", " ").lower()
        if normalized in mac_maps["by_name"]:
            return mac_maps["by_name"][normalized]
        if queue_name.lower() in mac_maps["by_name"]:
            return mac_maps["by_name"][queue_name.lower()]
        return None

    def _printer_accepts_jobs(name: str) -> bool:
        try:
            a_out = subprocess.check_output(["lpstat", "-a"], text=True, stderr=subprocess.STDOUT)
            for line in a_out.split("\n"):
                stripped = line.strip()
                if not stripped.startswith(f"{name} "):
                    continue
                lower = stripped.lower()
                if "not accepting" in lower or "rejecting" in lower:
                    return False
                if "accepting" in lower:
                    return True
        except Exception:
            pass
        return True

    def _resolve_printer_online(
        name: str,
        queue_status: str,
        details: str,
        uri: str,
        mac_maps: dict,
    ) -> tuple[bool, str]:
        hardware = _lookup_hardware_status(name, uri, mac_maps)
        if hardware is not None and hardware["hardware_status"] != "unknown":
            return hardware["is_online"], hardware["hardware_status"]

        if queue_status == "disabled":
            return False, "disabled"
        combined = details.lower()
        offline_markers = (
            "offline",
            "unable to connect",
            "unreachable",
            "not connected",
            "on fault",
            "printer is stopped",
        )
        if any(marker in combined for marker in offline_markers):
            return False, "offline"
        if queue_status in ("idle", "printing") and _printer_accepts_jobs(name):
            return True, queue_status
        return False, queue_status or "unknown"

    try:
        default_printer = ""
        try:
            d_out = subprocess.check_output(["lpstat", "-d"], text=True)
            if "system default destination:" in d_out:
                default_printer = d_out.split("system default destination:")[1].strip()
        except Exception:
            pass

        uri_map = _get_printer_device_uris()
        mac_maps = _get_macos_hardware_status() if platform.system() == "Darwin" else {"by_uri": {}, "by_name": {}}

        printers = []
        try:
            p_out = subprocess.check_output(["lpstat", "-p"], text=True)
            lines = p_out.split("\n")
            current_printer = None
            for line in lines:
                line_strip = line.strip()
                if not line_strip:
                    continue
                if line.startswith("printer "):
                    parts = line.split()
                    name = parts[1]
                    queue_status = "unknown"
                    if "is idle" in line:
                        queue_status = "idle"
                    elif "is printing" in line:
                        queue_status = "printing"
                    elif "disabled" in line:
                        queue_status = "disabled"

                    details = line_strip
                    device_uri = uri_map.get(name, "")
                    is_online, hardware_status = _resolve_printer_online(
                        name, queue_status, details, device_uri, mac_maps
                    )
                    current_printer = {
                        "name": name,
                        "status": queue_status,
                        "hardware_status": hardware_status,
                        "device_uri": device_uri,
                        "is_default": name == default_printer,
                        "is_online": is_online,
                        "details": details,
                    }
                    printers.append(current_printer)
                elif current_printer and line.startswith("\t"):
                    current_printer["details"] += " " + line_strip
                    is_online, hardware_status = _resolve_printer_online(
                        current_printer["name"],
                        current_printer["status"],
                        current_printer["details"],
                        current_printer.get("device_uri", ""),
                        mac_maps,
                    )
                    current_printer["is_online"] = is_online
                    current_printer["hardware_status"] = hardware_status
        except Exception as e:
            logging.error(f"Gagal mendapatkan list printer via lpstat -p: {e}")

        return {
            "status": "success",
            "default_printer": default_printer,
            "printers": printers,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/print-media")
def get_print_media_options(
    printer_name: str | None = None,
    _: None = Depends(verify_camera_api_key),
):
    """Daftar ukuran/media CUPS untuk dropdown di layar SETUP kiosk."""
    sizes = get_supported_media_sizes(printer_name)
    media_4r = filter_4r_media_names(sizes)
    media_a4 = filter_a4_media_names(sizes)
    return {
        "status": "success",
        "media_sizes": sizes,
        "photo_media": media_4r,
        "a4_media": media_a4,
        "recommended_4r": find_best_4r_media(sizes),
        "recommended_a4": find_best_a4_media(sizes, borderless=True),
    }


@app.post("/print-test")
def print_test(
    printer_name: str = None,
    _: None = Depends(verify_camera_api_key),
):
    """Cetak halaman uji ke printer yang dipilih (driver terinstall di OS)."""
    if not PIL_AVAILABLE:
        raise HTTPException(status_code=500, detail="Pillow tidak tersedia untuk halaman uji cetak.")

    fd, temp_path = tempfile.mkstemp(suffix=".png", dir=CAPTURED_DIR)
    os.close(fd)

    try:
        img = Image.new("RGB", (1200, 1800), (253, 251, 247))
        draw = ImageDraw.Draw(img)
        draw.rectangle([40, 40, 1160, 1760], outline=(174, 161, 147), width=4)
        draw.text((80, 100), "DOVELENS PHOTOBOOTH", fill=(62, 39, 35))
        draw.text((80, 170), "HALAMAN UJI CETAK PRINTER", fill=(140, 126, 106))
        target = printer_name or "Default System Printer"
        draw.text((80, 260), f"Printer: {target}", fill=(62, 39, 35))
        draw.text((80, 330), time.strftime("%Y-%m-%d %H:%M:%S"), fill=(140, 126, 106))
        draw.text((80, 420), "Jika halaman ini tercetak, koneksi printer siap.", fill=(62, 39, 35))
        img.save(temp_path)

        if platform.system() == "Windows":
            from windows_print import dispatch_print as windows_dispatch_print

            windows_dispatch_print(temp_path, 1, printer_name)
            return {
                "status": "success",
                "message": f"Halaman uji cetak terkirim ke {target}.",
                "printer_name": printer_name or "",
            }

        lp_args = ["lp", "-o", "fit-to-page", "-n", "1"]
        if printer_name:
            lp_args.extend(["-d", printer_name])
        lp_args.append(temp_path)

        result = subprocess.run(lp_args, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr or "Gagal mengirim perintah cetak uji.")

        return {
            "status": "success",
            "message": f"Halaman uji cetak terkirim ke {target}.",
            "printer_name": printer_name or "",
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def get_supported_media_sizes(printer_name: str) -> list:
    import subprocess
    try:
        cmd = ["lpoptions"]
        if printer_name:
            cmd.extend(["-p", printer_name])
        cmd.append("-l")
        out = subprocess.check_output(cmd, text=True)
        for line in out.split("\n"):
            if "PageSize/" in line or "media/" in line.lower():
                parts = line.split(":")
                if len(parts) > 1:
                    sizes = parts[1].strip().split()
                    return [s.replace("*", "") for s in sizes]
    except Exception as e:
        logging.error(f"Gagal mendapatkan supported media sizes: {e}")
    return []


def get_lpoptions_lines(printer_name: str | None) -> list[str]:
    import subprocess

    try:
        cmd = ["lpoptions"]
        if printer_name:
            cmd.extend(["-p", printer_name])
        cmd.append("-l")
        return subprocess.check_output(cmd, text=True).splitlines()
    except Exception as e:
        logging.warning(f"Gagal membaca lpoptions: {e}")
        return []


def printer_supports_lp_option(printer_name: str | None, option_key: str) -> bool:
    needle = option_key.lower()
    for line in get_lpoptions_lines(printer_name):
        if needle in line.lower():
            return True
    return False

def find_best_4r_media(supported_sizes: list) -> str:
    preferences = [
        "Photo4x6.Borderless",
        "EPKG.NMgn",
        "Photo4x6",
        "EPKG",
        "4x6.Borderless",
        "4x6",
        "10x15cm.Borderless",
        "10x15cm",
        "Postcard.Borderless",
        "Postcard",
        "Photo",
        "Postcard",
    ]
    for pref in preferences:
        if pref in supported_sizes:
            return pref
    for size in supported_sizes:
        size_lower = size.lower()
        if "4x6" in size_lower or "10x15" in size_lower or "epkg" in size_lower:
            return size
    return None


def find_best_a4_media(supported_sizes: list, borderless: bool = False) -> str | None:
    if borderless:
        borderless_preferences = [
            "A4.Borderless",
            "A4.NoMargin",
            "ISO_A4.Borderless",
        ]
        for pref in borderless_preferences:
            if pref in supported_sizes:
                return pref
        for size in supported_sizes:
            size_lower = size.lower()
            if ("a4" in size_lower or "210x297" in size_lower) and "borderless" in size_lower:
                return size

    preferences = [
        "A4",
        "ISO_A4",
        "A4.Plain",
        "210x297mm",
        "210x297",
        "A4.210x297mm",
    ]
    for pref in preferences:
        if pref in supported_sizes:
            return pref
    for size in supported_sizes:
        size_lower = size.lower()
        if "a4" in size_lower or "210x297" in size_lower or "iso_a4" in size_lower:
            return size
    return None


def is_a4_media_name(media: str | None) -> bool:
    if not media:
        return False
    lower = media.lower()
    return "a4" in lower or "210x297" in lower or "iso_a4" in lower


def is_4r_media_name(media: str | None) -> bool:
    if not media or is_a4_media_name(media):
        return False
    lower = media.lower()
    return any(
        keyword in lower
        for keyword in ("epkg", "4x6", "10x15", "photo", "postcard", "2l", "roll")
    )


def filter_a4_media_names(supported_sizes: list) -> list[str]:
    matches = [size for size in supported_sizes if is_a4_media_name(size)]
    return matches or supported_sizes


def filter_4r_media_names(supported_sizes: list) -> list[str]:
    matches = [size for size in supported_sizes if is_4r_media_name(size)]
    return matches or [size for size in supported_sizes if not is_a4_media_name(size)]


def is_a4_pixel_size(output_width: int | None, output_height: int | None) -> bool:
    if not output_width or not output_height:
        return False
    w, h = int(output_width), int(output_height)
    if w < 2400 or h < 3400:
        return False
    aspect = w / h
    return abs(aspect - (210 / 297)) < 0.04


# 4×6 inch @ 300 DPI (portrait). Used to upscale strip prints before sending to CUPS.
R4_PRINT_WIDTH = 1200
R4_PRINT_HEIGHT = 1800


def is_photo_strip_pixel_size(output_width: int | None, output_height: int | None) -> bool:
    if is_a4_pixel_size(output_width, output_height):
        return False
    if not output_width or not output_height:
        return True
    w, h = int(output_width), int(output_height)
    aspect = w / h if h else 1
    # Portrait ~4×6 (2:3) or landscape 6×4
    return 0.55 <= aspect <= 0.75 or 1.25 <= aspect <= 1.85


def get_lp_option_choices(printer_name: str | None, option_prefix: str) -> list[str]:
    prefix_lower = option_prefix.lower()
    for line in get_lpoptions_lines(printer_name):
        key = line.split("/", 1)[0].strip().lower()
        if not key.startswith(prefix_lower):
            continue
        if ":" not in line:
            continue
        values_part = line.split(":", 1)[1].strip()
        return [
            token.replace("*", "").strip()
            for token in values_part.split()
            if token.replace("*", "").strip()
        ]
    return []


def pick_lp_option_value(
    printer_name: str | None,
    option_prefix: str,
    preferred: list[str],
) -> str | None:
    choices = get_lp_option_choices(printer_name, option_prefix)
    if not choices:
        return None
    for value in preferred:
        if value in choices:
            return value
    numeric = [choice for choice in choices if choice.isdigit()]
    if numeric:
        return max(numeric, key=int)
    return choices[0]


def append_epij_photo_quality_options(lp_args: list[str], printer_name: str | None) -> None:
    """Apply Epson photo color/quality options when supported by the installed PPD."""
    qual = pick_lp_option_value(
        printer_name,
        "EPIJ_Qual",
        ["307", "306", "305", "304", "303", "302", "301"],
    )
    if qual:
        lp_args.extend(["-o", f"EPIJ_Qual={qual}"])

    cmat = pick_lp_option_value(printer_name, "EPIJ_CMat", ["1", "2", "3", "0"])
    if cmat is not None:
        lp_args.extend(["-o", f"EPIJ_CMat={cmat}"])

    resolution = pick_lp_option_value(
        printer_name,
        "Resolution",
        ["720x720dpi", "600x600dpi", "360x360dpi", "300x300dpi"],
    )
    if resolution:
        lp_args.extend(["-o", f"Resolution={resolution}"])

    if printer_supports_lp_option(printer_name, "ColorModel"):
        color_model = pick_lp_option_value(printer_name, "ColorModel", ["RGB", "CMYK"])
        if color_model:
            lp_args.extend(["-o", f"ColorModel={color_model}"])


def append_borderless_photo_layout(
    lp_args: list[str],
    printer_name: str | None,
    scaling: str = "105",
) -> bool:
    """Enable Epson borderless photo layout when the driver exposes the options."""
    has_borderless = False
    if printer_supports_lp_option(printer_name, "EPIJ_PSrc"):
        lp_args.extend(["-o", "EPIJ_PSrc=3"])
        has_borderless = True
    if printer_supports_lp_option(printer_name, "EPIJ_Bdls"):
        lp_args.extend(["-o", "EPIJ_Bdls=1"])
        has_borderless = True
    if printer_supports_lp_option(printer_name, "EPIJ_RmMg"):
        lp_args.extend(["-o", "EPIJ_RmMg=1"])
    lp_args.extend(["-o", f"scaling={scaling}"])
    return has_borderless


def resolve_print_target_pixels(
    output_width: int | None,
    output_height: int | None,
) -> tuple[int, int] | None:
    if is_a4_pixel_size(output_width, output_height):
        return int(output_width), int(output_height)
    if not is_photo_strip_pixel_size(output_width, output_height):
        return None

    if output_width and output_height and int(output_width) > int(output_height):
        return R4_PRINT_HEIGHT, R4_PRINT_WIDTH
    return R4_PRINT_WIDTH, R4_PRINT_HEIGHT


def prepare_print_image(
    local_path: str,
    output_width: int | None,
    output_height: int | None,
) -> tuple[str, str | None]:
    """Upscale strip prints to 300 DPI 4×6 and embed print DPI metadata."""
    if not PIL_AVAILABLE:
        return local_path, None

    target = resolve_print_target_pixels(output_width, output_height)
    if not target:
        return local_path, None

    target_w, target_h = target
    try:
        with Image.open(local_path) as img:
            rgb = img.convert("RGB")
            if rgb.size != (target_w, target_h):
                resample = getattr(Image, "Resampling", Image).LANCZOS
                rgb = rgb.resize((target_w, target_h), resample)

            fd, temp_path = tempfile.mkstemp(suffix=".png", dir=CAPTURED_DIR)
            os.close(fd)
            rgb.save(temp_path, format="PNG", dpi=(300, 300), optimize=True)
            logging.info(
                "Prepared print image %sx%s -> %sx%s @300dpi",
                img.size[0],
                img.size[1],
                target_w,
                target_h,
            )
            return temp_path, temp_path
    except Exception as exc:
        logging.warning("Gagal menyiapkan upscaling cetak, pakai file asli: %s", exc)
        return local_path, None


def resolve_print_media(
    printer_name: str | None,
    media: str | None = None,
    output_width: int | None = None,
    output_height: int | None = None,
) -> str | None:
    supported_sizes = get_supported_media_sizes(printer_name)
    wants_a4 = is_a4_pixel_size(output_width, output_height)
    wants_strip = is_photo_strip_pixel_size(output_width, output_height)

    if media:
        if wants_a4 and not is_a4_media_name(media):
            logging.warning(
                "Ignoring non-A4 media '%s' for A4 print job; auto-selecting A4 media",
                media,
            )
            media = None
        elif wants_strip and is_a4_media_name(media):
            logging.warning(
                "Ignoring A4 media '%s' for strip/4R print job; auto-selecting 4R media",
                media,
            )
            media = None
        elif media:
            return media

    if wants_a4:
        a4_media = find_best_a4_media(supported_sizes, borderless=True)
        if a4_media:
            logging.info(f"Auto-selected A4 borderless media: {a4_media}")
            return a4_media

    best_4r = find_best_4r_media(supported_sizes)
    if best_4r:
        logging.info(f"Auto-selected 4R media: {best_4r}")
    return best_4r

def _resolve_print_path(file_path: str):
    """Resolve and validate a local or remote print source path."""
    local_path = file_path
    temp_file = None

    if file_path.startswith("http://") or file_path.startswith("https://"):
        parsed = urlparse(file_path)
        if parsed.hostname not in _allowed_download_hosts():
            raise HTTPException(status_code=403, detail="Download host not allowed")
        try:
            logging.info(f"Mengunduh foto untuk dicetak dari URL: {file_path}")
            suffix = ".png" if ".png" in file_path.lower() else ".jpg"
            fd, temp_path = tempfile.mkstemp(suffix=suffix, dir=CAPTURED_DIR)
            os.close(fd)
            urllib.request.urlretrieve(file_path, temp_path)
            local_path = temp_path
            temp_file = temp_path
        except Exception as e:
            logging.error(f"Gagal mengunduh foto dari URL: {e}")
            raise HTTPException(status_code=500, detail=f"Gagal mengunduh foto: {str(e)}")
    else:
        local_path = os.path.abspath(file_path)
        if not local_path.startswith(CAPTURED_DIR):
            raise HTTPException(status_code=403, detail="Local file path not allowed")

    if not os.path.exists(local_path):
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=404, detail="File foto tidak ditemukan.")

    return local_path, temp_file


def _build_lp_args(
    quantity: int,
    printer_name: str | None,
    media: str | None,
    output_width: int | None,
    output_height: int | None,
) -> list[str]:
    a4_borderless = is_a4_pixel_size(output_width, output_height)
    photo_strip = is_photo_strip_pixel_size(output_width, output_height)
    lp_args = ["lp", "-n", str(quantity)]

    selected_media = resolve_print_media(printer_name, media, output_width, output_height)
    if selected_media:
        lp_args.extend(["-o", f"media={selected_media}"])

    if a4_borderless:
        append_borderless_photo_layout(lp_args, printer_name, scaling="105")
        append_epij_photo_quality_options(lp_args, printer_name)
        logging.info(
            "Mode cetak A4 borderless (media=%s, scaling=105, photo quality options applied)",
            selected_media or "default",
        )
    elif photo_strip:
        used_borderless = append_borderless_photo_layout(lp_args, printer_name, scaling="105")
        if not used_borderless:
            lp_args.extend(["-o", "scaling=100"])
        if printer_supports_lp_option(printer_name, "EPIJ_exmg"):
            lp_args.extend(["-o", "EPIJ_exmg=0"])
        if printer_supports_lp_option(printer_name, "Expansion"):
            lp_args.extend(["-o", "Expansion=0"])
        append_epij_photo_quality_options(lp_args, printer_name)
        logging.info(
            "Mode cetak strip 4R/photo (media=%s, borderless=%s, photo quality options applied)",
            selected_media or "default",
            used_borderless,
        )
    else:
        lp_args.extend(["-o", "fit-to-page"])
        if printer_supports_lp_option(printer_name, "EPIJ_exmg"):
            lp_args.extend(["-o", "EPIJ_exmg=0"])
        if printer_supports_lp_option(printer_name, "Expansion"):
            lp_args.extend(["-o", "Expansion=0"])
        append_epij_photo_quality_options(lp_args, printer_name)
        logging.info("Mode cetak generic (fit-to-page, media=%s)", selected_media or "default")

    if printer_name:
        lp_args.extend(["-d", printer_name])

    return lp_args


def _dispatch_print_job(
    local_path: str,
    quantity: int,
    printer_name: str = None,
    media: str = None,
    output_width: int | None = None,
    output_height: int | None = None,
):
    """Kirim file lokal ke printer OS (CUPS di macOS/Linux, spooler di Windows)."""
    if quantity < 1 or quantity > 20:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 20")

    if platform.system() == "Windows":
        try:
            from windows_print import dispatch_print as windows_dispatch_print

            windows_dispatch_print(local_path, quantity, printer_name)
            return {
                "status": "success",
                "message": f"Perintah cetak {quantity} salinan terkirim.",
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except Exception as e:
            logging.error("Windows print gagal: %s", e)
            raise HTTPException(status_code=500, detail=str(e)) from e

    prepared_path, prepared_temp = prepare_print_image(local_path, output_width, output_height)
    try:
        lp_args = _build_lp_args(quantity, printer_name, media, output_width, output_height)
        lp_args.append(prepared_path)
        logging.info(
            "Mencetak foto (jumlah: %s, printer: %s, a4=%s, strip=%s, media=%s): %s",
            quantity,
            printer_name or "default",
            is_a4_pixel_size(output_width, output_height),
            is_photo_strip_pixel_size(output_width, output_height),
            media or "auto",
            prepared_path,
        )

        result = subprocess.run(lp_args, capture_output=True, text=True)
        if result.returncode == 0:
            return {"status": "success", "message": f"Perintah cetak {quantity} salinan terkirim."}
        raise HTTPException(status_code=500, detail=result.stderr or "Gagal mengirim perintah cetak ke sistem operasi.")
    finally:
        if prepared_temp and os.path.exists(prepared_temp):
            os.remove(prepared_temp)


@app.post("/print")
def print_photo(
    file_path: str,
    quantity: int = 1,
    printer_name: str = None,
    media: str = None,
    output_width: int | None = None,
    output_height: int | None = None,
    _: None = Depends(verify_camera_api_key),
):
    """Mengirim file gambar ke mesin cetak (printer fisik) dengan penyesuaian media."""
    local_path, temp_file = _resolve_print_path(file_path)

    try:
        return _dispatch_print_job(
            local_path,
            quantity,
            printer_name,
            media,
            output_width,
            output_height,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)


@app.post("/print-upload")
async def print_upload(
    quantity: int = 1,
    printer_name: str = None,
    media: str = None,
    output_width: int | None = None,
    output_height: int | None = None,
    file: UploadFile = File(...),
    _: None = Depends(verify_camera_api_key),
):
    """Terima file langsung dari kiosk dan cetak tanpa upload cloud."""
    if quantity < 1 or quantity > 20:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 20")

    suffix = ".png"
    if file.filename:
        lower = file.filename.lower()
        if lower.endswith(".jpg") or lower.endswith(".jpeg"):
            suffix = ".jpg"

    os.makedirs(CAPTURED_DIR, exist_ok=True)
    local_path = os.path.join(CAPTURED_DIR, f"print_{int(time.time() * 1000)}{suffix}")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="File cetak kosong.")
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File cetak melebihi 50MB.")

        with open(local_path, "wb") as out:
            out.write(content)

        return _dispatch_print_job(
            local_path,
            quantity,
            printer_name,
            media,
            output_width,
            output_height,
        )
    except HTTPException:
        if os.path.exists(local_path):
            os.remove(local_path)
        raise
    except Exception as e:
        if os.path.exists(local_path):
            os.remove(local_path)
        raise HTTPException(status_code=500, detail=str(e))

def _transcode_to_mobile_mp4(input_path: str, output_path: str) -> None:
    import shutil

    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        raise HTTPException(status_code=503, detail="FFmpeg tidak terinstall di mesin kiosk.")

    result = subprocess.run(
        [
            ffmpeg_bin,
            "-y",
            "-i",
            input_path,
            "-vf",
            "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
            "-c:v",
            "libx264",
            "-profile:v",
            "baseline",
            "-level",
            "3.1",
            "-pix_fmt",
            "yuv420p",
            "-b:v",
            "1500k",
            "-maxrate",
            "1800k",
            "-bufsize",
            "3600k",
            "-fs",
            str(2 * 1024 * 1024),
            "-movflags",
            "+faststart",
            "-an",
            output_path,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        logging.error("FFmpeg transcode error: %s", result.stderr)
        raise HTTPException(status_code=500, detail="Gagal transcode video ke MP4 mobile.")


@app.post("/transcode-mp4")
async def transcode_mp4(
    file: UploadFile = File(...),
    _: None = Depends(verify_camera_api_key),
):
    """Konversi WebM/GIF/video ke H.264 MP4 (baseline) untuk iOS/Android."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File kosong.")
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File melebihi 50MB.")

    os.makedirs(CAPTURED_DIR, exist_ok=True)
    stamp = int(time.time() * 1000)
    input_path = os.path.join(CAPTURED_DIR, f"transcode_in_{stamp}.bin")
    output_path = os.path.join(CAPTURED_DIR, f"transcode_out_{stamp}.mp4")

    try:
        with open(input_path, "wb") as out:
            out.write(content)
        _transcode_to_mobile_mp4(input_path, output_path)
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="mobile.mp4",
            background=BackgroundTask(lambda: _cleanup_transcode_files(input_path, output_path)),
        )
    except HTTPException:
        for path in (input_path, output_path):
            if os.path.exists(path):
                os.remove(path)
        raise
    except Exception as e:
        for path in (input_path, output_path):
            if os.path.exists(path):
                os.remove(path)
        logging.error("transcode-mp4 failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


def _cleanup_transcode_files(*paths: str) -> None:
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as exc:
            logging.warning("Cleanup transcode file gagal (%s): %s", path, exc)


if __name__ == "__main__":
    import uvicorn
    # Menjalankan server di port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
