// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    
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
                        timeout: 15000 // ✅ خفضنا المهلة إلى 15 ثانية
                    }
                );
                
                // ✅ إعادة تعيين عداد المحاولات عند النجاح
                setRetryCount(0);
                
                if (response.data && response.data.success && response.data.results && response.data.results.length > 0) {
                    const barcodeData = response.data.results[0];
                    
                    // ✅ إنشاء كائن المنتج
                    const productData = {
                        name: barcodeData.name || `منتج (${barcodeData.data.slice(-8)})`,
                        calories: barcodeData.calories || 0,
                        protein: barcodeData.protein || 0,
                        carbs: barcodeData.carbs || 0,
                        fat: barcodeData.fat || 0,
                        barcode: barcodeData.data,
                        unit: 'غرام'
                    };
                    
                    console.log('✅ Product data:', productData);
                    setScanning(false);
                    
                    if (onScan && typeof onScan === 'function') {
                        onScan(productData);
                    }
                    
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error scanning:', err.message);
            
            // ✅ زيادة عداد المحاولات
            setRetryCount(prev => prev + 1);
            
            // ✅ بعد 3 محاولات فاشلة، نغلق الكاميرا
            if (retryCount >= 2) {
                console.log('⚠️ Too many errors, closing scanner');
                setError('فشل الاتصال المستمر، الرجاء المحاولة لاحقاً');
                setTimeout(() => {
                    if (onClose) onClose();
                }, 2000);
                return;
            }
            
            let errorMessage = 'فشل في الاتصال بخدمة الكاميرا';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'انتهت مهلة الاتصال، حاول مرة أخرى';
            } else if (err.response?.status === 503) {
                errorMessage = 'خدمة الكاميرا قيد التشغيل (قد تستغرق 30-50 ثانية)';
            }
            
            setError(errorMessage);
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ✅ زيادة الفاصل الزمني إلى 5 ثوانٍ
    useEffect(() => {
        if (!scanning) return;
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 5000); // 5 ثوانٍ بين كل محاولة
        return () => clearInterval(interval);
    }, [scanning, retryCount]);

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
                        onClick={() => { setScanning(true); setError(null); setRetryCount(0); }}
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