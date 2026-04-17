// src/components/Camera/Html5BarcodeScanner.jsx
import React, { useEffect, useRef, useState } from 'react';

const Html5BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef(null);
    
    useEffect(() => {
        let html5QrCode = null;
        
        const initScanner = async () => {
            try {
                // استيراد المكتبة
                const { Html5Qrcode } = await import('html5-qrcode');
                
                html5QrCode = new Html5Qrcode("html5-barcode-scanner");
                scannerRef.current = html5QrCode;
                
                const config = {
                    fps: 10,
                    qrbox: { width: 300, height: 200 },
                    aspectRatio: 1.333,
                    showTorchButtonIfSupported: true
                };
                
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        console.log('✅ Barcode detected:', decodedText);
                        setIsScanning(false);
                        html5QrCode.stop();
                        if (onScan) onScan(decodedText);
                        if (onClose) setTimeout(onClose, 500);
                    },
                    (errorMessage) => {
                        // تجاهل أخطاء المسح المؤقتة
                        // console.log('Scanning...', errorMessage);
                    }
                );
                
                console.log('✅ Scanner ready');
                
            } catch (err) {
                console.error('Scanner error:', err);
                setError('فشل في تشغيل الكاميرا. تأكد من منح الإذن.');
            }
        };
        
        initScanner();
        
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [onScan, onClose]);
    
    return (
        <div className={`fixed inset-0 z-50 ${darkMode ? 'bg-black' : 'bg-black/95'}`}>
            <div className="relative w-full h-full">
                {/* حاوية الماسح */}
                <div id="html5-barcode-scanner" className="w-full h-full"></div>
                
                {/* زر الإغلاق */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg z-10 transition"
                >
                    ✕
                </button>
                
                {/* إطار التوجيه */}
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
                
                {/* النص التوجيهي */}
                <div className="absolute bottom-10 left-0 right-0 text-center">
                    <div className="inline-block bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                        <p className="text-white text-sm">
                            {isScanning ? '📷 ضع الباركود داخل الإطار' : '✅ تم المسح بنجاح'}
                        </p>
                    </div>
                </div>
                
                {/* رسالة الخطأ */}
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
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
                .border-t-3 { border-top-width: 3px; }
                .border-r-3 { border-right-width: 3px; }
                .border-b-3 { border-bottom-width: 3px; }
                .border-l-3 { border-left-width: 3px; }
            `}</style>
        </div>
    );
};

export default Html5BarcodeScanner;