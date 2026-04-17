// BarcodeScanner.jsx - النسخة المعدلة
import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const BarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    
    const CAMERA_SERVICE_URL = 'https://camera-service-fag3.onrender.com';

    // ✅ مسح يدوي - فقط عند الضغط على الزر
    const handleScan = async () => {
        if (!webcamRef.current || isAnalyzing) return;
        
        setIsAnalyzing(true);
        setError(null);
        
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            
            if (imageSrc) {
                console.log('📸 Capturing image for analysis...');
                
                const response = await axios.post(
                    `${CAMERA_SERVICE_URL}/scan-barcode`,
                    { image: imageSrc },
                    {
                        headers: { 
                            'Content-Type': 'application/json',
                            // ✅ إضافة CORS headers
                            'Access-Control-Allow-Origin': '*'
                        },
                        timeout: 15000
                    }
                );
                
                if (response.data && response.data.success && response.data.results?.length > 0) {
                    const barcodeValue = response.data.results[0].data;
                    console.log('✅ Barcode detected:', barcodeValue);
                    
                    if (onScan && typeof onScan === 'function') {
                        onScan(barcodeValue);
                    }
                    
                    if (onClose) {
                        setTimeout(() => onClose(), 500);
                    }
                } else {
                    setError('لم يتم العثور على باركود، حاول مرة أخرى');
                }
            }
        } catch (err) {
            console.error('❌ Error scanning:', err.message);
            setError('فشل في الاتصال بخدمة الكاميرا');
        } finally {
            setIsAnalyzing(false);
        }
    };

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
                    
                    {/* إطار المسح */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-32 border-2 border-yellow-400 rounded-lg"></div>
                    </div>
                </div>
                
                {error && (
                    <div className="m-4 p-3 bg-red-500 text-white rounded-lg text-center">
                        ⚠️ {error}
                    </div>
                )}
                
                <div className="p-4 flex gap-3">
                    <button
                        onClick={handleScan}
                        disabled={isAnalyzing}
                        className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                        {isAnalyzing ? '🔍 جاري المسح...' : '📸 مسح الآن'}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                        ✕ إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;