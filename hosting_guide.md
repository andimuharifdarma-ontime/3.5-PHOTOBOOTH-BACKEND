# Panduan Konfigurasi Hosting Netlify

Dokumen ini berisi langkah-langkah untuk mengonfigurasi variabel lingkungan (Environment Variables) saat melakukan deployment aplikasi Dovelens Photobooth di Netlify.

## Langkah 1: Persiapan Database (Supabase)

Pastikan database Supabase Anda siap menerima koneksi dari luar.
- Ambil **Connection String** dari Supabase (Settings > Database).
- Gunakan **Transaction Connection String** (port 6543) untuk `DATABASE_URL`.
- Gunakan **Session/Direct Connection String** (port 5432) untuk `DIRECT_URL`.

## Langkah 2: Pengaturan Environment Variables di Netlify

Buka dashboard Netlify Anda, masuk ke **Site Configuration** > **Environment variables**, lalu tambahkan variabel berikut:

### 1. Database & Prisma
| Key | Value (Contoh) |
|-----|----------------|
| `DATABASE_URL` | `postgresql://postgres...:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres...:5432/postgres` |

### 2. Authentication (NextAuth)
| Key | Value |
|-----|-------|
| `NEXTAUTH_SECRET` | *(Gunakan string random panjang)* |
| `NEXTAUTH_URL` | `https://nama-site-anda.netlify.app` |

### 3. Google Drive / Backup
> [!IMPORTANT]
> Masukkan `GOOGLE_PRIVATE_KEY` dengan tanda kutip dan pastikan karakter `\n` tetap ada.

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | `108293169...` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | `https://nama-site-anda.netlify.app/api/auth/google/callback` |
| `GOOGLE_REFRESH_TOKEN` | *(Ambil dari terminal lokal)* |
| `GOOGLE_DRIVE_FOLDER_ID` | `1SsIZE69...` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `photobooth-uploader@...` |
| `GOOGLE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\nMIIEv...-----END PRIVATE KEY-----"` |

### 4. Payment Gateway (DOKU)
| Key | Value |
|-----|-------|
| `DOKU_CLIENT_ID` | `BRN-0217-...` |
| `DOKU_SECRET_KEY` | `SK-M88V...` |
| `DOKU_IS_PRODUCTION` | `false` (set `true` jika sudah live) |
| `DOKU_PUBLIC_KEY` | *(Salin dari .env.local)* |

### 5. App Config & SMTP
| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_BASE_URL` | `https://nama-site-anda.netlify.app` |
| `SMTP_EMAIL` | `email-anda@gmail.com` |
| `SMTP_PASSWORD` | *(App Password dari Google)* |

---

## Langkah 3: Build & Deployment

Di Netlify, pastikan setting build-nya adalah:
- **Build command**: `npm run build`
- **Publish directory**: `.next`

> [!TIP]
> Jangan lupa jalankan `npx prisma generate` di local sebelum push ke GitHub, atau tambahkan di script `postinstall` pada `package.json`.

## Verifikasi Plan

Setelah variabel dimasukkan:
1. Jalankan **Trigger Deploy** di Netlify.
2. Cek Log Build untuk memastikan tidak ada error Prisma.
3. Coba Login ke Admin Panel di URL Netlify Anda.
4. Coba lakukan sesi foto dan cek apakah backup Google Drive berjalan.
