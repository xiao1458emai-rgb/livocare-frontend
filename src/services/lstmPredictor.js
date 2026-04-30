// src/services/lstmPredictor.js
import axios from 'axios';

const LSTM_API_URL = process.env.REACT_APP_LSTM_API_URL || 'https://lstm-health-api.onrender.com';

class LSTMPredictor {
    constructor() {
        this.history = {
            heartRate: [],
            spo2: [],
            timestamps: []
        };
        this.maxHistorySize = 100; // آخر 100 قراءة
        this.predictions = null;
        this.listeners = [];
    }

    // ✅ إضافة قراءة جديدة للسجل التاريخي
    addReading(reading) {
        const { heartRate, spo2, timestamp } = reading;
        
        if (heartRate && !isNaN(heartRate) && heartRate > 0) {
            this.history.heartRate.push({
                value: heartRate,
                timestamp: timestamp || new Date().toISOString()
            });
            
            // الحفاظ على حجم السجل
            if (this.history.heartRate.length > this.maxHistorySize) {
                this.history.heartRate.shift();
            }
        }
        
        if (spo2 && !isNaN(spo2) && spo2 > 0) {
            this.history.spo2.push({
                value: spo2,
                timestamp: timestamp || new Date().toISOString()
            });
            
            if (this.history.spo2.length > this.maxHistorySize) {
                this.history.spo2.shift();
            }
        }
        
        // تنبيه المستمعين
        this.notifyListeners('newReading', reading);
        
        // تشغيل التنبؤ إذا توفرت بيانات كافية
        if (this.history.heartRate.length >= 10) {
            this.predictNextReadings();
        }
    }

    // ✅ التنبؤ بالقراءات القادمة باستخدام LSTM (backend)
    async predictNextReadings() {
        try {
            // تجهيز البيانات للإرسال
            const heartRates = this.history.heartRate.map(h => h.value);
            const spo2Values = this.history.spo2.map(s => s.value);
            
            // إذا كانت البيانات غير كافية
            if (heartRates.length < 10) {
                // استخدام نموذج بسيط محلي كـ Fallback
                return this.localPredictionFallback(heartRates, spo2Values);
            }
            
            // ✅ إرسال إلى LSTM API
            const response = await axios.post(`${LSTM_API_URL}/predict`, {
                heart_rate_history: heartRates.slice(-30), // آخر 30 قراءة
                spo2_history: spo2Values.slice(-30),
                prediction_steps: 6 // توقع الـ 6 قراءات القادمة (3 ساعات)
            });
            
            if (response.data?.success) {
                this.predictions = {
                    heartRate: response.data.predictions.heart_rate,
                    spo2: response.data.predictions.spo2,
                    confidence: response.data.confidence,
                    risks: response.data.risks,
                    timestamp: new Date().toISOString()
                };
                
                this.notifyListeners('predictions', this.predictions);
                return this.predictions;
            }
        } catch (error) {
            console.error('LSTM API Error:', error);
            // Fallback إلى التنبؤ المحلي
            return this.localPredictionFallback(
                this.history.heartRate.map(h => h.value),
                this.history.spo2.map(s => s.value)
            );
        }
    }

    // ✅ التنبؤ المحلي (Moving Average + Linear Regression) - Fallback
    localPredictionFallback(heartRates, spo2Values) {
        if (heartRates.length < 5) return null;
        
        // Moving Average للتنبؤ
        const last5HR = heartRates.slice(-5);
        const avgHR = last5HR.reduce((a, b) => a + b, 0) / last5HR.length;
        
        // Simple Linear Regression للاتجاه
        const trend = this.calculateTrend(heartRates.slice(-10));
        
        const predictions = [];
        let currentHR = avgHR;
        
        for (let i = 1; i <= 6; i++) {
            currentHR = currentHR + (trend * 0.5);
            predictions.push({
                step: i,
                minutes: i * 30,
                heartRate: Math.round(Math.max(40, Math.min(200, currentHR))),
                spo2: Math.round(Math.max(85, Math.min(100, spo2Values[spo2Values.length - 1] || 98))),
                risk: this.calculateRiskLevel(currentHR, spo2Values[spo2Values.length - 1])
            });
        }
        
        this.predictions = {
            heartRate: predictions.map(p => p.heartRate),
            spo2: predictions.map(p => p.spo2),
            confidence: 0.65, // ثقة أقل من LSTM
            risks: this.analyzeRisks(predictions),
            timestamp: new Date().toISOString(),
            model: 'local_fallback'
        };
        
        this.notifyListeners('predictions', this.predictions);
        return this.predictions;
    }

    // ✅ حساب الاتجاه (Trend)
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    // ✅ حساب مستوى الخطر
    calculateRiskLevel(heartRate, spo2) {
        let riskScore = 0;
        
        if (heartRate > 120) riskScore += 40;
        else if (heartRate > 100) riskScore += 20;
        else if (heartRate < 50) riskScore += 15;
        
        if (spo2 < 90) riskScore += 40;
        else if (spo2 < 94) riskScore += 20;
        
        if (riskScore >= 60) return 'high';
        if (riskScore >= 30) return 'medium';
        return 'low';
    }

