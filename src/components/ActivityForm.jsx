// src/components/ActivityForm.jsx - نسخة محدثة مع درجة الحرارة + الوزن + السكر + تعديل السعرات
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showCharts, setShowCharts] = useState(true);
    
    // ✅ بيانات النشاط (مع إضافة الحقول الصحية)
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        calories_burned: '', // ✅ editable manually
        notes: ''            // ✅ ملاحظات إضافية
    });
    
    // ✅ البيانات الصحية الإضافية (تضاف مع كل نشاط)
    const [healthData, setHealthData] = useState({
        body_temperature: '',      // درجة حرارة الجسم (مئوية)
        weight_kg: '',             // الوزن (كجم)
        blood_sugar_mgdl: ''       // مستوى السكر (مجم/دل)
    });
    
    // ✅ حالة التحليلات
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    
    // ✅ حالة ESP32
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    const [lastSensorReading, setLastSensorReading] = useState(null); // حفظ آخر قراءة
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const analyticsFetchedRef = useRef(false);
    const unsubscribeESP32Ref = useRef(null);

    // ✅ جلب الأنشطة والتحليلات
    useEffect(() => {
        fetchActivities();
        fetchAnalytics();
    }, []);

    // ✅ تسجيل مستمع ESP32
    useEffect(() => {
        console.log('🎯 Setting up ESP32 listener...');
        
        const handleESP32Event = (type, data) => {
            console.log(`📡 ESP32 Event received: ${type} =`, data);
            
            if (!isMountedRef.current) return;
            
            let heartRate = null;
            let spo2 = null;
            
            if (type === 'heartRate') {
                heartRate = data;
                setSensorHeartRate(data);
            } else if (type === 'spo2') {
                spo2 = data;
                setSensorSpO2(data);
            } else if (type === 'data') {
                if (data && data.heartRate) {
                    heartRate = data.heartRate;
                    setSensorHeartRate(data.heartRate);
                }
                if (data && data.spo2) {
                    spo2 = data.spo2;
                    setSensorSpO2(data.spo2);
                }
            } else if (type === 'error') {
                console.error('ESP32 Error:', data);
            }
            
            // حفظ آخر قراءة كاملة
            if (heartRate !== null || spo2 !== null) {
                setLastSensorReading({
                    heartRate: heartRate !== null ? heartRate : sensorHeartRate,
                    spo2: spo2 !== null ? spo2 : sensorSpO2,
                    timestamp: new Date().toISOString()
                });
            }
        };
        
        if (esp32Service && typeof esp32Service.on === 'function') {
            unsubscribeESP32Ref.current = esp32Service.on(handleESP32Event);
            console.log('✅ ESP32 listener registered');
        } else {
            console.error('❌ esp32Service.on is not a function');
        }
        
        return () => {
            if (unsubscribeESP32Ref.current) {
                unsubscribeESP32Ref.current();
                console.log('❌ ESP32 listener removed');
            }
            if (esp32Service && typeof esp32Service.stopPolling === 'function') {
                esp32Service.stopPolling();
            }
        };
    }, [sensorHeartRate, sensorSpO2]);

    // ✅ تنسيق التاريخ والوقت
    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    // ✅ الحصول على أيقونة النشاط
    const getActivityIcon = (type) => {
        const icons = {
            walking: '🚶',
            running: '🏃',
            cycling: '🚴',
            swimming: '🏊',
            yoga: '🧘',
            weightlifting: '🏋️',
            cardio: '❤️',
            other: '🏅'
        };
        return icons[type] || '🏃‍♂️';
    };

    // ✅ الحصول على اسم النشاط بالعربية
    const getActivityName = (type) => {
        const names = {
            walking: 'مشي',
            running: 'جري',
            cycling: 'دراجة',
            swimming: 'سباحة',
            yoga: 'يوجا',
            weightlifting: 'رفع أثقال',
            cardio: 'تمارين قلب',
            other: 'أخرى'
        };
        return names[type] || type;
    };

    // ✅ حساب السعرات الحرارية تلقائياً بناءً على النشاط والمدة والوزن
    const calculateCalories = (activityType, durationMinutes, weightKg) => {
        if (!durationMinutes || !weightKg) return 0;
        
        // معاملات MET لأنواع الأنشطة المختلفة (سعرات لكل كجم في الساعة)
        const metValues = {
            walking: 3.5,
            running: 8.0,
            cycling: 6.0,
            swimming: 7.0,
            yoga: 2.5,
            weightlifting: 4.5,
            cardio: 6.5,
            other: 3.0
        };
        
        const met = metValues[activityType] || 3.0;
        const hours = durationMinutes / 60;
        // الصيغة: MET × الوزن (كجم) × الساعات
        const calories = Math.round(met * weightKg * hours);
        return calories;
    };

    // ✅ تحديث السعرات تلقائياً عند تغيير النشاط أو المدة أو الوزن
    useEffect(() => {
        if (formData.activity_type && formData.duration_minutes && healthData.weight_kg) {
            const calculated = calculateCalories(
                formData.activity_type,
                parseFloat(formData.duration_minutes),
                parseFloat(healthData.weight_kg)
            );
            if (calculated > 0 && !formData.calories_burned) {
                setFormData(prev => ({
                    ...prev,
                    calories_burned: calculated.toString()
                }));
            }
        }
    }, [formData.activity_type, formData.duration_minutes, healthData.weight_kg]);

    // ✅ حساب إحصائيات المخططات
    const getChartData = () => {
        const typeStats = {};
        const healthStats = {
            avgTemperature: 0,
            avgWeight: 0,
            avgBloodSugar: 0,
            totalCalories: 0
        };
        
        let tempSum = 0, weightSum = 0, sugarSum = 0, tempCount = 0, weightCount = 0, sugarCount = 0;
        
        activities.forEach(act => {
            const type = act.activity_type;
            if (!typeStats[type]) {
                typeStats[type] = { count: 0, duration: 0, calories: 0 };
            }
            typeStats[type].count++;
            typeStats[type].duration += act.duration_minutes || 0;
            typeStats[type].calories += act.calories_burned || 0;
            healthStats.totalCalories += act.calories_burned || 0;
            
            if (act.body_temperature) {
                tempSum += parseFloat(act.body_temperature);
                tempCount++;
            }
            if (act.weight_kg) {
                weightSum += parseFloat(act.weight_kg);
                weightCount++;
            }
            if (act.blood_sugar_mgdl) {
                sugarSum += parseFloat(act.blood_sugar_mgdl);
                sugarCount++;
            }
        });
        
        healthStats.avgTemperature = tempCount > 0 ? (tempSum / tempCount).toFixed(1) : 0;
        healthStats.avgWeight = weightCount > 0 ? (weightSum / weightCount).toFixed(1) : 0;
        healthStats.avgBloodSugar = sugarCount > 0 ? Math.round(sugarSum / sugarCount) : 0;
        
        // آخر 7 أيام
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' });
            const dayStr = date.toISOString().split('T')[0];
            
            const dayActivities = activities.filter(act => {
                const actDate = new Date(act.start_time || act.created_at).toISOString().split('T')[0];
                return actDate === dayStr;
            });
            
            last7Days.push({
                name: dayName,
                duration: dayActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0),
                count: dayActivities.length
            });
        }
        
        return { typeStats, last7Days, healthStats };
    };

    const chartData = getChartData();

    // ✅ جلب التحليلات
    const fetchAnalytics = async () => {
        if (analyticsFetchedRef.current) return;
        analyticsFetchedRef.current = true;
        setAnalyticsLoading(true);
        
        try {
            const response = await axiosInstance.get('/analytics/activity-insights/').catch(() => null);
            
            if (response?.data && isMountedRef.current) {
                setAnalytics(response.data);
            } else if (isMountedRef.current) {
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: activities.reduce((sum, act) => sum + (act.calories_burned || 0), 0),
                    total_duration: activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                    avg_duration: activities.length > 0 ? Math.round(activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / activities.length) : 0,
                    avg_temperature: chartData.healthStats.avgTemperature,
                    avg_weight: chartData.healthStats.avgWeight,
                    avg_blood_sugar: chartData.healthStats.avgBloodSugar
                });
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            if (isMountedRef.current) {
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: 0,
                    total_duration: 0,
                    avg_duration: 0,
                    avg_temperature: 0,
                    avg_weight: 0,
                    avg_blood_sugar: 0
                });
            }
        } finally {
            if (isMountedRef.current) setAnalyticsLoading(false);
        }
    };

    const fetchActivities = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setFetching(true);
        
        try {
            const response = await axiosInstance.get('/activities/');
            let data = response.data?.results || response.data || [];
            const sortedData = [...data].sort((a, b) => 
                new Date(b.start_time || b.created_at) - new Date(a.start_time || a.created_at)
            );
            setActivities(sortedData);
            
            if (analytics) {
                setAnalytics(prev => ({
                    ...prev,
                    total_activities: sortedData.length,
                    total_duration: sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                    avg_duration: sortedData.length > 0 ? Math.round(sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / sortedData.length) : 0
                }));
            }
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setFetching(false);
            isFetchingRef.current = false;
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleHealthChange = (e) => {
        setHealthData({ ...healthData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // تجهيز البيانات للإرسال
        const payload = {
            activity_type: formData.activity_type,
            duration_minutes: parseInt(formData.duration_minutes),
            start_time: formData.start_time || new Date().toISOString().slice(0, 16),
            calories_burned: formData.calories_burned ? parseInt(formData.calories_burned) : null,
            notes: formData.notes || null,
            // ✅ إضافة البيانات الصحية
            body_temperature: healthData.body_temperature ? parseFloat(healthData.body_temperature) : null,
            weight_kg: healthData.weight_kg ? parseFloat(healthData.weight_kg) : null,
            blood_sugar_mgdl: healthData.blood_sugar_mgdl ? parseInt(healthData.blood_sugar_mgdl) : null,
            // ✅ إضافة قراءات ESP32 إذا كانت متوفرة
            heart_rate_bpm: lastSensorReading?.heartRate || null,
            blood_oxygen_spo2: lastSensorReading?.spo2 || null
        };
        
        try {
            await axiosInstance.post('/activities/', payload);
            
            await fetchActivities();
            await fetchAnalytics();
            
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            
            // ✅ إعادة تعيين النموذج
            setFormData({ 
                activity_type: '', 
                duration_minutes: '', 
                start_time: '', 
                calories_burned: '',
                notes: ''
            });
            setHealthData({
                body_temperature: '',
                weight_kg: '',
                blood_sugar_mgdl: ''
            });
            
        } catch (err) {
            console.error('Save error:', err);
            alert('حدث خطأ في حفظ البيانات: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // ✅ دالة الاتصال بـ ESP32
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        
        try {
            if (esp32Service && typeof esp32Service.startPolling === 'function') {
                esp32Service.startPolling();
                setSensorActive(true);
                
                if (typeof esp32Service.fetchLatestReading === 'function') {
                    await esp32Service.fetchLatestReading();
                }
            } else {
                console.error('❌ esp32Service not available');
            }
        } catch (error) {
            console.error('ESP32 connection error:', error);
        } finally {
            setSensorConnecting(false);
        }
    }, []);

    const disconnectSensor = useCallback(() => {
        if (esp32Service && typeof esp32Service.stopPolling === 'function') {
            esp32Service.stopPolling();
        }
        setSensorActive(false);
        setSensorHeartRate(null);
        setSensorSpO2(null);
        setLastSensorReading(null);
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (esp32Service && typeof esp32Service.stopPolling === 'function') {
                esp32Service.stopPolling();
            }
        };
    }, []);

    const maxDuration = Math.max(...Object.values(chartData.typeStats).map(s => s.duration), 0);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto', background: '#f0f2f5' }}>
            
            {/* ✅ قسم التحليلات المتقدم */}
            <div style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '22px' }}>📊 لوحة التحليل الصحي</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{analytics?.total_activities || 0}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>عدد الأنشطة</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{analytics?.total_calories || 0}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>سعرات حرارية</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{analytics?.total_duration || 0}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>دقائق</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{chartData.healthStats.avgTemperature}°</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>متوسط الحرارة</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{chartData.healthStats.avgWeight}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>متوسط الوزن (كجم)</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{chartData.healthStats.avgBloodSugar}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>متوسط السكر (مجم/دل)</div>
                    </div>
                </div>
            </div>
            
            {/* ✅ صف مكون من قسمين: ESP32 + النموذج */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                
                {/* قسم ESP32 */}
                <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🫀</span> ESP32 Health Monitor
                        {sensorActive && <span style={{ fontSize: '12px', background: '#10b981', padding: '2px 8px', borderRadius: '20px' }}>متصل</span>}
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {!sensorActive ? (
                            <button onClick={connectSensor} disabled={sensorConnecting} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>
                                {sensorConnecting ? '⏳ جاري الاتصال...' : '🔌 اتصال ESP32'}
                            </button>
                        ) : (
                            <button onClick={disconnectSensor} style={{ padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                                🔌 قطع الاتصال
                            </button>
                        )}
                    </div>
                    
                    {sensorActive && (
                        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '36px' }}>❤️</div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{sensorHeartRate !== null ? sensorHeartRate : '---'}</div>
                                <div style={{ fontSize: '12px', opacity: 0.7 }}>نبض (BPM)</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '36px' }}>💨</div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{sensorSpO2 !== null ? sensorSpO2 : '---'}</div>
                                <div style={{ fontSize: '12px', opacity: 0.7 }}>الأكسجين (SpO₂%)</div>
                            </div>
                        </div>
                    )}
                    
                    {lastSensorReading && (
                        <div style={{ marginTop: '10px', fontSize: '11px', textAlign: 'center', opacity: 0.6 }}>
                            آخر تحديث: {new Date(lastSensorReading.timestamp).toLocaleTimeString()}
                        </div>
                    )}
                </div>
                
                {/* ✅ نموذج إضافة نشاط مع الحقول الصحية */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#1e3c72', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>➕</span> إضافة نشاط جديد
                    </h3>
                    
                    <form onSubmit={handleSubmit}>
                        {/* قسم بيانات النشاط */}
                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>🏃 بيانات النشاط</h4>
                            <select name="activity_type" value={formData.activity_type} onChange={handleChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px' }}>
                                <option value="">اختر نوع النشاط</option>
                                <option value="walking">🚶 مشي</option>
                                <option value="running">🏃 جري</option>
                                <option value="cycling">🚴 دراجة</option>
                                <option value="swimming">🏊 سباحة</option>
                                <option value="yoga">🧘 يوجا</option>
                                <option value="weightlifting">🏋️ رفع أثقال</option>
                                <option value="cardio">❤️ تمارين قلب</option>
                            </select>
                            
                            <input type="number" name="duration_minutes" placeholder="⏱️ المدة (دقائق)" value={formData.duration_minutes} onChange={handleChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
                            
                            <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
                            
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="number" name="calories_burned" placeholder="🔥 سعرات حرارية (تلقائي أو يدوي)" value={formData.calories_burned} onChange={handleChange} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                {healthData.weight_kg && formData.activity_type && formData.duration_minutes && (
                                    <span style={{ fontSize: '12px', color: '#10b981' }}>تلقائي</span>
                                )}
                            </div>
                        </div>
                        
                        {/* ✅ قسم البيانات الصحية */}
                        <div style={{ background: '#e8f4f8', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2a5298', fontSize: '14px' }}>🩺 البيانات الحيوية (اختياري)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>🌡️ درجة الحرارة (°C)</label>
                                    <input type="number" step="0.1" name="body_temperature" placeholder="مثال: 36.6" value={healthData.body_temperature} onChange={handleHealthChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>⚖️ الوزن (كجم)</label>
                                    <input type="number" step="0.1" name="weight_kg" placeholder="مثال: 70.5" value={healthData.weight_kg} onChange={handleHealthChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>🩸 السكر (مجم/دل)</label>
                                    <input type="number" name="blood_sugar_mgdl" placeholder="مثال: 95" value={healthData.blood_sugar_mgdl} onChange={handleHealthChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                                </div>
                            </div>
                        </div>
                        
                        <textarea name="notes" placeholder="📝 ملاحظات إضافية (اختياري)" value={formData.notes} onChange={handleChange} rows="2" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ddd', resize: 'vertical' }}></textarea>
                        
                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e3c72, #2a5298)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.3s' }}>
                            {loading ? '⏳ جاري الحفظ...' : '💾 حفظ النشاط والبيانات الصحية'}
                        </button>
                    </form>
                </div>
            </div>
            
            {/* ✅ المخططات البيانية (نفس الكود السابق مع إضافات طفيفة) */}
            {activities.length > 0 && (
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0, color: '#1e3c72' }}>📈 المخططات البيانية</h3>
                        <button onClick={() => setShowCharts(!showCharts)} style={{ padding: '6px 14px', background: '#2a5298', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>
                            {showCharts ? '📋 إخفاء' : '📊 إظهار'}
                        </button>
                    </div>
                    
                    {showCharts && (
                        <>
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 توزيع الأنشطة حسب النوع</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {Object.entries(chartData.typeStats).map(([type, stats]) => (
                                        <div key={type}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                                                <span>{getActivityIcon(type)} {getActivityName(type)}</span>
                                                <span>{stats.duration} دقيقة ({stats.count} نشاط | {stats.calories} سعرة)</span>
                                            </div>
                                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${maxDuration > 0 ? (stats.duration / maxDuration) * 100 : 0}%`, background: 'linear-gradient(90deg, #1e3c72, #2a5298)', padding: '8px 10px', borderRadius: '10px', color: 'white', fontSize: '12px', textAlign: 'right', transition: 'width 0.5s ease' }}>
                                                    {stats.duration} دقيقة
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📅 آخر 7 أيام</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', justifyContent: 'center', minHeight: '200px' }}>
                                    {chartData.last7Days.map((day, idx) => {
                                        const maxDayDuration = Math.max(...chartData.last7Days.map(d => d.duration), 1);
                                        const height = (day.duration / maxDayDuration) * 150;
                                        return (
                                            <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                                                <div style={{ height: `${height}px`, background: 'linear-gradient(180deg, #1e3c72, #2a5298)', borderRadius: '8px 8px 0 0', transition: 'height 0.5s ease', cursor: 'pointer', position: 'relative' }}>
                                                    <div style={{ position: 'absolute', bottom: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                        {day.name}<br/><strong>{day.duration}د</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {/* ✅ السجل الزمني للأنشطة مع عرض البيانات الصحية */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1e3c72' }}>📋 السجل الزمني للأنشطة</h3>
                
                {fetching ? (
                    <p style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</p>
                ) : activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏃‍♂️</div>
                        <p>لا توجد أنشطة مسجلة</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '30px' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(180deg, #1e3c72, #2a5298)' }}></div>
                        
                        {activities.map((act, index) => (
                            <div key={act.id} style={{ position: 'relative', marginBottom: '20px', paddingLeft: '20px' }}>
                                <div style={{ position: 'absolute', left: '-26px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', background: index === 0 ? '#f59e0b' : '#1e3c72', border: '2px solid white', boxShadow: '0 0 0 2px #2a5298' }}></div>
                                
                                <div style={{ background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f8f9fa', padding: '15px', borderRadius: '12px', border: index === 0 ? '1px solid #f59e0b' : '1px solid #e0e0e0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{getActivityIcon(act.activity_type)}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{getActivityName(act.activity_type)}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>⏱️ {act.duration_minutes} دقيقة</div>
                                                {act.calories_burned > 0 && <div style={{ fontSize: '12px', color: '#f59e0b' }}>🔥 {act.calories_burned} سعرة</div>}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666', textAlign: 'right' }}>
                                            📅 {formatDateTime(act.start_time || act.created_at)}
                                        </div>
                                    </div>
                                    
                                    {/* ✅ عرض البيانات الصحية إذا كانت موجودة */}
                                    {(act.body_temperature || act.weight_kg || act.blood_sugar_mgdl || act.heart_rate_bpm || act.blood_oxygen_spo2) && (
                                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #ddd', display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '12px' }}>
                                            {act.body_temperature && <span>🌡️ {act.body_temperature}°C</span>}
                                            {act.weight_kg && <span>⚖️ {act.weight_kg} كجم</span>}
                                            {act.blood_sugar_mgdl && <span>🩸 {act.blood_sugar_mgdl} مجم/دل</span>}
                                            {act.heart_rate_bpm && <span>❤️ {act.heart_rate_bpm} BPM</span>}
                                            {act.blood_oxygen_spo2 && <span>💨 {act.blood_oxygen_spo2}% SpO₂</span>}
                                        </div>
                                    )}
                                    
                                    {act.notes && (
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                                            📝 {act.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {activities.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#666', flexWrap: 'wrap' }}>
                        <span>📊 آخر نشاط: {getActivityName(activities[0]?.activity_type)}</span>
                        <span>⏱️ إجمالي: {activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)} دقيقة</span>
                        <span>🔥 إجمالي سعرات: {activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityForm;