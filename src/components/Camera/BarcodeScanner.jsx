// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import axiosInstance from '../../services/api';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ✅ دالة لتحليل الصورة واستخراج الباركود
    const analyzeImage = async (imageSrc) => {
        // ✅ في التطوير المحلي، يمكن استخدام خدمة خارجية لتحليل الباركود
        // أو استخدام مكتبة jsQR مباشرة
        
        // ✅ للتبسيط، سنستخدم مكتبة jsQR في المتصفح
        // لكن هذا يتطلب تحويل الصورة إلى Canvas
        
        try {
            // إنشاء عنصر Image لتحميل الصورة
            const img = new Image();
            img.src = imageSrc;
            
            await new Promise((resolve) => {
                img.onload = resolve;
            });
            
            // إنشاء Canvas لتحليل الصورة
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            // الحصول على بيانات الصورة
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // ✅ استخدام jsQR لتحليل الباركود
            // تأكد من تثبيت المكتبة: npm install jsqr
            const jsQR = await import('jsqr').then(module => module.default);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code && code.data) {
                console.log('✅ Barcode detected:', code.data);
                return code.data;
            }
            
            return null;
        } catch (err) {
            console.error('Error analyzing image:', err);
            return null;
        }
    };

    // ✅ دالة البحث عن المنتج باستخدام الباركود
    const searchProductByBarcode = async (barcode) => {
        try {
            // ✅ البحث في Open Food Facts API
            const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            
            if (response.data.status === 1) {
                const product = response.data.product;
                const nutriments = product.nutriments || {};
                
                return {
                    name: product.product_name || product.generic_name || `منتج (${barcode.slice(-8)})`,
                    calories: nutriments['energy-kcal'] || nutriments.energy || 0,
                    protein: nutriments.proteins || 0,
                    carbs: nutriments.carbohydrates || 0,
                    fat: nutriments.fat || 0,
                    barcode: barcode,
                    brand: product.brands,
                    unit: product.quantity?.includes('g') ? 'غرام' : (product.quantity?.includes('ml') ? 'مل' : 'غرام')
                };
            }
            return null;
        } catch (err) {
            console.error('Error searching product:', err);
            return null;
        }
    };

    // دالة التقاط الصورة وتحليلها
    const captureAndAnalyze = async () => {
        if (!webcamRef.current || isAnalyzing || !scanning) return;
        
        setIsAnalyzing(true);
        
        try {
            // التقاط صورة من الكاميرا
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (imageSrc) {
                console.log('📸 Capturing image for analysis...');
                
                // ✅ تحليل الصورة لاستخراج الباركود
                const barcode = await analyzeImage(imageSrc);
                
                if (barcode) {
                    console.log('✅ Barcode detected:', barcode);
                    setScanning(false);
                    
                    // ✅ البحث عن المنتج باستخدام الباركود
                    const product = await searchProductByBarcode(barcode);
                    
                    if (product) {
                        console.log('✅ Product found:', product);
                        if (onScan && typeof onScan === 'function') {
                            onScan(product);
                        }
                    } else {
                        // إذا لم يتم العثور على المنتج
                        if (onScan && typeof onScan === 'function') {
                            onScan({
                                name: `منتج جديد (${barcode.slice(-8)})`,
                                calories: 0,
                                protein: 0,
                                carbs: 0,
                                fat: 0,
                                barcode: barcode,
                                unit: 'غرام'
                            });
                        }
                    }
                    
                    // إغلاق الماسح بعد نصف ثانية
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error scanning:', err);
            setError('حدث خطأ في مسح الباركود');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // مسح كل 1.5 ثانية
    useEffect(() => {
        if (!scanning) return;
        
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 1500);
        
        return () => clearInterval(interval);
    }, [scanning]);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black/90' : 'bg-black/70'}`}>
            <div className={`w-full max-w-lg rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-bold text-lg">
                        📷 مسح الباركود
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-2xl hover:opacity-70"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Camera */}
                <div className="relative bg-black" style={{ height: '400px' }}>
                    <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.8}
                        videoConstraints={{
                            facingMode: "environment",
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                    
                    {/* Scanning Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-32 border-2 border-yellow-400 rounded-lg">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-1 bg-yellow-400 animate-scan"></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Status */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-block bg-black/70 px-4 py-2 rounded-full">
                            <p className="text-white text-sm">
                                {isAnalyzing ? (
                                    '🔍 جاري التحليل...'
                                ) : scanning ? (
                                    '📷 ضع الباركود داخل الإطار'
                                ) : (
                                    '✅ تم المسح بنجاح'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Error Message */}
                {error && (
                    <div className="m-4 p-3 bg-red-500 text-white rounded-lg text-center">
                        ⚠️ {error}
                    </div>
                )}
                
                {/* Controls */}
                <div className="p-4 flex gap-3">
                    <button
                        onClick={() => {
                            setScanning(true);
                            setError(null);
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                        disabled={scanning}
                    >
                        🔄 إعادة التشغيل
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition"
                    >
                        ✕ إغلاق
                    </button>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes scan {
                    0% {
                        transform: translateY(-60px);
                    }
                    100% {
                        transform: translateY(60px);
                    }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;