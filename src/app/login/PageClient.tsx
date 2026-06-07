"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                // NextAuth seringkali membungkus error dengan "CredentialsSignin"
                if (res.error === "CredentialsSignin") {
                    setError("maaf email anda belum terdatar oleh admin atau pasword tidak cocok");
                } else {
                    setError(res.error);
                }
            } else {
                router.push("/admin");
            }
        } catch (err: any) {
            setError("Gagal masuk. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 bg-[radial-gradient(#EAE1D3_1px,transparent_1px)] [background-size:32px_32px]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white p-12 rounded-sm border border-[#EAE1D3] shadow-[0_30px_60px_-15px_rgba(74,63,53,0.1)]">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4A3F35] rounded-full mb-6 rotate-3 shadow-xl">
                            <LogIn className="w-8 h-8 text-[#FDFBF7]" />
                        </div>
                        <h1 className="text-3xl font-sans italic text-[#4A3F35] mb-2 text-nowrap">Dove Photobooth</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A68B67]">part of Dovelens.ft</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-sm text-xs font-bold uppercase tracking-widest mb-8 text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C7E6A] ml-1">Email Karyawan</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1C4B2] group-focus-within:text-[#A68B67] transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#FDFBF7] border border-[#EAE1D3] py-4 pl-12 pr-4 text-sm rounded-sm focus:outline-none focus:border-[#4A3F35] transition-all"
                                    placeholder="Email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C7E6A]">Kata Sandi</label>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1C4B2] group-focus-within:text-[#A68B67] transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#FDFBF7] border border-[#EAE1D3] py-4 pl-12 pr-12 text-sm rounded-sm focus:outline-none focus:border-[#4A3F35] transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D1C4B2] hover:text-[#A68B67] transition-colors p-1"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] py-4 rounded-sm transition-all shadow-xl shadow-[#4A3F35]/20 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 disabled:opacity-50 mt-10"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Masuk ke Dashboard"
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-[#F5F1EA] text-center">
                        <p className="text-[9px] text-[#D1C4B2] font-black uppercase tracking-widest leading-relaxed">
                            Aplikasi Pengembang v.0.1<br />
                            © 2026 Dovelens Photobooth
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
