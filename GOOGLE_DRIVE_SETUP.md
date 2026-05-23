# 📁 Setup Google Drive Auto-Backup

Fitur ini akan otomatis menyimpan semua hasil foto (frame utama + bonus video) ke Google Drive setiap kali user menyelesaikan sesi photobooth.

## 🔧 Langkah Setup

### 1. **Buat File `.env.local`**

Di root project, buat file `.env.local` (jika belum ada):

```bash
touch .env.local
```

### 2. **Tambahkan Environment Variables**

Buka file `.env.local` dan tambahkan konfigurasi berikut:

```env
# Google Drive Backup Configuration
GOOGLE_DRIVE_FOLDER_ID=10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw
GOOGLE_SERVICE_ACCOUNT_EMAIL=photobooth-uploader@photobooth-backup.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGXkllCY7C58g+\nRlWEGl/i/wOyy/Xn9MB3kf0+FGbQSljqIwFoMb6RIY5xKalLe2EDc476fRWsZKtM\nGM+w+6Nz+Jur60ajI4VRqrfaqhc4i+iA0zZSxPlQYXMmsrsx2VRA3BHXB+5BDRi9\nkcYA9anStVwVeP34yNvnV0XLHdQC2Zuq0k9ZMlJ+zf1/SV/rYn6ZqPMNVnz669hV\n3LEWkZ6gQelc0tcBxT2DGT5G7CZTXgPRBriiVQHSwwein98Vy/ulB67LCT27765d\nArJFwr/8tWnrdrfEHEBnt5Og9Lj/O2wYgDTAiQ93pWQvk2ZWw5fAgQm9TR1spMhI\nBaL+4MN/AgMBAAECggEAKM5Vh8jPCs4WVaUvS0UHq5DtCFdHpyckfpRUBXS576gT\noVqBHBd7jaxa+nFpB4OCYezgISwhDL0KtdU2yEADkEQ4dcWo2r9gWfvl5T/vFe1F\n71ZDiwRFCyF4yCGlO2xrFgqPSu4xN0WD7N8zXZgrjpJLNomUqRxcjDraOx3QMqOH\nWL6/88GKbg0MZBkGgqJPEWYwqaREIHZx3GRLEcUl24Z8HKSsA5otcHNhtQKFKtdR\nSwlM/zVCeFCc+135WmMZqoVd63WaIIlGDbFM4U74HCPwA1oHkiQT99QBE7Jh4it8\nfm2kf3oNtnohL+pFzvsVv/0+TdYz1biuWNp4+TLxvQKBgQDiZ3cXS0w3jPG9nv8U\nS3H2jozK1tCIsosUaMFjHsc29qyH8wgRIerpU3RTvuZBfyCw+FVQWdPxUUxSFZjY\nWUB43w2LSeF4ZP1TVK10cOs/w8gYkn9dSvCGENVmJqKlPaLKY7Fmtc0/mGZeu77A\nQ8ZgP6olTOekTmwVRfxMS1Vz1QKBgQDgTJyTRvrY4V5rjEtFc0fqNmZksjMqqa+I\n9YGgoDMnvgJYoN+tRNxyAYEecJYXxQeXfCOPGyTjeNAJh7E/tzDiiFG5/GwEACs+\nsS+Q5YukNFSub37vrRCcC1OtNoCR9y0Vnd3WBkedY6ZdoIDFJ4I9YQOWOzyRTU3r\nCzYqW9rIAwKBgF2M8yCk9HFfw+Pedvgj1ItUi8ikyrYxUFa2knIqnZaQhuoF+ida\nJH8VBNQ15V7a8N8vPdFdzL3CIg8o7Wc4OfO39xi/BnOBB0wPiTy8C/jlJSFCJ26d\nMJW1DviOrlYpCcMnPn56UL0ec+5hFYjMeIP8yolvJag232JK8N11o3GhAoGAY3iW\nV5o61MPdo8Rr/TjKw8usTSvaFSl7dzmpaxqglRdm4vc1Oxo2yThxkpZLee8fFscu\n3eAj091YJWHP8XnEbDIYTGrtXDjW9M6PUar66q9qfpFjsdcGbq13RnHNQu5jSBri\nrm/KgroWpZ7wfH6w+5dyh8VtbuLhk0M9mjtyIxECgYEA3sR6Xht1z9VNLMFwJwRL\nd4nMbY0Tb1JU/8KZLj5qNN88TRGZP1L4QbrZewK0X2y08EwbmJOQ8iLBIGGhjcmD\npzM8mt8hGfrQkXTVe+R5IUvdfA6TuI6w9j4wZ5evakkDwGj054QwjE6WNtNMYDZY\n3TIm1Y9HUvRgc2IvVJwZE4s=\n-----END PRIVATE KEY-----\n"
```

