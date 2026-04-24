// src/components/Camera/BarcodeScanner.jsx
import React, { useEffect, useRef, useState } from 'react';

const BarcodeScanner = ({ onScan, onClose }) => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [error, setError] = useState(null);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    useEffect(() => {
        let html5QrCode = null;

        const startScanner = () => {
            const element = document.getElementById("barcode-reader-container");
            if (!element) {
                setError(isArabic ? 'حدث خطأ في تهيئة الماسح' : 'Error initializing scanner');
                return;
            }

            try {
                html5QrCode = new window.Html5Qrcode("barcode-reader-container");
                scannerRef.current = html5QrCode;

                const config = { fps: 10, qrbox: { width: 300, height: 200 } };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (isProcessingRef.current) return;
                        isProcessingRef.current = true;
                        console.log('✅ Barcode detected:', decodedText);
                        if (onScan) onScan(decodedText);
                        
                        // إعادة تعيين بعد ثانيتين
                        setTimeout(() => {
                            isProcessingRef.current = false;
                        }, 2000);
                    },
                    (errorMessage) => {}
                ).catch(err => {
                    console.error("Start error:", err);
                    setError(isArabic ? 'فشل في تشغيل الكاميرا' : 'Failed to start camera');
                });

            } catch (err) {
                console.error("Init error:", err);
                setError(isArabic ? 'خطأ في تهيئة الماسح' : 'Scanner initialization error');
            }
        };

        if (!window.Html5Qrcode) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
            script.onload = startScanner;
            script.onerror = () => setError(isArabic ? 'فشل في تحميل المكتبة' : 'Failed to load library');
            document.body.appendChild(script);
        } else {
            startScanner();
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [onScan, isArabic]);

    return (
        <div className={`fixed inset-0 z-50 bg-black ${!isArabic ? '' : ''}`}>
            <div className="relative w-full h-full">
                {/* زر إغلاق */}
                <button
                    onClick={() => onClose()}
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg z-10 transition-all duration-200 hover:scale-110"
                >
                    ✕
                </button>
                
                {/* ✅ تم إزالة زر تبديل اللغة من هنا - الآن يوجد فقط في ProfileManager */}
                
                {/* منطقة المسح */}
                <div id="barcode-reader-container" className="w-full h-full"></div>
                
                {/* إطار المسح */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-80 h-40 border-2 border-yellow-400 rounded-lg">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-yellow-400 animate-scan"></div>
                        </div>
                    </div>
                </div>
                
                {/* نص تعليمات */}
                <div className="absolute bottom-32 left-4 right-4 text-center text-white text-sm z-10 bg-black/50 p-3 rounded-lg">
                    {isArabic 
                        ? 'ضع رمز المنتج داخل الإطار الأصفر للمسح'
                        : 'Place the barcode inside the yellow frame to scan'}
                </div>
                
                {/* زر إلغاء إضافي في الأسفل */}
                <button
                    onClick={() => onClose()}
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-full text-lg shadow-lg z-10 transition-all duration-200"
                >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                
                {/* رسالة الخطأ */}
                {error && (
                    <div className="absolute bottom-40 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-center z-10">
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
            `}</style>
        </div>
    );
};

export default BarcodeScanner;