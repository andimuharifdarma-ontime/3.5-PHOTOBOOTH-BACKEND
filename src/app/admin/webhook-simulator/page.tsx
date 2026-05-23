'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WebhookSimulatorPage() {
    const router = useRouter();
    const [orderId, setOrderId] = useState('');
    const [status, setStatus] = useState<'50' | '35' | '20'>('50');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleSimulate = async () => {
        if (!orderId.trim()) {
            alert('Order ID harus diisi!');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/payment/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionId: `SIM${Date.now()}`,
                    invoiceNumber: orderId.trim(),
                    transactionStatus: status,
                    activityCode: status === '50' ? '200' : '280',
                    message: status === '50' ? 'Transaction is Success' : status === '35' ? 'Transaction Failed' : 'Transaction Unpaid',
                    processDate: new Date().toISOString(),
                    createdTime: Date.now().toString()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setResult(`✅ Webhook berhasil! Status order ${orderId} diupdate menjadi ${status === '50' ? 'PAID' : status === '35' ? 'FAILED' : 'PENDING'}`);
            } else {
                setResult(`❌ Error: ${data.responseMessage || 'Unknown error'}`);
            }
        } catch (error) {
            setResult(`❌ Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">DOKU Webhook Simulator</h1>
                        <button
                            onClick={() => router.push('/admin/orders')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            ← Back to Orders
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Order ID / Invoice Number
                            </label>
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Paste Order ID here (e.g., 6969c354848dabf80ac8ed38)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Copy Order ID dari console log atau dari URL setelah checkout
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transaction Status
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="50"
                                        checked={status === '50'}
                                        onChange={(e) => setStatus(e.target.value as '50')}
                                        className="mr-2"
                                    />
                                    <span className="text-green-600 font-medium">50 - Success (PAID)</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="35"
                                        checked={status === '35'}
                                        onChange={(e) => setStatus(e.target.value as '35')}
                                        className="mr-2"
                                    />
                                    <span className="text-red-600 font-medium">35 - Failed</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="20"
                                        checked={status === '20'}
                                        onChange={(e) => setStatus(e.target.value as '20')}
                                        className="mr-2"
                                    />
                                    <span className="text-yellow-600 font-medium">20 - Unpaid (PENDING)</span>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleSimulate}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-md transition-colors"
                        >
                            {loading ? 'Sending Webhook...' : 'Simulate Webhook'}
                        </button>

                        {result && (
                            <div className={`p-4 rounded-md ${result.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                <p className="text-sm font-medium">{result}</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 rounded-md">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Cara Pakai:</h3>
                        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                            <li>Lakukan pembayaran di DOKU (bisa fake payment di sandbox)</li>
                            <li>Setelah "Payment Successful", copy Order ID dari console browser atau URL</li>
                            <li>Paste Order ID di form atas</li>
                            <li>Pilih status "50 - Success" untuk simulasi pembayaran berhasil</li>
                            <li>Klik "Simulate Webhook"</li>
                            <li>Kembali ke halaman result - QR code akan langsung terbuka!</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
