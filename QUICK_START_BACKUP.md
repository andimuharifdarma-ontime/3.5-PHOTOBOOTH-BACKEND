# 🚀 Quick Start: Google Drive Auto-Backup

## Setup Cepat (2 Menit)

### Opsi 1: Otomatis dengan Script

```bash
# Jalankan script setup
./setup-google-drive.sh

# Restart server
npm run dev
```

### Opsi 2: Manual

1. **Buat file `.env.local`** di root project:
```bash
touch .env.local
```

2. **Copy-paste konfigurasi ini** ke dalam `.env.local`:
```env
GOOGLE_DRIVE_FOLDER_ID=10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw
GOOGLE_SERVICE_ACCOUNT_EMAIL=photobooth-uploader@photobooth-backup.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGXkllCY7C58g+\nRlWEGl/i/wOyy/Xn9MB3kf0+FGbQSljqIwFoMb6RIY5xKalLe2EDc476fRWsZKtM\nGM+w+6Nz+Jur60ajI4VRqrfaqhc4i+iA0zZSxPlQYXMmsrsx2VRA3BHXB+5BDRi9\nkcYA9anStVwVeP34yNvnV0XLHdQC2Zuq0k9ZMlJ+zf1/SV/rYn6ZqPMNVnz669hV\n3LEWkZ6gQelc0tcBxT2DGT5G7CZTXgPRBriiVQHSwwein98Vy/ulB67LCT27765d\nArJFwr/8tWnrdrfEHEBnt5Og9Lj/O2wYgDTAiQ93pWQvk2ZWw5fAgQm9TR1spMhI\nBaL+4MN/AgMBAAECggEAKM5Vh8jPCs4WVaUvS0UHq5DtCFdHpyckfpRUBXS576gT\noVqBHBd7jaxa+nFpB4OCYezgISwhDL0KtdU2yEADkEQ4dcWo2r9gWfvl5T/vFe1F\n71ZDiwRFCyF4yCGlO2xrFgqPSu4xN0WD7N8zXZgrjpJLNomUqRxcjDraOx3QMqOH\nWL6/88GKbg0MZBkGgqJPEWYwqaREIHZx3GRLEcUl24Z8HKSsA5otcHNhtQKFKtdR\nSwlM/zVCeFCc+135WmMZqoVd63WaIIlGDbFM4U74HCPwA1oHkiQT99QBE7Jh4it8\nfm2kf3oNtnohL+pFzvsVv/0+TdYz1biuWNp4+TLxvQKBgQDiZ3cXS0w3jPG9nv8U\nS3H2jozK1tCIsosUaMFjHsc29qyH8wgRIerpU3RTvuZBfyCw+FVQWdPxUUxSFZjY\nWUB43w2LSeF4ZP1TVK10cOs/w8gYkn9dSvCGENVmJqKlPaLKY7Fmtc0/mGZeu77A\nQ8ZgP6olTOekTmwVRfxMS1Vz1QKBgQDgTJyTRvrY4V5rjEtFc0fqNmZksjMqqa+I\n9YGgoDMnvgJYoN+tRNxyAYEecJYXxQeXfCOPGyTjeNAJh7E/tzDiiFG5/GwEACs+\nsS+Q5YukNFSub37vrRCcC1OtNoCR9y0Vnd3WBkedY6ZdoIDFJ4I9YQOWOzyRTU3r\nCzYqW9rIAwKBgF2M8yCk9HFfw+Pedvgj1ItUi8ikyrYxUFa2knIqnZaQhuoF+ida\nJH8VBNQ15V7a8N8vPdFdzL3CIg8o7Wc4OfO39xi/BnOBB0wPiTy8C/jlJSFCJ26d\nMJW1DviOrlYpCcMnPn56UL0ec+5hFYjMeIP8yolvJag232JK8N11o3GhAoGAY3iW\nV5o61MPdo8Rr/TjKw8usTSvaFSl7dzmpaxqglRdm4vc1Oxo2yThxkpZLee8fFscu\n3eAj091YJWHP8XnEbDIYTGrtXDjW9M6PUar66q9qfpFjsdcGbq13RnHNQu5jSBri\nrm/KgroWpZ7wfH6w+5dyh8VtbuLhk0M9mjtyIxECgYEA3sR6Xht1z9VNLMFwJwRL\nd4nMbY0Tb1JU/8KZLj5qNN88TRGZP1L4QbrZewK0X2y08EwbmJOQ8iLBIGGhjcmD\npzM8mt8hGfrQkXTVe+R5IUvdfA6TuI6w9j4wZ5evakkDwGj054QwjE6WNtNMYDZY\n3TIm1Y9HUvRgc2IvVJwZE4s=\n-----END PRIVATE KEY-----\n"
```

3. **Restart server**:
```bash
npm run dev
```

## ✅ Testing

1. Buka aplikasi photobooth
2. Selesaikan satu sesi (input nama → foto 4x → pilih frame)
3. Di halaman result, check browser console:
   ```
   📤 Starting Google Drive backup...
   ✅ Google Drive backup successful: {...}
   ```
4. Buka Google Drive: [Link Folder](https://drive.google.com/drive/folders/10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw)
5. Lihat folder dengan tanggal hari ini
6. Verifikasi file sudah ada (PNG + MP4)

## 📁 Hasil Backup

File akan tersimpan dengan format:
```
NamaUser_timestamp_main.png   (Foto dengan frame)
NamaUser_timestamp_bonus.mp4  (Video bonus)
```

Contoh:
```
Andi_cust-Andi-1699350000000_main.png
Andi_cust-Andi-1699350000000_bonus.mp4
```

## 🔍 Troubleshooting

**Backup tidak jalan?**

1. Check file `.env.local` sudah dibuat
2. Restart server: `npm run dev`
3. Check console browser untuk error
4. Baca [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) untuk detail

**File tidak muncul di Drive?**

1. Check folder: https://drive.google.com/drive/folders/10-oZnX58peCZ8Pz8E-jIxASvBlNMMiyw
2. Cari folder dengan tanggal hari ini (format: YYYY-MM-DD)
3. Check service account permissions di folder settings

## 📚 Dokumentasi Lengkap

Untuk setup advanced dan troubleshooting detail, baca:
- [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) - Setup lengkap dan troubleshooting
- [Google Drive API Docs](https://developers.google.com/drive/api/v3/about-sdk)

## 🎯 Fitur

✅ Auto-backup setiap sesi selesai  
✅ Organisasi file per tanggal  
✅ Backup frame utama + bonus video  
✅ Background process (tidak ganggu user)  
✅ Graceful error handling  

---

**Selamat! Fitur backup otomatis sudah siap! 🎉**

