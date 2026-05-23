'use client';

import { Check, Clock, Printer, Trash2, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface PrintOrder {
    id: string;
    userName: string;
    frameName: string;
    quantity: number;
    pricePerFrame: number;
    totalPrice: number;
    imageUrl: string;
    paymentStatus: string;
    printedAt: string | null;
    createdAt: string;
}

interface OrderRowProps {
    order: PrintOrder;
    isPaymentEnabled?: boolean;
    isAdmin?: boolean;
    markAsPrinted: (id: string) => void;
    syncOrder: (id: string) => void;
    onDelete?: (id: string) => void;
}

export default function OrderRow({ order, isPaymentEnabled = true, isAdmin = false, markAsPrinted, syncOrder, onDelete }: OrderRowProps) {
    const getStatusBadge = (status: string) => {
        if (!isPaymentEnabled && (status === 'paid' || status === 'printed')) {
            return <Badge variant="success">FREE AKSES</Badge>;
        }
        
        switch (status) {
            case 'pending':
                return <Badge variant="warning">Menunggu Bayar</Badge>;
            case 'paid':
                return <Badge variant="info">Sudah Bayar</Badge>;
            case 'printed':
                return <Badge variant="success">Sudah Cetak</Badge>;
            case 'cancelled':
                return <Badge variant="error" className="opacity-50 line-through">Dibatalkan</Badge>;
            case 'failed':
                return <Badge variant="error">Gagal Bayar</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    const handlePrintAndConfirm = async () => {
        try {
            // 1. Resolve actual image URL (from download link to API endpoint)
            let actualImageUrl = order.imageUrl;
            if (order.imageUrl.includes('/download/')) {
                const parts = order.imageUrl.split('/');
                const idWithQuery = parts[parts.length - 1];
                const id = idWithQuery.split('?')[0];
                actualImageUrl = `/api/images/${id}`;
            }

            // 2. Load the image and check aspect ratio
            const img = new Image();
            img.src = actualImageUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Gagal memuat gambar hasil foto.'));
            });

            const isStrip = img.naturalHeight >= img.naturalWidth * 2.5;
            const paperWidthMm = 102;
            const paperHeightMm = 152;
            const numSheets = order.quantity || 1;

            // 3. Create hidden iframe for printing (identical to FinalResultPage)
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.setAttribute('aria-hidden', 'true');
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) return;

            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Print Admin Fulfillment</title>
                        <style>
                            * { box-sizing: border-box; }
                            @page { size: ${paperWidthMm}mm ${paperHeightMm}mm; margin: 0; }
                            html, body { 
                                width: ${paperWidthMm}mm; 
                                margin: 0; 
                                padding: 0; 
                                background: white;
                            }
                            .page {
                                width: ${paperWidthMm}mm;
                                height: ${paperHeightMm}mm;
                                display: flex;
                                flex-direction: row;
                                margin: 0;
                                padding: 0;
                                page-break-inside: avoid;
                                page-break-after: always;
                                overflow: hidden;
                                position: relative;
                            }
                            .strip-container {
                                width: ${isStrip ? '50%' : '100% '};
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                overflow: hidden;
                            }
                            img { 
                                display: block;
                                width: 100.2%;
                                height: 100.2%;
                                object-fit: cover;
                            }
                        </style>
                    </head>
                    <body>
                        ${Array.from({ length: numSheets }).map(() => `
                            <div class="page">
                                <div class="strip-container">
                                    <img src="${actualImageUrl}" />
                                </div>
                                ${isStrip ? `
                                <div class="strip-container">
                                    <img src="${actualImageUrl}" />
                                </div>
                                ` : ''}
                            </div>
                        `).join('')}
                        <script>
                            window.onload = () => {
                                window.focus();
                                setTimeout(() => { window.print(); window.close(); }, 500);
                            };
                        </script>
                    </body>
                </html>
            `);
            doc.close();

            // 4. Cleanup iframe after print
            setTimeout(() => {
                try { document.body.removeChild(iframe); } catch(e) {}
            }, 10000);

            // 5. Mark as printed in database
            markAsPrinted(order.id);

        } catch (error: any) {
            console.error('Failed to print from Admin:', error);
            alert(error.message || 'Gagal memproses cetak. Pastikan printer terhubung.');
        }
    };

    return (
        <tr className="hover:bg-[#FDFBF7] transition-all duration-300 group">
            <td className="px-10 py-8">
                <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-[#4A3F35] flex items-center justify-center text-[#FDFBF7] font-sans font-bold text-lg shadow-lg shadow-black/10 group-hover:scale-110 transition-transform">
                        {order.userName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#4A3F35] first-letter:uppercase lowercase opacity-90">{order.userName}</p>
                        <p className="text-[8px] font-bold text-[#A68B67] uppercase tracking-widest mt-1">Studio Client</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-8">
                <p className="text-[11px] font-bold text-[#4A3F35] uppercase tracking-wider">{order.frameName}</p>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-px bg-[#EAE1D3]" />
                    <p className="text-[8px] font-bold text-[#A68B67] uppercase tracking-widest leading-none">Creative Asset</p>
                </div>
            </td>
            <td className="px-6 py-8 text-center text-[11px] font-sans font-bold text-[#4A3F35]">
                {order.quantity} {isPaymentEnabled ? 'Sesi' : 'Lembar'}
            </td>
            {isPaymentEnabled && (
                <td className="px-6 py-8 text-right">
                    <p className="text-xs font-bold text-[#4A3F35]">Rp {order.totalPrice.toLocaleString('id-ID')}</p>
                    <p className="text-[8px] text-[#A68B67] uppercase tracking-widest font-bold mt-1">Total Nett</p>
                </td>
            )}
            <td className="px-6 py-8">
                <div className="flex justify-center">
                    {getStatusBadge(order.paymentStatus)}
                </div>
            </td>
            <td className="px-6 py-8">
                <p className="text-[10px] font-bold text-[#4A3F35] opacity-80">
                    {new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[8px] text-[#A68B67] font-bold uppercase tracking-widest mt-1">
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </td>
            <td className="px-10 py-8 text-right">
                {order.paymentStatus === 'paid' && (
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2 text-[8px] font-bold text-[#A68B67] uppercase tracking-[0.2em] animate-pulse">
                            <Clock className="w-2.5 h-2.5" />
                            Auto-Close: {(() => {
                                const diff = new Date(order.createdAt).getTime() + 3600000 - Date.now();
                                if (diff <= 0) return 'Proses...';
                                return `${Math.floor(diff / 60000)} menit lagi`;
                            })()}
                        </div>
                        <button
                            onClick={handlePrintAndConfirm}
                            className="inline-flex items-center gap-3 px-6 py-3 bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#4A3F35]/10 hover:shadow-xl active:scale-95 group/btn"
                        >
                            <Printer className="w-3.5 h-3.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            Konfirmasi Cetak
                        </button>
                    </div>
                )}

                {order.paymentStatus === 'printed' && (
                    <div className="inline-flex items-center gap-3 text-green-600 text-[9px] font-bold uppercase tracking-widest bg-green-50 px-4 py-2 border border-green-100 rounded-xl">
                        <Check className="w-3.5 h-3.5" />
                        Selesai Produksi
                    </div>
                )}
                {order.paymentStatus === 'pending' && (
                    <div className="flex flex-col items-end gap-3">
                        <div className="inline-flex items-center gap-3 text-[#A68B67] text-[9px] font-bold uppercase tracking-widest bg-[#F5F1EA] px-4 py-2 border border-[#EAE1D3] rounded-xl">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            Menunggu Reservasi
                        </div>
                        <button
                            onClick={() => syncOrder(order.id)}
                            className="text-[8px] font-bold text-[#A68B67] hover:text-[#4A3F35] uppercase tracking-widest underline decoration-[#EAE1D3] underline-offset-4"
                        >
                            Tap to Sync Status
                        </button>
                    </div>
                )}
                {order.paymentStatus === 'cancelled' && (
                    <div className="inline-flex items-center gap-3 text-red-500 text-[9px] font-bold uppercase tracking-widest border border-red-50 px-4 py-2 rounded-xl bg-red-50">
                        <X className="w-3.5 h-3.5" />
                        Dibatalkan
                    </div>
                )}
                {order.paymentStatus === 'failed' && (
                    <div className="inline-flex items-center gap-3 text-red-500 text-[9px] font-bold uppercase tracking-widest bg-red-50 px-4 py-2 border border-red-100 rounded-xl">
                        <X className="w-3.5 h-3.5" />
                        Pembayaran Gagal
                    </div>
                )}

                {/* Admin Delete Button */}
                {isAdmin && onDelete && (
                    <button
                        onClick={() => onDelete(order.id)}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-all border border-red-100 hover:border-red-200 active:scale-95"
                    >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                    </button>
                )}
            </td>
        </tr>
    );
}
