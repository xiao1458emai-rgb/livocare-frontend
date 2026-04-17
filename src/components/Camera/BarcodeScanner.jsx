// src/components/Camera/BarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    
    const CAMERA_SERVICE_URL = 'https://camera-service-ti1c.onrender.com';
    
    // ✅ تحسين الصورة قبل إرسالها
    const enhanceImage = (imageSrc) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // زيادة التباين والسطوع
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // تطبيق تحسينات على الصورة
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // تحسين التباين
                for (let i = 0; i < data.length; i += 4) {
                    // زيادة التباين
                    data[i] = Math.min(255, data[i] * 1.2);     // Red
                    data[i+1] = Math.min(255, data[i+1] * 1.2); // Green
                    data[i+2] = Math.min(255, data[i+2] * 1.2); // Blue
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = imageSrc;
        });
    };
    
    const handleScan = async () => {
        if (!webcamRef.current || isAnalyzing) {
            setError('❌ الكاميرا غير جاهزة');
            return;
        }
        
        setIsAnalyzing(true);
        setError(null);
        
        try {
            // التقاط الصورة
            let imageSrc = webcamRef.current.getScreenshot();
            
            if (!imageSrc) {
                setError('❌ فشل في التقاط الصورة');
                setIsAnalyzing(false);
                return;
            }
            
            console.log('📸 Original image captured');
            
            // تحسين الصورة
            imageSrc = await enhanceImage(imageSrc);
            console.log('✨ Image enhanced');
            
            // محاولات متعددة بجودة مختلفة
            const attempts = [
                { quality: 0.9, size: 'original' },
                { quality: 0.7, size: 'medium' }
            ];
            
            let barcodeFound = null;
            
            for (const attempt of attempts) {
                if (barcodeFound) break;
                
                console.log(`📡 Attempting scan with ${attempt.size} quality...`);
                
                const response = await axios.post(
                    `${CAMERA_SERVICE_URL}/scan-barcode`,
                    { image: imageSrc },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 15000
                    }
                );
                
                console.log('📡 Response:', response.data);
                
                if (response.data.success && response.data.results?.length > 0) {
                    barcodeFound = response.data.results[0].data;
                    break;
                }
            }
            
            if (barcodeFound) {
                console.log('✅ Barcode detected:', barcodeFound);
                if (onScan) onScan(barcodeFound);
                if (onClose) setTimeout(() => onClose(), 500);
            } else {
                setError('❌ لم يتم العثور على باركود. تأكد من:\n- إضاءة كافية\n- ثبات الكاميرا\n- وضع الباركود داخل الإطار');
            }
            
        } catch (err) {
            console.error('❌ Scan error:', err);
            setError('❌ فشل في المسح. حاول مرة أخرى مع إضاءة أفضل');
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleUserMedia = () => {
        console.log('✅ Camera is ready');
        setCameraReady(true);
    };
    
    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black/90' : 'bg-black/70'}`}>
            <div className={`w-full max-w-lg rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="font-bold text-lg dark:text-white">📷 مسح الباركود</h3>
                    <button onClick={onClose} className="text-2xl hover:opacity-70 dark:text-white">✕</button>
                </div>
                
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
                        onUserMedia={handleUserMedia}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    
                    {/* إطار المسح المحسن */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                            <div className="w-80 h-40 border-2 border-yellow-400 rounded-lg bg-transparent">
                                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-3 border-l-3 border-yellow-400 rounded-tl"></div>
                                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-3 border-r-3 border-yellow-400 rounded-tr"></div>
                                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-3 border-l-3 border-yellow-400 rounded-bl"></div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-3 border-r-3 border-yellow-400 rounded-br"></div>
                            </div>
                            <div className="absolute inset-0 overflow-hidden rounded-lg">
                                <div className="w-full h-0.5 bg-yellow-400 animate-scan"></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* نصائح المسح */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-block bg-black/80 px-4 py-2 rounded-full backdrop-blur-sm">
                            <p className="text-white text-sm">
                                {!cameraReady ? '⏳ جاري تشغيل الكاميرا...' : 
                                 isAnalyzing ? '🔍 جاري تحليل الصورة...' : 
                                 '📷 ضع الباركود داخل الإطار الأصفر'}
                            </p>
                        </div>
                    </div>
                </div>
                
                {error && (
                    <div className="m-4 p-3 bg-red-500 text-white rounded-lg text-center whitespace-pre-line">
                        ⚠️ {error}
                    </div>
                )}
                
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
                        ) : '📸 مسح الآن'}
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white py-3 rounded-lg font-semibold transition transform active:scale-95"
                    >
                        ✕ إغلاق
                    </button>
                </div>
                
                <div className="px-4 pb-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        💡 نصائح: إضاءة جيدة | تثبيت الكاميرا | وضع الباركود داخل الإطار | مسافة 10-20 سم
                    </p>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-60px); }
                    100% { transform: translateY(60px); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-scan { animation: scan 2s ease-in-out infinite; }
                .animate-spin { animation: spin 1s linear infinite; display: inline-block; }
                .border-t-3 { border-top-width: 3px; }
                .border-r-3 { border-right-width: 3px; }
                .border-b-3 { border-bottom-width: 3px; }
                .border-l-3 { border-left-width: 3px; }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;