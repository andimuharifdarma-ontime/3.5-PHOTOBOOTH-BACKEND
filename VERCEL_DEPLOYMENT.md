# Panduan Deployment ke Vercel

Dokumen ini berisi panduan langkah demi langkah untuk melakukan deployment aplikasi **Next.js + Prisma** ke platform cloud **Vercel**.

> **Platform utama (production):** Vercel — gunakan `backend-admin/` sebagai root directory.  
> Netlify (`netlify.toml`) tersedia sebagai alternatif legacy; jangan deploy branch yang sama ke kedua platform sekaligus.

---

## 📋 Langkah 1: Persiapan Database (Supabase)

Karena Vercel menggunakan arsitektur **Serverless** (tanpa koneksi server yang standby terus menerus), disarankan untuk menggunakan **Connection Pooling** dari Supabase agar koneksi ke database tidak cepat penuh (*exhausted*).

1. Buka dashboard **Supabase** Anda.
2. Pergi ke **Settings** > **Database**.
3. Di bagian **Connection String**, cari bagian **Pooler**:
   - Salin URL **Transaction Connection String** (menggunakan port `6543` dengan parameter `?pgbouncer=true` di akhir URL) dan gunakan ini untuk variabel `DATABASE_URL`.
   - Salin URL **Session/Direct Connection String** (menggunakan port `5432` tanpa pgbouncer) dan gunakan ini untuk variabel `DIRECT_URL`.

---

## 🚀 Langkah 2: Deploy Melalui Vercel Dashboard (Rekomendasi)

1. **Login ke Vercel:**
   - Kunjungi [Vercel](https://vercel.com/) dan login menggunakan akun GitHub/GitLab Anda.
2. **Impor Repository:**
   - Klik tombol **"Add New"** > **"Project"**.
   - Pilih repository Git yang berisi source code aplikasi photobooth ini.
3. **Konfigurasi Project:**
   Karena repository Anda adalah *monorepo* (memiliki folder `photobooth-kiosk-app dekstop/` dan `backend-admin` dalam satu project Git), Anda perlu mengonfigurasi root folder untuk masing-masing app:

   - **Nama Project**: Misal `dovelens-photobooth` atau `dovelens-admin`.
   - **Framework Preset**: Pilih **Next.js**.
   - **Root Directory**: Klik **Edit** dan pilih folder yang ingin dideploy:
     - Pilih `photobooth-kiosk-app dekstop/frontend` untuk mendeploy aplikasi kiosk (opsional).
     - Pilih `backend-admin` untuk mendeploy aplikasi admin panel (wajib untuk production).
   - **Build and Output Settings**: 
     - Biarkan default (`npm run build` / `next build`). 
     - *Catatan: Kita sudah menambahkan script `postinstall` untuk menjalankan `prisma generate` di package.json, jadi Prisma Client akan ter-generate otomatis saat deployment.*

---

## 🔑 Langkah 3: Mengisi Environment Variables di Vercel

Saat mengonfigurasi project di Vercel, buka bagian **Environment Variables** dan masukkan variabel dari file `.env.local` Anda. Berikut adalah variabel krusial yang wajib dimasukkan:

### 1. Database & Prisma (Supabase)
| Key | Value (Contoh) | Deskripsi |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres...:6543/postgres?pgbouncer=true` | URL pooler port `6543` |
| `DIRECT_URL` | `postgresql://postgres...:5432/postgres` | URL langsung port `5432` |

### 2. NextAuth (Autentikasi)
| Key | Value | Deskripsi |
| :--- | :--- | :--- |
| `NEXTAUTH_SECRET` | `UaBIrfZ4VRDm7FLTvGoxkH/uu4BUnbTWBjyME0WMcQ0=` | Key enkripsi session |
| `NEXTAUTH_URL` | `https://nama-site-anda.vercel.app` | URL domain Vercel Anda setelah dideploy |
| `NEXT_PUBLIC_BASE_URL` | `https://nama-site-anda.vercel.app` | Sama dengan `NEXTAUTH_URL` |

### 3. Google Drive / Backup
| Key | Value | Deskripsi |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | `108293169...` | OAuth Client ID Google |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | OAuth Client Secret Google |
| `GOOGLE_REDIRECT_URI` | `https://nama-site-anda.vercel.app/api/auth/google/callback` | Callback redirect OAuth |
| `GOOGLE_REFRESH_TOKEN` | *(Salin dari `.env.local` lokal)* | Token refresh Google API |
| `GOOGLE_DRIVE_FOLDER_ID` | `1SsIZE69...` | ID folder Google Drive |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `photobooth-uploader@...` | Email Service Account |
| `GOOGLE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\nMIIEv...-----END PRIVATE KEY-----\n"` | Private Key Google (beserta tanda kutip dan `\n` lengkap) |

### 4. DOKU Payment Gateway (Opsional)
| Key | Value | Deskripsi |
| :--- | :--- | :--- |
| `DOKU_CLIENT_ID` | `BRN-0217-...` | ID Merchant DOKU |
| `DOKU_SECRET_KEY` | `SK-...` | Secret Key DOKU |
| `DOKU_IS_PRODUCTION` | `false` | Ubah ke `true` jika sudah siap live |
| `DOKU_PUBLIC_KEY` | `"-----BEGIN PUBLIC KEY-----\nMIIBI...-----END PUBLIC KEY-----"` | Public Key DOKU |

### 5. Cron & Security
| Key | Value | Deskripsi |
| :--- | :--- | :--- |
| `CRON_SECRET` | *(generate random string)* | **Wajib** — melindungi endpoint `/api/cron/cleanup-photos` |

### 6. Upstash Redis (Rate Limiting)
| Key | Value | Deskripsi |
| :--- | :--- | :--- |
| `UPSTASH_REDIS_REST_URL` | `https://...` | REST URL Redis Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | `gQAA...` | Token REST Redis Upstash |

### 6. SMTP Email Config
| Key | Value | Deskripsi |
| :--- | :--- | :--- |
| `SMTP_EMAIL` | `email-anda@gmail.com` | Email pengirim foto |
| `SMTP_PASSWORD` | *(App Password dari Google Account)* | Password SMTP email |

---

## 🛠️ Langkah 4: Sinkronisasi Google OAuth Redirect URI

Setelah project Vercel Anda berhasil dideploy dan Anda mendapatkan domain Vercel (misal: `https://dovelens.vercel.app`):
1. Masuk ke [Google Cloud Console](https://console.cloud.google.com/).
2. Pergi ke **APIs & Services** > **Credentials**.
3. Edit **OAuth 2.0 Client IDs** yang Anda gunakan.
4. Di bagian **Authorized redirect URIs**, tambahkan URL callback Vercel baru Anda:
   - `https://nama-site-anda.vercel.app/api/auth/google/callback`
5. Simpan perubahan.

---

## 💻 Langkah 5 (Alternatif): Deploy Menggunakan Vercel CLI

Jika Anda ingin deploy langsung lewat terminal komputer Anda:
1. Install CLI:
   ```bash
   npm install -g vercel
   ```
2. Pindah ke folder project (misal: `photobooth-kiosk`):
   ```bash
   cd photobooth-kiosk
   ```
3. Jalankan inisialisasi:
   ```bash
   vercel
   ```
   Ikuti instruksi di terminal. Setelah selesai, konfigurasikan Environment Variables melalui dashboard web Vercel yang disediakan.
4. Jika ingin mendeploy ke production:
   ```bash
   vercel --prod
   ```
