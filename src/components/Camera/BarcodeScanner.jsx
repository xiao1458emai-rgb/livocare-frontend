// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // ✅ استخدام المسار الصحيح لخدمة الكاميرا
    const CAMERA_SERVICE_URL = 'https://camera-service-fag3.onrender.com';

    // ✅ دالة البحث عن المنتج (سيتم استخدامها فقط إذا لزم الأمر)
    const searchProductByBarcode = async (barcode) => {
        try {
            const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
                timeout: 10000
                // ✅ تم إزالة User-Agent لأنه غير مسموح به في المتصفح
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
                        timeout: 20000 // ✅ خفضنا المهلة قليلاً لتكون 20 ثانية
                    }
                );
                
                console.log('📡 Camera service response:', response.data);
                
                if (response.data && response.data.success && response.data.results && response.data.results.length > 0) {
                    const barcodeData = response.data.results[0];
                    const barcode = barcodeData.data;
                    console.log('✅ Barcode detected:', barcode);
                    setScanning(false);
                    
                    let productData = null;

                    // ✅ الخطوة 1: هل خدمة الكاميرا أرسلت بيانات المنتج كاملة؟
                    if (barcodeData.name && barcodeData.calories) {
                        console.log('✅ Product data received directly from camera service');
                        productData = {
                            name: barcodeData.name,
                            calories: barcodeData.calories || 0,
                            protein: barcodeData.protein || 0,
                            carbs: barcodeData.carbs || 0,
                            fat: barcodeData.fat || 0,
                            barcode: barcode,
                            unit: barcodeData.unit || 'غرام'
                        };
                    } else {
                        // ✅ الخطوة 2: إذا لم تكن البيانات كاملة، ابحث في Open Food Facts
                        console.log('🔍 No product data from camera, searching Open Food Facts...');
                        productData = await searchProductByBarcode(barcode);
                        
                        if (!productData) {
                            productData = {
                                name: `منتج جديد (${barcode.slice(-8)})`,
                                calories: 0,
                                protein: 0,
                                carbs: 0,
                                fat: 0,
                                barcode: barcode,
                                unit: 'غرام'
                            };
                        }
                    }
                    
                    if (onScan && typeof onScan === 'function') {
                        onScan(productData);
                    }
                    
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                } else {
                    console.log('⚠️ No barcode detected in this frame');
                }
            }
        } catch (err) {
            console.error('❌ Error scanning:', err.message);
            
            let errorMessage = 'فشل في الاتصال بخدمة الكاميرا';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'انتهت مهلة الاتصال، حاول مرة أخرى';
            } else if (err.response?.status === 503) {
                errorMessage = 'خدمة الكاميرا قيد التشغيل (قد تستغرق 30-50 ثانية للاستيقاظ)';
            }
            
            setError(errorMessage);
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ✅ زيادة الفاصل الزمني بين محاولات المسح لتقليل الضغط على الخادم
    useEffect(() => {
        if (!scanning) return;
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 3000); // 3 ثوانٍ
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
                        screenshotQuality={0.8}
                        videoConstraints={{
                            facingMode: "environment",
                            width: { ideal: 1280 },
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