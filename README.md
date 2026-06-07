# <img src="/public/logo/LOGO5.png" width="40" height="40" align="center" /> Dovelens.ft - Self Photo Booth

Aplikasi **Self-Photo Booth** modern yang dirancang untuk efisiensi operasional studio foto. Mendukung sistem manajemen multi-tenancy, integrasi pembayaran digital, dan dashboard analitik yang lengkap.

---

## 🌟 Fitur Utama
- **Multi-Tenancy Themes & Frames**: Setiap Client dapat memiliki koleksi tema dan bingkai mereka sendiri.
- **Role-Based Access Control**:
  - **ADMIN**: Kontrol penuh atas seluruh sistem dan akun.
  - **KARYAWAN**: Akses operasional dengan batasan manajemen.
  - **CLIENT**: Akses khusus untuk mengelola studio dan koleksi pribadi.
- **Integrasi Pembayaran DOKU**: Sistem pembayaran QRIS/VA per-akun untuk model bisnis bagi hasil.
- **Mode Non-Payment**: Opsi untuk penyewaan studio full-time tanpa pembayaran per-cetak.
- **Security Hardening**: Proteksi API admin, limitasi upload file, dan enkripsi data.
- **Responsive Dashboard**: Monitoring transaksi, stok modal, dan performa bisnis secara real-time.

---

## 🚀 Persyaratan Sistem
- **Node.js** (v18 atau lebih baru)
- **PostgreSQL / MySQL / Supabase** (Sebagai database utama)
- **Prisma ORM**
- **DOKU Account** (Untuk aktivasi fitur pembayaran)

---

## 📥 Cara Penggunaan (Clone/Pull)

Jika Anda ingin menggunakan repository ini di lingkungan lokal Anda, ikuti langkah-langkah berikut:

### 1. Clone Repository
```bash
git clone https://github.com/username/repository-name.git
cd repository-name
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env` di direktori root dan lengkapi data berikut:
```env
DATABASE_URL="your_database_url"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"

# DOKU API Configuration (Optional)
DOKU_CLIENT_ID="your_client_id"
DOKU_SHARED_KEY="your_shared_key"

# Google Auth/Drive (Optional)
GOOGLE_CLIENT_ID="your_google_id"
GOOGLE_CLIENT_SECRET="your_google_secret"
```

### 4. Sinkronisasi Database
```bash
npx prisma db push
npx prisma generate
```

### 5. Menjalankan Server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## 🛠 Tech Stack
- **Framework**: [Next.js 14+](https://nextjs.org/)
- **Database**: [Prisma](https://www.prisma.io/) with PostgreSQL
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: Tailwind CSS & Framer Motion
- **Icons**: Lucide React

---
Developed with ❤️ by **Dovelens.ft**
