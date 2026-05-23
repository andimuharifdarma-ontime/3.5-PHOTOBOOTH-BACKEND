---
description: Implementasi fitur Live Photo (seperti iPhone) untuk photobooth
---

# Rencana Implementasi Live Photo Feature

## Konsep
Menambahkan fitur "Live Photo" yang merekam video 5 detik dimulai saat countdown, sehingga menangkap momen sebelum dan sesudah foto diambil.

## Hasil Akhir
Setiap sesi foto akan menghasilkan **3 galeri digital**:
1. **Foto Utama** (4 foto dengan frame) - sudah ada ✅
2. **Video Bonus** (boomerang/GIF) - sudah ada ✅
3. **Live Photo** (video 5 detik per foto) - **BARU** 🆕

## Opsi Implementasi

### Opsi A: Mulai rekam saat countdown dimulai (REKOMENDASI)
**Timeline:**
- Detik 0-5: Countdown (rekam dimulai)
- Detik 5: Foto diambil (rekam terus berjalan)
- Detik 5-7: Setelah foto (rekam selesai, total ~7 detik)

**Kelebihan:**
- Menangkap ekspresi natural saat countdown
- Durasi lebih panjang (7 detik), lebih menarik
- Mirip konsep Live Photo iPhone

**Kekurangan:**
- File lebih besar (~3-4 MB per video)

### Opsi B: Rekam 2 detik sebelum + 3 detik sesudah foto
**Timeline:**
- Detik -2 sampai 0: Pre-capture (buffer)
- Detik 0: Foto diambil
- Detik 0-3: Post-capture
- Total: 5 detik

**Kelebihan:**
- Durasi lebih pendek, file lebih kecil
- Fokus pada momen foto

**Kekurangan:**
- Lebih kompleks (perlu buffer recording)
- Tidak menangkap countdown

## Langkah Implementasi (Opsi A - Rekomendasi)

### 1. Update Store untuk Live Photo
**File:** `src/store/usePhotoStore.ts`

Tambahkan state untuk menyimpan Live Photo URLs:
```typescript
interface PhotoData {
  id: string;
  dataUrl: string;
  originalUrl?: string;
  livePhotoUrl?: string; // BARU: URL video live photo
}

// Tambahkan fungsi untuk set live photo
setLivePhoto: (photoId: string, videoUrl: string) => {
  set((state) => ({
    photos: state.photos.map(p => 
      p.id === photoId ? { ...p, livePhotoUrl: videoUrl } : p
    )
  }));
}
```

### 2. Modifikasi PhotoSessionPage untuk Rekam Live Photo
**File:** `src/app/pages/PhotoSessionPage.tsx`

**A. Tambahkan state untuk MediaRecorder:**
```typescript
const [liveRecorder, setLiveRecorder] = useState<MediaRecorder | null>(null);
const [liveChunks, setLiveChunks] = useState<Blob[]>([]);
```

**B. Mulai rekam saat countdown dimulai:**
```typescript
const handleCapture = async () => {
  if (isCapturing || countdown !== null) return;
  
  // BARU: Mulai rekam live photo
  if (videoRef.current?.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream;
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps untuk kualitas bagus
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    recorder.start();
    setLiveRecorder(recorder);
    setLiveChunks(chunks);
  }
  
  // Countdown seperti biasa
  setCountdown(5);
  let current = 5;
  countdownTimerRef.current = setInterval(() => {
    current -= 1;
    if (current > 0) {
      setCountdown(current);
    } else {
      clearInterval(countdownTimerRef.current!);
      setCountdown(null);
      setIsCapturing(true);
      
      setTimeout(() => {
        handleCapturePhoto();
      }, 200);
    }
  }, 1000);
};
```

