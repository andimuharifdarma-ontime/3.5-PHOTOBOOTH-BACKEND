# Panduan Setup Cloudflare WAF

Panduan ini menjelaskan cara mengkonfigurasi Cloudflare sebagai *Web Application Firewall* (WAF) untuk aplikasi Photobooth Dovelens.

---

## 1. Tambahkan Domain ke Cloudflare

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klik **Add a Site** dan masukkan domain Anda
3. Pilih plan **Free** (sudah cukup untuk WAF dasar)
4. Update nameserver di registrar domain Anda ke nameserver Cloudflare

---

## 2. Aktifkan Proxy (Orange Cloud)

Di tab **DNS**:
- Pastikan **semua** record A/CNAME memiliki ikon **awan oranye** (Proxied)
- Ini memastikan trafik melewati Cloudflare terlebih dahulu sebelum ke server

---

## 3. SSL/TLS Configuration

Di tab **SSL/TLS** → **Overview**:
- Set encryption mode ke **Full (Strict)**
- Ini memastikan enkripsi ujung-ke-ujung (Cloudflare ↔ Server ↔ User)

Di tab **SSL/TLS** → **Edge Certificates**:
- Aktifkan **Always Use HTTPS**: ✅
- Aktifkan **Automatic HTTPS Rewrites**: ✅
- Set **Minimum TLS Version**: `TLS 1.2`

---

## 4. Security Settings

Di tab **Security** → **Settings**:
- **Security Level**: Set ke `High`
- **Challenge Passage**: `30 minutes`
- **Browser Integrity Check**: ✅ Aktif

Di tab **Security** → **Bots**:
- **Bot Fight Mode**: ✅ Aktifkan
- Ini memblokir bot otomatis, scraper, dan crawler berbahaya

---

## 5. WAF Rules (Managed Rules)

Di tab **Security** → **WAF**:
- **Managed Rules**: Aktifkan rule set **Cloudflare Managed Ruleset**
- Ini melindungi dari OWASP Top 10 secara otomatis (SQL injection, XSS, dll)

### Custom Rules (Opsional):

Buat custom rule untuk:

1. **Block non-Indonesia traffic** (jika hanya melayani Indonesia):
   - Expression: `ip.geoip.country ne "ID"`
   - Action: Block

2. **Rate limit pada /api/auth**:
   - Expression: `http.request.uri.path contains "/api/auth"`
   - Rate: 10 requests per 10 seconds
   - Action: Block

---

## 6. Page Rules (Opsional)

- **Cache Level**: `Bypass` untuk `/api/*` (agar API tidak di-cache)
- **Cache Level**: `Standard` untuk `/logo/*`, `/frames/*` (asset statis)

---

## 7. Verifikasi

Setelah setup, verifikasi dengan:

```bash
# Cek apakah trafik sudah lewat Cloudflare
curl -I https://yourdomain.com

# Harus ada header: cf-ray, cf-cache-status, server: cloudflare
```
