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

    // ✅ محاولة endpoints مختلفة
    const tryScanEndpoint = async (imageSrc, endpoint) => {
        try {
            console.log(`🔗 Trying endpoint: ${endpoint}`);
            const response = await axios.post(
                `${CAMERA_SERVICE_URL}${endpoint}`,
                { image: imageSrc },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                }
            );
            return response;
        } catch (err) {
            if (err.response?.status === 405) {
                return null; // طريقة غير مسموحة، جرب endpoint آخر
            }
            throw err;
        }
    };

    const captureAndAnalyze = async () => {
        if (!webcamRef.current || isAnalyzing || !scanning) return;
        
        setIsAnalyzing(true);
        
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (imageSrc) {
                console.log('📸 Capturing image for analysis...');
                
                // ✅ تجربة endpoints مختلفة
                const endpoints = ['/scan-barcode', '/scan', '/api/scan', '/barcode'];
                let response = null;
                
                for (const endpoint of endpoints) {
                    response = await tryScanEndpoint(imageSrc, endpoint);
                    if (response) break;
                }
                
                if (!response) {
                    throw new Error('No working endpoint found');
                }
                
                console.log('📡 Camera service response:', response.data);
                
                // ✅ معالجة تنسيقات مختلفة للرد
                let barcode = null;
                if (response.data && response.data.success && response.data.data) {
                    barcode = response.data.data;
                } else if (response.data && response.data.barcode) {
                    barcode = response.data.barcode;
                } else if (response.data && response.data.code) {
                    barcode = response.data.code;
                } else if (typeof response.data === 'string') {
                    barcode = response.data;
                }
                
                if (barcode) {
                    console.log('✅ Barcode detected:', barcode);
                    setScanning(false);
                    
                    // البحث عن المنتج
                    const product = await searchProductByBarcode(barcode);
                    
                    if (product) {
                        if (onScan && typeof onScan === 'function') {
                            onScan(product);
                        }
                    } else {
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
                    
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error scanning:', err);
            setError('فشل في الاتصال بخدمة الكاميرا');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ✅ دالة البحث عن المنتج
    const searchProductByBarcode = async (barcode) => {
        try {
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

    // مسح كل 2 ثانية
    useEffect(() => {
        if (!scanning) return;
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 2000);
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