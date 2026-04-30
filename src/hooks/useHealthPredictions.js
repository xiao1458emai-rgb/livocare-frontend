// src/hooks/useHealthPredictions.js
import { useState, useEffect, useCallback, useRef } from 'react';
import LSTMPredictor from '../services/lstmPredictor';
import esp32Service from '../services/esp32Service';

export const useHealthPredictions = () => {
    const [predictions, setPredictions] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [immediateRisks, setImmediateRisks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    
    const unsubscribeRefs = useRef([]);

    // ✅ معالجة قراءات ESP32 الجديدة
    const handleNewReading = useCallback((reading) => {
        console.log('📊 New reading received:', reading);
        
        // إضافة إلى LSTM Predictor
        LSTMPredictor.addReading(reading);
        
        // التحقق من المخاطر الفورية
        const risks = LSTMPredictor.checkForImmediateRisk(reading);
        if (risks.length > 0) {
            setImmediateRisks(prev => [...risks, ...prev].slice(0, 5));
        }
        
        // تحديث الإحصائيات
        setStatistics(LSTMPredictor.getStatisticalAnalysis());
        setLastUpdate(new Date());
    }, []);

    // ✅ معالجة التنبؤات الجديدة
    const handlePredictions = useCallback((newPredictions) => {
        setPredictions(newPredictions);
        setIsLoading(false);
    }, []);

    // ✅ معالجة المخاطر الفورية
    const handleImmediateRisk = useCallback((risks) => {
        setImmediateRisks(prev => [...risks, ...prev].slice(0, 5));
        
        // ✅ إظهار إشعار للمخاطر الخطيرة
        risks.forEach(risk => {
            if (risk.level === 'critical') {
                // إشعار المتصفح
                if (Notification.permission === 'granted') {
                    new Notification('🚨 تنبيه صحي عاجل', {
                        body: risk.message,
                        icon: '/health-icon.png',
                        requireInteraction: true
                    });
                }
                
                // 🔊 صوت تنبيه (اختياري)
                const audio = new Audio('/alert.mp3');
                audio.play().catch(e => console.log('Audio play failed:', e));
            }
        });
    }, []);

    // ✅ طلب تنبؤ جديد يدوياً
    const refreshPredictions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await LSTMPredictor.predictNextReadings();
            setPredictions(result);
            setStatistics(LSTMPredictor.getStatisticalAnalysis());
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ✅ تصدير البيانات
    const exportData = useCallback(() => {
        const data = LSTMPredictor.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health_predictions_${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // ✅ إعادة تعيين
    const resetData = useCallback(() => {
        LSTMPredictor.reset();
        setPredictions(null);
        setStatistics(null);
        setImmediateRisks([]);
        setError(null);
    }, []);

    // ✅ إعداد المستمعين
    useEffect(() => {
        // طلب إذن الإشعارات
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // إضافة مستمعي LSTM Predictor
        const unsubNewReading = LSTMPredictor.on('newReading', handleNewReading);
        const unsubPredictions = LSTMPredictor.on('predictions', handlePredictions);
        const unsubImmediateRisk = LSTMPredictor.on('immediateRisk', handleImmediateRisk);
        
        unsubscribeRefs.current = [unsubNewReading, unsubPredictions, unsubImmediateRisk];
        
        // إضافة مستمع ESP32
        let unsubESP32 = null;
        if (esp32Service && esp32Service.on) {
            unsubESP32 = esp32Service.on((type, data) => {
                if (type === 'data' || type === 'heartRate' || type === 'spo2') {
                    const reading = {
                        heartRate: type === 'heartRate' ? data : (data?.heartRate || null),
                        spo2: type === 'spo2' ? data : (data?.spo2 || null),
                        timestamp: new Date().toISOString()
                    };
                    if (reading.heartRate || reading.spo2) {
                        handleNewReading(reading);
                    }
                }
            });
            unsubscribeRefs.current.push(unsubESP32);
        }
        
        // تحميل الإحصائيات الأولية
        setStatistics(LSTMPredictor.getStatisticalAnalysis());
        
        return () => {
            unsubscribeRefs.current.forEach(unsub => unsub?.());
            unsubscribeRefs.current = [];
        };
    }, [handleNewReading, handlePredictions, handleImmediateRisk]);

    return {
        predictions,
        statistics,
        immediateRisks,
        isLoading,
        error,
        lastUpdate,
        refreshPredictions,
        exportData,
        resetData
    };
};