**C. Stop rekam setelah foto diambil (2 detik kemudian):**
```typescript
const handleCapturePhoto = () => {
  const rawDataUrl = capturePhoto();
  
  if (rawDataUrl) {
    setPendingPhotoUrl(rawDataUrl);
    setIsConfirmOpen(true);
    setIsCapturing(false);
    
    // BARU: Stop rekam live photo setelah 2 detik
    setTimeout(() => {
      if (liveRecorder && liveRecorder.state === 'recording') {
        liveRecorder.stop();
        
        liveRecorder.onstop = async () => {
          const blob = new Blob(liveChunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          
          // Simpan ke store (akan di-upload nanti)
          // Untuk sementara simpan di state dulu
          console.log('Live photo recorded:', videoUrl);
          // TODO: Upload ke storage dan simpan URL
        };
      }
    }, 2000);
  } else {
    setIsCapturing(false);
  }
};
```

### 3. Upload Live Photo ke Storage
**File:** `src/app/api/upload-live-photo/route.ts` (BARU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;
    const photoId = formData.get('photoId') as string;
    
    if (!file || !photoId) {
      return NextResponse.json({ error: 'Missing file or photoId' }, { status: 400 });
    }
    
    // Upload ke Vercel Blob
    const blob = await put(`live-photos/${photoId}.webm`, file, {
      access: 'public',
      addRandomSuffix: false,
    });
    
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload live photo error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

### 4. Tampilkan Live Photo di Result Page
**File:** `src/app/pages/FinalResultPage.tsx`

Tambahkan galeri ketiga untuk Live Photos:
```tsx
{/* Live Photos Gallery */}
<div className="mb-8">
  <h3 className="text-lg font-serif italic mb-4">📹 Live Photos</h3>
  <div className="grid grid-cols-2 gap-4">
    {photos.map((photo, idx) => (
      photo.livePhotoUrl && (
        <div key={idx} className="relative">
          <video 
            src={photo.livePhotoUrl}
            controls
            loop
            className="w-full rounded-lg"
          />
          <a
            href={photo.livePhotoUrl}
            download={`live-photo-${idx + 1}.webm`}
            className="absolute bottom-2 right-2 bg-white/90 px-3 py-1 rounded text-sm"
          >
            Unduh
          </a>
        </div>
      )
    ))}
  </div>
</div>
```

### 5. Backup Live Photos ke Google Drive
**File:** `src/app/api/backup-to-drive/route.ts`

Tambahkan loop untuk backup live photos:
```typescript
// 3. Backup live photos (jika ada)
for (let i = 0; i < 4; i++) {
  const livePhotoId = `${id}-live-${i}`;
  try {
    const liveResponse = await fetch(`${req.nextUrl.origin}/api/images/${livePhotoId}`);
    if (liveResponse.ok) {
      const liveBuffer = Buffer.from(await liveResponse.arrayBuffer());
      const fileName = `${userName || 'user'}_${livePhotoId}.webm`;
      
      const uploadResult = useOAuth
        ? await uploadToGoogleDriveOAuth(liveBuffer, fileName, 'video/webm', dailyFolderId)
        : await uploadToGoogleDrive(liveBuffer, fileName, 'video/webm', dailyFolderId);
      
      results.push({ type: `live-${i}`, ...uploadResult });
    }
  } catch (error) {
    console.error(`Error backing up live photo ${i}:`, error);
  }
}
```

## Estimasi Ukuran File
- **Per Live Photo:** ~2-3 MB (5-7 detik, 720p)
- **Total per sesi:** ~8-12 MB (4 live photos)
- **Dengan foto + bonus:** ~15-20 MB total per sesi

## Pertimbangan Teknis
1. **Browser Support:** MediaRecorder API didukung semua browser modern
2. **Format Video:** WebM (VP9) untuk kompatibilitas dan ukuran optimal
3. **Storage:** Gunakan Vercel Blob (sudah ada)
4. **Bandwidth:** Pastikan koneksi internet stabil untuk upload

## Catatan Penting
- Fitur ini akan meningkatkan penggunaan storage dan bandwidth
- Pastikan quota Vercel Blob mencukupi
- Bisa ditambahkan toggle di admin untuk enable/disable fitur ini

## Kapan Siap Eksekusi?
Beritahu saya kapan Anda siap, dan saya akan implementasikan step-by-step sesuai rencana di atas! 🚀
