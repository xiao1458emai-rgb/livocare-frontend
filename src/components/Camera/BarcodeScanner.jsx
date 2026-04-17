// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    
    // ✅ استخدم خدمة الكاميرا الخاصة بك
    const CAMERA_SERVICE_URL = 'https://camera-service-ti1c.onrender.com';
    
    // ✅ فحص اتصال الخدمة عند التحميل
    useEffect(() => {
        const checkService = async () => {
            try {
                console.log('🔍 Checking camera service...');
                const response = await fetch(`${CAMERA_SERVICE_URL}/`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Camera service is online:', data);
                } else {
                    console.warn('⚠️ Camera service responded with status:', response.status);
                    setError('خدمة الكاميرا تعمل ولكن قد يكون هناك مشكلة في الإعدادات');
                }
            } catch (err) {
                console.error('❌ Cannot reach camera service:', err.message);
                setError('⚠️ خدمة الكاميرا غير متاحة حالياً. يرجى المحاولة لاحقاً.');
            }
        };
        
        checkService();
    }, []);
    
    // ✅ دالة المسح اليدوي
    const handleScan = async () => {
        // التحقق من جاهزية الكاميرا
        if (!webcamRef.current) {
            setError('❌ الكاميرا غير جاهزة، يرجى المحاولة مرة أخرى');
            return;
        }
        
        if (isAnalyzing) {
            console.log('⏸️ Already scanning, please wait...');
            return;
        }
        
        setIsAnalyzing(true);
        setError(null);
        
        try {
            // التقاط الصورة
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (!imageSrc) {
                setError('❌ فشل في التقاط الصورة، تأكد من تشغيل الكاميرا');
                setIsAnalyzing(false);
                return;
            }
            
            console.log('📸 Image captured, sending to service...');
            
            // ✅ إرسال الصورة إلى خدمة الكاميرا
            const response = await axios.post(
                `${CAMERA_SERVICE_URL}/scan-barcode`,
                { 
                    image: imageSrc,
                    timestamp: new Date().toISOString()
                },
                {
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    timeout: 20000 // 20 ثانية مهلة
                }
            );
            
            console.log('📡 Service response:', response.data);
            
            // ✅ استخراج الباركود من الاستجابة
            let barcode = null;
            
            if (response.data) {
                // محاولة استخراج الباركود من صيغ مختلفة
                if (response.data.barcode) {
                    barcode = response.data.barcode;
                } else if (response.data.code) {
                    barcode = response.data.code;
                } else if (response.data.data) {
                    barcode = response.data.data;
                } else if (response.data.result) {
                    barcode = response.data.result;
                } else if (response.data.value) {
                    barcode = response.data.value;
                } else if (typeof response.data === 'string') {
                    barcode = response.data;
                }
                
                // إذا وجدنا باركود
                if (barcode && barcode.length > 0) {
                    console.log('✅ Barcode detected:', barcode);
                    
                    // إرسال الباركود إلى الدالة المستدعية
                    if (onScan && typeof onScan === 'function') {
                        onScan(barcode);
                    }
                    
                    // إغلاق الماسح بعد نجاح المسح
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                    return;
                }
            }
            
            // إذا لم نجد باركود
            setError('❌ لم يتم العثور على باركود في الصورة. حاول مرة أخرى مع إضاءة أفضل وتثبيت الكاميرا');
            
        } catch (err) {
            console.error('❌ Scan error:', err);
            
            // رسائل خطأ محددة
            if (err.code === 'ECONNABORTED') {
                setError('⏰ انتهى الوقت، الخدمة بطيئة. حاول مرة أخرى.');
            } else if (err.response) {
                if (err.response.status === 404) {
                    setError('🔌 مسار الخدمة غير صحيح (404)');
                } else if (err.response.status === 500) {
                    setError('⚠️ خطأ في الخادم الداخلي (500)');
                } else {
                    setError(`❌ خطأ ${err.response.status}: ${err.response.data?.error || 'فشل في المسح'}`);
                }
            } else if (err.request) {
                setError('📡 لا يمكن الوصول إلى خدمة الكاميرا. تأكد من اتصال الإنترنت.');
            } else {
                setError('❌ حدث خطأ غير متوقع. حاول مرة أخرى.');
            }
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    // ✅ عند جاهزية الكاميرا
    const handleUserMedia = () => {
        console.log('✅ Camera is ready');
        setCameraReady(true);
    };
    
    // ✅ عند خطأ الكاميرا
    const handleUserMediaError = (err) => {
        console.error('❌ Camera error:', err);
        setError('❌ لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن.');
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black/90' : 'bg-black/70'}`}>
            <div className={`w-full max-w-lg rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="font-bold text-lg dark:text-white">
                        📷 مسح الباركود
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-2xl hover:opacity-70 dark:text-white transition"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Camera View */}
                <div className="relative bg-black" style={{ height: '400px' }}>
                    <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.9}
                        videoConstraints={{
                            facingMode: "environment",
                            width: { ideal: 720 },
                            height: { ideal: 720 }
                        }}
                        onUserMedia={handleUserMedia}
                        onUserMediaError={handleUserMediaError}
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover' 
                        }}
                    />
                    
                    {/* Scanning Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                            {/* Outer frame */}
                            <div className="w-72 h-40 border-2 border-yellow-400 rounded-lg bg-transparent">
                                {/* Corner indicators */}
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-yellow-400 rounded-tl"></div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-yellow-400 rounded-tr"></div>
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-yellow-400 rounded-bl"></div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-yellow-400 rounded-br"></div>
                            </div>
                            
                            {/* Scan line animation */}
                            <div className="absolute inset-0 overflow-hidden rounded-lg">
                                <div className="w-full h-0.5 bg-yellow-400 animate-scan"></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Instruction text */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-block bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
                            <p className="text-white text-sm">
                                {!cameraReady ? (
                                    '⏳ جاري تشغيل الكاميرا...'
                                ) : isAnalyzing ? (
                                    '🔍 جاري تحليل الصورة...'
                                ) : (
                                    '📷 ضع الباركود داخل الإطار الأصفر'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Error Message */}
                {error && (
                    <div className="m-4 p-3 bg-red-500 text-white rounded-lg text-center animate-pulse">
                        ⚠️ {error}
                    </div>
                )}
                
                {/* Buttons */}
                <div className="p-4 flex gap-3">
                    <button
                        onClick={handleScan}
                        disabled={isAnalyzing || !cameraReady}
                        className={`flex-1 py-3 rounded-lg font-semibold transition transform active:scale-95
                            ${(isAnalyzing || !cameraReady) 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                            } text-white`}
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                جاري المسح...
                            </span>
                        ) : !cameraReady ? (
                            '⏳ انتظار الكاميرا...'
                        ) : (
                            '📸 مسح الآن'
                        )}
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white py-3 rounded-lg font-semibold transition transform active:scale-95"
                    >
                        ✕ إغلاق
                    </button>
                </div>
                
                {/* Help text */}
                <div className="px-4 pb-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        💡 نصائح: إضاءة جيدة | تثبيت الكاميرا | وضع الباركود داخل الإطار
                    </p>
                </div>
            </div>
            
            {/* Animation styles */}
            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-80px); }
                    100% { transform: translateY(80px); }
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

export default BarcodeScanner;