    // ✅ تحليل المخاطر من التنبؤات
    analyzeRisks(predictions) {
        const risks = [];
        
        // التحقق من وجود خطر في أي من التنبؤات
        const highRiskPredictions = predictions.filter(p => p.risk === 'high');
        const mediumRiskPredictions = predictions.filter(p => p.risk === 'medium');
        
        if (highRiskPredictions.length > 0) {
            const firstHighRisk = highRiskPredictions[0];
            risks.push({
                level: 'critical',
                title: '⚠️ خطر صحي وشيك',
                message: `متوقع خلال ${firstHighRisk.minutes} دقيقة: نبض ${firstHighRisk.heartRate} BPM، أكسجين ${firstHighRisk.spo2}%`,
                action: 'يُنصح بالتوقف عن النشاط والراحة فوراً، ومراجعة الطبيب إذا استمرت الأعراض'
            });
        } else if (mediumRiskPredictions.length > 0) {
            risks.push({
                level: 'warning',
                title: '⚠️ تنبيه: تدهور متوقع',
                message: 'البيانات تشير إلى احتمالية تدهور الحالة الصحية خلال الساعات القادمة',
                action: 'ننصح بمراقبة العلامات الحيوية وتقليل المجهود البدني'
            });
        }
        
        // تحليل اتجاه النبض
        const hrValues = predictions.map(p => p.heartRate);
        const hrTrend = this.calculateTrend(hrValues);
        if (hrTrend > 2) {
            risks.push({
                level: 'warning',
                title: '📈 ارتفاع متسارع في النبض',
                message: `معدل ارتفاع النبض: ${hrTrend.toFixed(1)} BPM لكل قياس`,
                action: 'تأكد من أخذ قسط كافٍ من الراحة وشرب الماء'
            });
        }
        
        return risks;
    }

    // ✅ الحصول على التحليل الإحصائي
    getStatisticalAnalysis() {
        const hrValues = this.history.heartRate.map(h => h.value);
        const spo2Values = this.history.spo2.map(s => s.value);
        
        if (hrValues.length === 0) return null;
        
        const meanHR = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
        const meanSpO2 = spo2Values.length > 0 ? 
            spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length : 98;
        
        const sortedHR = [...hrValues].sort((a, b) => a - b);
        const medianHR = sortedHR[Math.floor(sortedHR.length / 2)];
        
        // حساب الانحراف المعياري (لتقييم الاستقرار)
        const variance = hrValues.reduce((sum, val) => sum + Math.pow(val - meanHR, 2), 0) / hrValues.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            heartRate: {
                mean: Math.round(meanHR),
                median: medianHR,
                min: Math.min(...hrValues),
                max: Math.max(...hrValues),
                stdDev: Math.round(stdDev * 10) / 10,
                stability: stdDev < 8 ? 'مستقر' : stdDev < 15 ? 'متقلب قليلاً' : 'غير مستقر'
            },
            spo2: {
                mean: Math.round(meanSpO2),
                min: spo2Values.length > 0 ? Math.min(...spo2Values) : 0,
                max: spo2Values.length > 0 ? Math.max(...spo2Values) : 0
            },
            totalReadings: hrValues.length,
            dataQuality: hrValues.length >= 50 ? 'ممتازة' : hrValues.length >= 20 ? 'جيدة' : 'قليلة'
        };
    }

    // ✅ تنبيه فوري عند اكتشاف قراءة خطيرة
    checkForImmediateRisk(reading) {
        const { heartRate, spo2 } = reading;
        const risks = [];
        
        // خطر فوري على القلب
        if (heartRate > 140) {
            risks.push({
                level: 'critical',
                type: 'heart_rate',
                message: `🚨 خطر فوري: نبض ${heartRate} BPM (مرتفع جداً)`,
                action: 'توقف فوراً عن أي نشاط. اطلب المساعدة الطبية إذا صاحب ذلك دوخة أو ألم في الصدر'
            });
        } else if (heartRate > 120) {
            risks.push({
                level: 'high',
                type: 'heart_rate',
                message: `⚠️ نبض مرتفع جداً: ${heartRate} BPM`,
                action: 'خفف من نشاطك وراقب الأعراض مثل الدوخة أو ضيق التنفس'
            });
        }
        
        // خطر نقص الأكسجين
        if (spo2 < 90) {
            risks.push({
                level: 'critical',
                type: 'oxygen',
                message: `🚨 نقص أكسجين خطير: ${spo2}%`,
                action: 'تنفس بعمق. إذا انخفض إلى أقل من 90%، تواصل مع الطبيب فوراً'
            });
        } else if (spo2 < 94) {
            risks.push({
                level: 'warning',
                type: 'oxygen',
                message: `⚠️ نسبة أكسجين منخفضة: ${spo2}%`,
                action: 'جرب تمارين التنفس العميق وتأكد من التهوية الجيدة'
            });
        }
        
        // خطر الجمع بين ارتفاع النبض وانخفاض الأكسجين
        if (heartRate > 110 && spo2 < 94) {
            risks.push({
                level: 'critical',
                type: 'combined',
                message: `🚨 حالة خطيرة: نبض ${heartRate} مع أكسجين ${spo2}%`,
                action: 'استشر طبيباً فوراً. هذه العلامات قد تشير إلى إجهاد قلبي تنفسي'
            });
        }
        
        if (risks.length > 0) {
            this.notifyListeners('immediateRisk', risks);
        }
        
        return risks;
    }

    // ✅ إضافة مستمع للأحداث
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return () => {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        };
    }

    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`LSTM Predictor: Listener error for ${event}`, err);
                }
            });
        }
    }

    // ✅ تصدير البيانات للتحليل
    exportData() {
        return {
            history: this.history,
            predictions: this.predictions,
            statistics: this.getStatisticalAnalysis(),
            exportDate: new Date().toISOString()
        };
    }

    // ✅ إعادة تعيين البيانات
    reset() {
        this.history = { heartRate: [], spo2: [], timestamps: [] };
        this.predictions = null;
        this.notifyListeners('reset', null);
    }
}

export default new LSTMPredictor();