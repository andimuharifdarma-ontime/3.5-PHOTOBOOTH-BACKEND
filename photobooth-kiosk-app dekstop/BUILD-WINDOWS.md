# Build SelftFoto Kiosk for Windows 10 / 11

Panduan ini menghasilkan installer desktop **SelftFoto Kiosk** (`.exe`) untuk Windows 10 dan Windows 11 (64-bit).

> **Penting:** Build Windows harus dijalankan **di mesin Windows**. Native modules (Prisma, sharp) dan Python venv tidak bisa di-bundle dengan aman dari macOS.

## Prasyarat

| Tool | Versi | Catatan |
|------|-------|---------|
| Windows | 10 atau 11 | 64-bit (x64) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) — centang **Add to PATH** |
| npm | 9+ | Ikut Node.js |
| Python | 3.10+ | [python.org](https://www.python.org/downloads/windows/) — centang **Add python.exe to PATH** |
| Git | opsional | Untuk clone repo |

## 1. Siapkan environment backend

```powershell
cd "photobooth-kiosk-app dekstop\backend"
copy .env.example .env
```

Isi `DATABASE_URL` di `.env` (sama dengan `backend-admin` / Supabase).

## 2. Install dependency frontend

```powershell
cd "..\frontend"
npm install
```

## 3. Build installer Windows

```powershell
npm run pack:win
```

Perintah ini akan:

1. Build Next.js (standalone)
2. Build NestJS + `prisma generate`
3. Buat venv Python di `python-camera-service\venv` (jika belum ada) dan install deps
4. Jalankan `electron-builder --win` → installer NSIS

### Output

| Perintah | Hasil |
|----------|--------|
| `npm run pack:win` | `frontend\release\SelftFoto-Kiosk-Setup-0.1.0.exe` |
| `npm run pack:win:dir` | Folder unpacked `frontend\release\win-unpacked\` (testing) |
| `npm run pack:win:portable` | Portable `.exe` tanpa installer |

## 4. Install di PC kiosk

1. Jalankan `SelftFoto-Kiosk-Setup-0.1.0.exe`
2. Pilih folder instalasi (default: `C:\Program Files\SelftFoto Kiosk`)
3. Shortcut dibuat di Desktop dan Start Menu
4. Buka **SelftFoto Kiosk** — aplikasi fullscreen

Struktur setelah instal:

```
C:\Program Files\SelftFoto Kiosk\
├── SelftFoto Kiosk.exe
└── resources\
    ├── next\          ← UI Next.js
    ├── backend\       ← API NestJS + .env
    └── camera\        ← Python camera + venv\
```

## Printer (Windows)

Camera service memakai **Windows Print Spooler** (`pywin32`) untuk:

- `GET /printers` — daftar printer
- `POST /print`, `/print-upload`, `/print-test`

Pastikan driver printer (mis. Epson L3150) sudah terinstall di Windows.

## DSLR / Live view

`gphoto2` di Windows terbatas. Tanpa kamera DSLR yang kompatibel, service berjalan **mode simulasi** (live view dummy). Untuk produksi Windows, uji kamera USB Anda terlebih dahulu.

## Troubleshooting

### Startup error — database

Perbaiki `DATABASE_URL` di `backend\.env`, lalu rebuild:

```powershell
npm run pack:win
```

### Python tidak ditemukan

Install Python 3.10+, pastikan `python --version` berjalan di PowerShell, lalu rebuild.

### Port 3000 / 3001 / 8000 masih dipakai

Tutup instance SelftFoto Kiosk lama dari Task Manager, tunggu 2 detik, buka lagi.

### Antivirus memblokir installer

Tambahkan exception untuk folder instalasi atau tanda tangani installer (code signing) di produksi.

## Build macOS (referensi)

Di Mac:

```bash
cd frontend
npm run pack:dir
```

Output: `release/mac-arm64/SelftFoto Kiosk.app`
