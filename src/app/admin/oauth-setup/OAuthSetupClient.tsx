"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Key, Copy, ExternalLink } from 'lucide-react';

const OAuthSetupClient: React.FC = () => {
  const searchParams = useSearchParams();
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const tokenParam = searchParams.get('refresh_token');

    if (success === 'true' && tokenParam) {
      setRefreshToken(tokenParam);
    } else if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleCopy = () => {
    if (refreshToken) {
      navigator.clipboard.writeText(refreshToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartOAuth = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EAE1D3] shadow-2xl p-12 lg:p-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16 pb-16 border-b border-[#F5F1EA]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[#A68B67]">
            <Key className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Cloud Infrastructure</span>
          </div>
          <h1 className="text-5xl font-sans font-bold text-[#4A3F35] tracking-tight">Google Drive OAuth</h1>
          <p className="text-[#8C7E6A] font-medium text-lg opacity-80">Konfigurasi jembatan penyimpanan mahakarya digital Anda.</p>
        </div>
        <div className="hidden md:block">
          <div className="w-16 h-px bg-[#A68B67]/30" />
        </div>
      </div>

      {!refreshToken && !error && (
        <div className="space-y-12">
          <div className="bg-[#F5F1EA] border border-[#EAE1D3] rounded-2xl p-10">
            <h3 className="text-[10px] font-bold text-[#4A3F35] uppercase tracking-widest mb-8 flex items-center gap-4">
              <span className="w-8 h-px bg-[#4A3F35]/20" />
              Prosedur Konfigurasi
            </h3>
            <ol className="space-y-6">
              {[
                "Inisiasi koneksi ke Google Drive Studio",
                "Autentikasi identitas melalui Portal Google",
                "Otorisasi akses aset digital studio",
                "Salin kode Refresh Token yang dihasilkan",
                "Integrasi kode ke dalam variabel sistem (.env)",
                "Sinkronisasi ulang layanan studio"
              ].map((step, idx) => (
                <li key={idx} className="flex items-center gap-6 group">
                  <span className="w-8 h-8 rounded-full border border-[#A68B67] flex items-center justify-center text-[10px] font-bold text-[#A68B67] group-hover:bg-[#A68B67] group-hover:text-white transition-all">
                    0{idx + 1}
                  </span>
                  <span className="text-sm font-medium text-[#4A3F35] opacity-80 group-hover:opacity-100 transition-opacity">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={handleStartOAuth}
            className="w-full bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] font-bold py-5 px-8 rounded-xl shadow-xl transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest group"
          >
            <ExternalLink className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
            <span>Connect Studio to Google Drive</span>
          </button>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50/50 border border-red-100 rounded-2xl p-10"
        >
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-4">Interupsi Konfigurasi</h3>
              <p className="font-medium text-red-700 mb-8 leading-relaxed">System encountered an issue: {error}</p>
              <button
                onClick={() => {
                  setError(null);
                  window.history.replaceState({}, '', '/admin/oauth-setup');
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-red-800 border-b border-red-300 hover:border-red-800 transition-all pb-1"
              >
                Inisiasi Ulang Proses
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {refreshToken && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="bg-[#F5F1EA] border border-[#EAE1D3] rounded-2xl p-10">
            <div className="flex items-start gap-6 mb-10">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-green-800 uppercase tracking-widest mb-2">Integrasi Berhasil</h3>
                <p className="font-medium text-green-700">
                  Kunci akses cloud telah didapatkan. Selesaikan tahap finalisasi di bawah.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 border border-[#EAE1D3]">
              <div className="flex items-center justify-between mb-6">
                <label className="text-[9px] font-bold text-[#8C7E6A] uppercase tracking-widest flex items-center gap-3">
                  <Key className="w-3 h-3" />
                  Studio Refresh Token
                </label>
                <button
                  onClick={handleCopy}
                  className="text-[9px] font-bold uppercase tracking-widest text-[#A68B67] hover:text-[#4A3F35] transition-colors flex items-center gap-2"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'BERHASIL DISALIN' : 'SALIN KODE'}
                </button>
              </div>
              <code className="block bg-[#FDFBF7] p-6 rounded-lg border border-[#F5F1EA] text-[10px] break-all font-mono text-[#4A3F35] leading-relaxed select-all">
                {refreshToken}
              </code>
            </div>
          </div>

          <div className="bg-[#1C1917] rounded-2xl p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-[10px] font-bold text-[#A68B67] uppercase tracking-widest mb-8">Tahap Finalisasi Sistem</h3>
            <div className="space-y-8 relative z-10">
              {[
                { label: 'Integrasi File Konfigurasi', code: 'nano .env.local', desc: 'Akses inti variabel lingkungan studio' },
                { label: 'Definisi Kunci Akses', code: `GOOGLE_REFRESH_TOKEN="${refreshToken.substring(0, 10)}..."`, desc: 'Implementasikan Refresh Token ke sistem' },
                { label: 'Restart Arsitektur', code: 'npm run dev', desc: 'Inisialisasi ulang layanan dengan kunci baru' }
              ].map((step, idx) => (
                <div key={idx} className="space-y-3">
                  <p className="text-[10px] font-bold text-[#FDFBF7] uppercase tracking-widest flex items-center gap-3">
                    <span className="text-[#A68B67]">{idx + 1}.</span> {step.label}
                  </p>
                  <code className="block bg-white/5 p-4 rounded-md text-[10px] font-mono text-[#A68B67] border border-white/5">{step.code}</code>
                  <p className="text-[8px] font-bold text-[#8C7E6A] uppercase tracking-widest">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <a
              href="/admin"
              className="block w-full py-5 bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] rounded-xl font-bold uppercase tracking-widest text-[10px] text-center shadow-2xl shadow-black/20 transition-all"
            >
              Kembali ke Arsitektur Studio
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OAuthSetupClient;


