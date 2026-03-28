// src/components/camera/FlaskBarcodeScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const FlaskBarcodeScanner = ({ onScan, onClose, darkMode }) => {
    const webcamRef = useRef(null);
    const [scanning, setScanning] = useState(true);
    const [error, setError] = useState(null);

    const captureAndAnalyze = async () => {
        if (!webcamRef.current) return;
        
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            try {
                const response = await axios.post('http://localhost:5000/scan-barcode', {
                    image: imageSrc
                });
                
                if (response.data.success && response.data.results.length > 0) {
                    console.log('Barcode detected:', response.data.results[0].data);
                    if (onScan) onScan(response.data.results[0].data);
                    if (onClose) onClose();
                }
            } catch (err) {
                console.error('Error scanning:', err);
                setError('فشل في الاتصال بالماسح');
            }
        }
    };

    useEffect(() => {
        if (!scanning) return;
        
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 1000);
        
        return () => clearInterval(interval);
    }, [scanning]);

    return (
        <div className={`scanner-container ${darkMode ? 'dark' : ''}`}>
            {error && <div className="error">{error}</div>}
            
            <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                style={{ width: '100%', borderRadius: '12px' }}
            />
            
            <div className="scanning-frame"></div>
            
            <button onClick={onClose} className="close-btn">
                ✕ إغلاق
            </button>
            
            <div className="instructions">
                <p>📷 ضع الباركود داخل الإطار</p>
                <p>🔍 جاري المسح التلقائي...</p>
            </div>
        </div>
    );
};

export default FlaskBarcodeScanner;