**⚠️ PENTING:** 
- Private key harus dalam quotes ganda (`"`)
- Jangan hapus `\n` di dalam private key
- Pastikan tidak ada spasi ekstra

### 3. **Restart Development Server**

Setelah menambahkan environment variables, restart server:

```bash
npm run dev
```

## 📁 Struktur Folder di Google Drive

Backup akan tersimpan otomatis di struktur:

```
📁 Photobooth Backups (Folder ID: 10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw)
  └── 📁 2025-11-07 (folder per tanggal)
       ├── 🖼️ Andi_cust-Andi-1699350000000_main.png
       ├── 🎬 Andi_cust-Andi-1699350000000_bonus.mp4
       ├── 🖼️ Budi_cust-Budi-1699351000000_main.png
       └── 🎬 Budi_cust-Budi-1699351000000_bonus.mp4
```

## ✅ Testing

### 1. **Check Environment Variables**

Pastikan environment variables sudah terbaca:

```bash
# Development
npm run dev

# Check di console browser (setelah sesi selesai):
# ✅ Google Drive backup successful: {...}
```

### 2. **Test Flow Lengkap**

1. Buka aplikasi photobooth
2. Input nama user
3. Ambil 4 foto
4. Pilih frame
5. Di halaman result, tunggu QR code generated
6. Check console browser untuk log:
   - `📤 Starting Google Drive backup...`
   - `✅ Google Drive backup successful: {...}`
7. Buka [Google Drive folder](https://drive.google.com/drive/folders/10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw)
8. Cari folder dengan tanggal hari ini
9. Verifikasi file sudah ter-upload

### 3. **Check Logs**

Jika ada error, check logs:

```bash
# Terminal server logs
# Look for:
# ✅ File uploaded to Google Drive: ...
# ❌ Google Drive upload error: ...
```

## 🔍 Troubleshooting

### Error: "Google Drive not configured"

**Solusi:**
- Pastikan file `.env.local` ada di root project
- Pastikan semua 3 environment variables sudah diset
- Restart server setelah menambahkan env vars

### Error: "Permission denied" atau "Invalid credentials"

**Solusi:**
1. Pastikan service account email sudah benar
2. Pastikan private key tidak rusak (copy paste dengan hati-hati)
3. Pastikan folder Google Drive sudah di-share dengan service account email:
   - Email: `photobooth-uploader@photobooth-backup.iam.gserviceaccount.com`
   - Permission: **Editor**

### Error: "Folder not found"

**Solusi:**
1. Check folder ID sudah benar: `10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw`
2. Buka folder di browser untuk verify:
   - https://drive.google.com/drive/folders/10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw
3. Pastikan folder accessible oleh service account

## 🚀 Production Deployment

Untuk deploy ke production (Vercel/hosting lain):

1. **Tambahkan Environment Variables di Dashboard**:
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

2. **Vercel Specific**:
   - Go to: Project Settings → Environment Variables
   - Add each variable
   - Redeploy

## 📊 Monitoring

Check backup status:

```javascript
// Di browser console setelah sesi selesai:
// Success log:
// ✅ Google Drive backup successful: {
//   success: true,
//   message: "Backup completed: 2/2 files uploaded",
//   results: [...]
// }

// Failed log:
// ⚠️ Google Drive backup failed: {...}
```

## 🔒 Keamanan

**⚠️ JANGAN:**
- Commit file `.env.local` ke Git
- Share private key di public
- Commit service account JSON ke repository

**✅ LAKUKAN:**
- Tambahkan `.env.local` ke `.gitignore` (sudah default)
- Simpan credentials di environment variables
- Rotasi credentials secara berkala

## 📝 File yang Dibuat

1. `src/lib/googleDrive.ts` - Helper functions untuk Google Drive API
2. `src/app/api/backup-to-drive/route.ts` - API endpoint untuk backup
3. Update `src/app/pages/FinalResultPage.tsx` - Auto-backup logic

## 🎯 Fitur

- ✅ Auto-backup setiap sesi selesai
- ✅ Organisasi file per tanggal
- ✅ Backup frame utama (PNG)
- ✅ Backup bonus video (MP4)
- ✅ Naming convention: `{userName}_{imageId}_{type}.{ext}`
- ✅ Graceful error handling (aplikasi tetap jalan jika backup gagal)
- ✅ Background process (tidak blocking user experience)

## 📞 Support

Jika ada masalah atau pertanyaan, check:
- Google Cloud Console: https://console.cloud.google.com/
- Service Account: https://console.cloud.google.com/iam-admin/serviceaccounts
- Google Drive API: https://console.cloud.google.com/apis/api/drive.googleapis.com

---

**Selamat! Fitur backup otomatis ke Google Drive sudah aktif! 🎉**

