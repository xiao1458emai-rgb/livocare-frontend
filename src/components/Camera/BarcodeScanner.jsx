// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ✅ استخدام BarcodeDetector API (مدعوم في Chrome, Edge, Safari)
    const detectBarcode = async (imageData) => {
        try {
            // التحقق من توفر BarcodeDetector
            if (!('BarcodeDetector' in window)) {
                console.warn('BarcodeDetector not supported, falling back to jsQR');
                return null;
            }
            
            const barcodeDetector = new BarcodeDetector({
                formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'codabar', 'upc_a', 'upc_e']
            });
            
            const barcodes = await barcodeDetector.detect(imageData);
            
            if (barcodes && barcodes.length > 0) {
                console.log('✅ Barcode detected:', barcodes[0].rawValue);
                return barcodes[0].rawValue;
            }
            return null;
        } catch (err) {
            console.error('Barcode detection error:', err);
            return null;
        }
    };

    // ✅ تحويل الصورة إلى ImageBitmap للتحليل
    const imageToImageBitmap = async (imageSrc) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = imageSrc;
            img.onload = async () => {
                try {
                    const bitmap = await createImageBitmap(img);
                    resolve(bitmap);
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = reject;
        });
    };

    // ✅ دالة البحث عن المنتج باستخدام الباركود
    const searchProductByBarcode = async (barcode) => {
        try {
            // ✅ البحث في Open Food Facts API
            const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
                timeout: 10000
            });
            
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
                
                // ✅ تحويل الصورة إلى ImageBitmap
                const imageBitmap = await imageToImageBitmap(imageSrc);
                
                // ✅ تحليل الباركود
                const barcode = await detectBarcode(imageBitmap);
                
                // تنظيف ImageBitmap
                imageBitmap.close();
                
                if (barcode) {
                    console.log('✅ Barcode detected:', barcode);
                    setScanning(false);
                    
                    // ✅ البحث عن المنتج باستخدام الباركود
                    const product = await searchProductByBarcode(barcode);
                    
                    if (product) {
                        console.log('✅ Product found:', product.name);
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
                        screenshotQuality={0.9}
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