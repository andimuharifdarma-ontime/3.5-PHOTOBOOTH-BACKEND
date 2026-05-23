# 🔐 Google Drive OAuth Setup Guide

Panduan lengkap setup OAuth 2.0 untuk backup Google Drive (menggantikan Service Account yang bermasalah dengan storage quota).

## ✅ **Kenapa OAuth?**

- ✅ **Tidak ada masalah storage quota** seperti Service Account
- ✅ **Upload ke My Drive biasa** (tidak perlu Shared Drive/Workspace)
- ✅ **Setup sekali** saja, token auto-refresh
- ✅ **Lebih mudah** untuk personal use

---

## 📋 **Langkah 1: Setup di Google Cloud Console**

### **1.1. Buka Google Cloud Console**
- https://console.cloud.google.com/
- Pilih project: `photobooth-backup` (atau buat baru jika belum ada)

### **1.2. Enable Google Drive API**
1. Go to: **APIs & Services** → **Library**
2. Search: `Google Drive API`
3. Click **Enable**

### **1.3. Buat OAuth 2.0 Credentials**
1. Go to: **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Configure:
   - **Application type**: Web application
   - **Name**: `Photobooth OAuth Client`
   - **Authorized redirect URIs**: 
     ```
     http://localhost:3000/api/auth/google/callback
     ```
     (Untuk production, tambahkan juga: `https://your-domain.com/api/auth/google/callback`)
4. Click **Create**
5. **SIMPAN** Client ID dan Client Secret yang muncul!

### **1.4. Configure OAuth Consent Screen**
1. Go to: **APIs & Services** → **OAuth consent screen**
2. User Type: **External** (untuk personal Gmail)
3. Fill required info:
   - **App name**: `Photobooth Backup`
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com
4. Click **Save and Continue**

5. **Scopes**: Click **Add or Remove Scopes**
   - Search dan tambahkan: `https://www.googleapis.com/auth/drive.file`
   - Click **Update** → **Save and Continue**

6. **Test Users**: Click **+ Add Users**
   - Tambahkan email Gmail Anda (yang akan digunakan untuk backup)
   - Click **Save and Continue**

7. Click **Back to Dashboard**

---

## 📝 **Langkah 2: Update Environment Variables**

### **2.1. Buka file `.env.local`**

```bash
nano .env.local
```

### **2.2. Tambahkan/Update konfigurasi:**

```env
# Google Drive OAuth Configuration
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_DRIVE_FOLDER_ID="1SsIZE69MCf0495QWv0zyiUU1JrBbT95k"

# Refresh token akan ditambahkan setelah OAuth flow
# GOOGLE_REFRESH_TOKEN="akan-diisi-setelah-oauth"
```

**Replace:**
- `your-client-id-here` dengan Client ID dari step 1.3
- `your-client-secret-here` dengan Client Secret dari step 1.3

### **2.3. Save file**

```bash
# Save dan keluar (Ctrl+X, Y, Enter)
```

---

## 🔄 **Langkah 3: Jalankan OAuth Flow**

### **3.1. Restart server**

```bash
npm run dev
```

### **3.2. Buka halaman OAuth setup**

Di browser, buka:
```
http://localhost:3000/admin/oauth-setup
```

### **3.3. Klik "Connect Google Drive"**
- Akan redirect ke Google login
- Login dengan akun Gmail yang akan digunakan untuk backup
- **Pilih account** yang sama dengan yang ada di Test Users (step 1.4.6)

### **3.4. Grant permissions**
- Google akan minta izin akses ke Drive
- Klik **Allow** atau **Continue**

### **3.5. Copy Refresh Token**
- Setelah berhasil, akan muncul **Refresh Token**
- Click **Copy** button untuk copy token

### **3.6. Tambahkan Refresh Token ke .env.local**

Buka lagi `.env.local`:
```bash
nano .env.local
```

Tambahkan line ini:
```env
GOOGLE_REFRESH_TOKEN="1//your-very-long-refresh-token-here"
```

Save file (Ctrl+X, Y, Enter)

### **3.7. Restart server (final)**

