// src/components/Camera/BarcodeScannerLocal.jsx
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const BarcodeScannerLocal = ({ onScan, onClose, darkMode }) => {
    const scannerRef = useRef(null);
    
    useEffect(() => {
        // تأكد من وجود العنصر في DOM
        const elementId = "barcode-reader-container";
        
        const html5QrCode = new Html5Qrcode(elementId);
        const config = { 
            fps: 10, 
            qrbox: { width: 300, height: 200 },
            aspectRatio: 1.333
        };
        
        html5QrCode.start(
            { facingMode: "environment" }, // استخدم الكاميرا الخلفية
            config,
            (decodedText) => {
                console.log('✅ Barcode detected:', decodedText);
                html5QrCode.stop();
                if (onScan) onScan(decodedText);
                if (onClose) onClose();
            },
            (errorMessage) => {
                // تجاهل أخطاء المسح المؤقتة
                console.log('Scanning...');
            }
        ).catch(err => {
            console.error('Error starting scanner:', err);
        });
        
        return () => {
            html5QrCode.stop().catch(console.error);
        };
    }, [onScan, onClose]);
    
    return (
        <div className={`fixed inset-0 z-50 ${darkMode ? 'bg-black/90' : 'bg-black/70'}`}>
            <div className="relative w-full h-full">
                <div 
                    id="barcode-reader-container" 
                    style={{ 
                        width: '100%', 
                        height: '100%',
                        position: 'relative'
                    }}
                ></div>
                
                {/* زر الإغلاق */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg z-10"
                >
                    ✕
                </button>
                
                {/* إطار التوجيه */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-80 h-40 border-2 border-yellow-400 rounded-lg">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-yellow-400 animate-scan"></div>
                        </div>
                    </div>
                </div>
                
                {/* النص التوجيهي */}
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                    <div className="inline-block bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                        <p className="text-white text-sm">
                            📷 ضع الباركود داخل الإطار
                        </p>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-60px); }
                    100% { transform: translateY(60px); }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default BarcodeScannerLocal;