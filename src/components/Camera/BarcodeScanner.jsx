// src/components/Camera/BarcodeScanner.jsx
import React, { useEffect, useRef, useState } from 'react';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    
    useEffect(() => {
        let html5QrCode = null;
        let script = null;
        
        const startScanner = () => {
            const element = document.getElementById("barcode-reader-container");
            if (!element) {
                setError('حدث خطأ في تهيئة الماسح');
                return;
            }
            
            try {
                html5QrCode = new window.Html5Qrcode("barcode-reader-container");
                scannerRef.current = html5QrCode;
                
                const config = {
                    fps: 10,
                    qrbox: { width: 300, height: 200 }
                };
                
                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    async (decodedText) => {
                        console.log('✅ Barcode detected:', decodedText);
                        
                        // ✅ منع التكرار
                        if (isProcessingRef.current) return;
                        isProcessingRef.current = true;
                        
                        setIsScanning(false);
                        
                        // ✅ إيقاف الماسح بأمان
                        try {
                            if (html5QrCode && html5QrCode.isRunning) {
                                await html5QrCode.stop();
                            }
                        } catch (stopErr) {
                            console.log('Scanner already stopped');
                        }
                        
                        // ✅ إرسال النتيجة إلى الدالة الأم
                        if (onScan) {
                            onScan(decodedText);
                        }
                        
                        // ✅ إغلاق الماسح بعد تأخير كافٍ
                        setTimeout(() => {
                            if (onClose) onClose();
                        }, 100);
                    },
                    (errorMessage) => {
                        // تجاهل أخطاء المسح
                    }
                ).catch(err => {
                    console.error("Start error:", err);
                    setError('فشل في تشغيل الكاميرا');
                });
                
            } catch (err) {
                console.error("Init error:", err);
                setError('خطأ في تهيئة الماسح');
            }
        };
        
        if (!window.Html5Qrcode) {
            script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
            script.onload = startScanner;
            script.onerror = () => setError('فشل في تحميل المكتبة');
            document.body.appendChild(script);
        } else {
            startScanner();
        }
        
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [onScan, onClose]);
    
    return (
        <div className={`fixed inset-0 z-50 ${darkMode ? 'bg-black' : 'bg-black/95'}`}>
            <div className="relative w-full h-full">
                <div id="barcode-reader-container" className="w-full h-full"></div>
                
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg z-10"
                >
                    ✕
                </button>
                
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-80 h-40 border-2 border-yellow-400 rounded-lg">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-yellow-400 animate-scan"></div>
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-10 left-0 right-0 text-center">
                    <div className="inline-block bg-black/70 px-4 py-2 rounded-full">
                        <p className="text-white text-sm">
                            {isScanning ? '📷 ضع الباركود داخل الإطار' : '✅ تم المسح بنجاح'}
                        </p>
                    </div>
                </div>
                
                {error && (
                    <div className="absolute bottom-24 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-center">
                        ⚠️ {error}
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-60px); }
                    100% { transform: translateY(60px); }
                }
                .animate-scan { animation: scan 2s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;