```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## ✅ **Langkah 4: Test Backup**

### **4.1. Lakukan sesi photobooth lengkap**
1. Input nama
2. Ambil 4 foto
3. Pilih frame
4. Tunggu di halaman result

### **4.2. Check terminal logs**

**✅ Sukses:**
```
🔐 Using auth method: OAuth
📤 Backing up main image: cust-xxx-xxx
📁 Using existing folder: 2025-11-07
✅ File uploaded to Google Drive (OAuth): nama_file_main.png
✅ Main image backup: SUCCESS
📤 Backing up bonus video: cust-xxx-xxx-bonus
✅ File uploaded to Google Drive (OAuth): nama_file_bonus.mp4
✅ Bonus video backup: SUCCESS
```

**❌ Error:**
```
⚠️ Google Drive credentials not configured
   - OAuth (GOOGLE_REFRESH_TOKEN): MISSING
   💡 Setup OAuth: http://localhost:3000/admin/oauth-setup
```

### **4.3. Verifikasi di Google Drive**
- Buka: https://drive.google.com/drive/u/0/folders/1SsIZE69MCf0495QWv0zyiUU1JrBbT95k
- Check folder dengan tanggal hari ini
- File seharusnya sudah ada! 🎉

---

## 📁 **Struktur File .env.local Lengkap**

```env
# Google Drive OAuth Configuration (RECOMMENDED)
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_REFRESH_TOKEN="1//0abc-def-xyz-refresh-token-here"
GOOGLE_DRIVE_FOLDER_ID="1SsIZE69MCf0495QWv0zyiUU1JrBbT95k"

# Service Account (FALLBACK - optional, jika OAuth tidak diset)
# GOOGLE_SERVICE_ACCOUNT_EMAIL="photobooth-uploader@photobooth-backup.iam.gserviceaccount.com"
# GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔍 **Troubleshooting**

### **Error: "redirect_uri_mismatch"**
**Solusi:**
- Pastikan redirect URI di Google Cloud Console sama persis dengan `.env.local`
- Format: `http://localhost:3000/api/auth/google/callback` (no trailing slash!)

### **Error: "invalid_grant" atau "refresh token expired"**
**Solusi:**
1. Hapus `GOOGLE_REFRESH_TOKEN` dari `.env.local`
2. Ulangi OAuth flow dari langkah 3
3. Dapatkan refresh token baru

### **Error: "Access blocked: This app's request is invalid"**
**Solusi:**
- Pastikan email Anda sudah ditambahkan di **Test Users** (step 1.4.6)
- Pastikan menggunakan akun Gmail yang sama

### **Error: "Google Drive credentials not configured"**
**Solusi:**
1. Check semua env vars sudah diset:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
2. Restart server setelah update `.env.local`

---

## 🚀 **Production Deployment**

### **Vercel/Netlify:**

1. **Update Redirect URI di Google Cloud Console:**
   - Tambahkan: `https://your-domain.com/api/auth/google/callback`

2. **Set Environment Variables di dashboard:**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (production URL)
   - `GOOGLE_DRIVE_FOLDER_ID`

3. **Jalankan OAuth flow di production:**
   - Buka: `https://your-domain.com/admin/oauth-setup`
   - Complete OAuth flow
   - Copy refresh token
   - Add `GOOGLE_REFRESH_TOKEN` ke env vars di dashboard

4. **Redeploy**

---

## 💡 **Tips**

### **Token Refresh Otomatis**
- Refresh token **tidak expire** (unless revoked)
- Access token auto-refresh otomatis oleh googleapis
- Tidak perlu manual refresh!

### **Multiple Google Accounts**
- Untuk backup ke multiple accounts, buat OAuth client terpisah
- Atau gunakan service account di Shared Drive

### **Security**
- ⚠️ **JANGAN commit refresh token ke Git!**
- `.env.local` sudah di-gitignore by default
- Simpan refresh token di password manager

---

## 📚 **Referensi**

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Guide](https://developers.google.com/drive/api/guides/about-sdk)
- [NextAuth.js Documentation](https://next-auth.js.org/)

---

**✅ Setup Selesai!** Backup otomatis ke Google Drive sudah aktif dengan OAuth! 🎉

