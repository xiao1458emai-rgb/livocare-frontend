// src/components/Camera/BarcodeScanner.jsx (النسخة المعدلة بالكامل)
import React, { useEffect, useRef, useState } from 'react';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef(null);
    const isClosingRef = useRef(false);
    
    useEffect(() => {
        let html5QrCode = null;
        let script = null;
        
        const initScanner = () => {
            try {
                // استخدام المكتبة من window إذا كانت موجودة
                if (!window.Html5Qrcode) {
                    // تحميل المكتبة من CDN
                    script = document.createElement('script');
                    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
                    script.onload = () => startScanner();
                    script.onerror = () => setError('فشل في تحميل مكتبة المسح');
                    document.body.appendChild(script);
                } else {
                    startScanner();
                }
            } catch (err) {
                console.error('Init error:', err);
                setError('خطأ في تهيئة الماسح');
            }
        };
        
        const startScanner = () => {
            // تأكد من وجود العنصر
            const element = document.getElementById("barcode-reader-container");
            if (!element) {
                setError('عنصر الماسح غير موجود');
                return;
            }
            
            try {
                html5QrCode = new window.Html5Qrcode("barcode-reader-container");
                scannerRef.current = html5QrCode;
                
                const config = {
                    fps: 10,
                    qrbox: { width: 300, height: 200 },
                    aspectRatio: 1.333
                };
                
                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    async (decodedText) => {
                        console.log('✅ Barcode detected:', decodedText);
                        
                        if (isClosingRef.current) return;
                        isClosingRef.current = true;
                        
                        setIsScanning(false);
                        
                        // إيقاف الماسح بأمان
                        try {
                            if (html5QrCode && typeof html5QrCode.stop === 'function') {
                                await html5QrCode.stop();
                            }
                        } catch (stopErr) {
                            console.log('Scanner stop error (ignored):', stopErr.message);
                        }
                        
                        // إغلاق الماسح وإرسال النتيجة
                        setTimeout(() => {
                            if (onScan) onScan(decodedText);
                            if (onClose) onClose();
                        }, 50);
                    },
                    (errorMessage) => {
                        // تجاهل أخطاء المسح المؤقتة
                    }
                ).catch(err => {
                    console.error('Start error:', err);
                    setError('فشل في تشغيل الكاميرا. تأكد من منح الإذن.');
                });
                
            } catch (err) {
                console.error('Start scanner error:', err);
                setError('خطأ في تشغيل الماسح');
            }
        };
        
        initScanner();
        
        return () => {
            isClosingRef.current = true;
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().catch(console.error);
                } catch (e) {
                    console.log('Cleanup error (ignored)');
                }
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
                    onClick={() => {
                        isClosingRef.current = true;
                        if (scannerRef.current) {
                            scannerRef.current.stop().catch(console.error);
                        }
                        onClose();
                    }}
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg z-10 transition"
                >
                    ✕
                </button>
                
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative">
                        <div className="w-80 h-40 border-2 border-yellow-400 rounded-lg">
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-3 border-l-3 border-yellow-400 rounded-tl"></div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-3 border-r-3 border-yellow-400 rounded-tr"></div>
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-3 border-l-3 border-yellow-400 rounded-bl"></div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-3 border-r-3 border-yellow-400 rounded-br"></div>
                        </div>
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="w-full h-0.5 bg-yellow-400 animate-scan"></div>
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-10 left-0 right-0 text-center">
                    <div className="inline-block bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                        <p className="text-white text-sm">
                            {isScanning ? '📷 ضع الباركود داخل الإطار' : '✅ تم المسح بنجاح'}
                        </p>
                    </div>
                </div>
                
                {error && (
                    <div className="absolute bottom-24 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-center z-10">
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
                .border-t-3 { border-top-width: 3px; }
                .border-r-3 { border-right-width: 3px; }
                .border-b-3 { border-bottom-width: 3px; }
                .border-l-3 { border-left-width: 3px; }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;