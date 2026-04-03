// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const CAMERA_SERVICE_URL = 'https://camera-service-fag3.onrender.com';

    const captureAndAnalyze = async () => {
        if (!webcamRef.current || isAnalyzing || !scanning) return;
        
        setIsAnalyzing(true);
        
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (imageSrc) {
                console.log('📸 Capturing image for analysis...');
                
                const response = await axios.post(
                    `${CAMERA_SERVICE_URL}/scan-barcode`,
                    { image: imageSrc },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 15000
                    }
                );
                
                console.log('📡 Camera service response:', response.data);
                
                // ✅ التحقق من وجود نتائج
                if (response.data && response.data.success && response.data.results && response.data.results.length > 0) {
                    const barcodeResult = response.data.results[0];
                    const barcodeValue = barcodeResult.data;
                    
                    console.log('✅ Barcode detected:', barcodeValue);
                    
                    // ✅ إيقاف المسح
                    setScanning(false);
                    
                    // ✅ إرسال البيانات إلى onScan
                    if (onScan && typeof onScan === 'function') {
                        // ✅ إرسال الباركود كنص، وليس كائن
                        onScan(barcodeValue);
                    }
                    
                    // ✅ إغلاق الماسح
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error scanning:', err.message);
            setError('فشل في الاتصال بخدمة الكاميرا');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ✅ الفاصل الزمني: 3 ثوانٍ
    useEffect(() => {
        if (!scanning) return;
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 3000);
        return () => clearInterval(interval);
    }, [scanning]);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black/90' : 'bg-black/70'}`}>
            <div className={`w-full max-w-lg rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-bold text-lg">📷 مسح الباركود</h3>
                    <button onClick={onClose} className="text-2xl hover:opacity-70">✕</button>
                </div>
                
                <div className="relative bg-black" style={{ height: '400px' }}>
                    <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.7}
                        videoConstraints={{
                            facingMode: "environment",
                            width: { ideal: 720 },
                            height: { ideal: 720 }
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-32 border-2 border-yellow-400 rounded-lg">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-1 bg-yellow-400 animate-scan"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-block bg-black/70 px-4 py-2 rounded-full">
                            <p className="text-white text-sm">
                                {isAnalyzing ? '🔍 جاري التحليل...' : scanning ? '📷 ضع الباركود داخل الإطار' : '✅ تم المسح بنجاح'}
                            </p>
                        </div>
                    </div>
                </div>
                
                {error && (
                    <div className="m-4 p-3 bg-red-500 text-white rounded-lg text-center">
                        ⚠️ {error}
                    </div>
                )}
                
                <div className="p-4 flex gap-3">
                    <button
                        onClick={() => { setScanning(true); setError(null); }}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                        disabled={scanning}
                    >
                        🔄 إعادة التشغيل
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition">
                        ✕ إغلاق
                    </button>
                </div>
            </div>
            
            <style jsx>{`
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