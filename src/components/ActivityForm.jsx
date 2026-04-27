// src/components/ActivityForm.jsx - نسخة مستقرة مع ESP32 + تحليلات مبسطة
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: ''
    });
    
    // ✅ حالة التحليلات
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    
    // ✅ حالة ESP32
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const analyticsFetchedRef = useRef(false);

    // ✅ جلب الأنشطة - مرة واحدة فقط
    useEffect(() => {
        fetchActivities();
        fetchAnalytics(); // ✅ جلب التحليلات مرة واحدة
    }, []);

    // ✅ جلب التحليلات
    const fetchAnalytics = async () => {
        if (analyticsFetchedRef.current) return;
        analyticsFetchedRef.current = true;
        setAnalyticsLoading(true);
        
        try {
            const response = await axiosInstance.get('/analytics/activity-insights/').catch(() => null);
            
            if (response?.data && isMountedRef.current) {
                setAnalytics(response.data);
                console.log('✅ Activity analytics loaded');
            } else if (isMountedRef.current) {
                // ✅ بيانات محلية بديلة
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: 0,
                    total_duration: activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                    message: isArabic ? 'قم بتسجيل المزيد من الأنشطة' : 'Log more activities'
                });
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            if (isMountedRef.current) {
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: 0,
                    total_duration: 0,
                    message: isArabic ? 'غير متاح حالياً' : 'Currently unavailable'
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
            setActivities(data);
            
            // ✅ تحديث التحليلات بعد جلب الأنشطة
            if (analytics) {
                setAnalytics(prev => ({
                    ...prev,
                    total_activities: data.length,
                    total_duration: data.reduce((sum, act) => sum + (act.duration_minutes || 0), 0)
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await axiosInstance.post('/activities/', {
                activity_type: formData.activity_type,
                duration_minutes: parseInt(formData.duration_minutes),
                start_time: formData.start_time || new Date().toISOString().slice(0, 16)
            });
            
            await fetchActivities();
            await fetchAnalytics(); // ✅ تحديث التحليلات بعد الإضافة
            
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            
            setFormData({ activity_type: '', duration_minutes: '', start_time: '' });
            
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ✅ الاتصال بـ ESP32 (يدوي فقط - لا يبدأ تلقائياً)
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        
        try {
            esp32Service.startPolling();
            setSensorActive(true);
            
            const handleData = (data) => {
                if (data.heartRate) setSensorHeartRate(data.heartRate);
                if (data.spo2) setSensorSpO2(data.spo2);
            };
            
            esp32Service.on('data', handleData);
            
        } catch (error) {
            console.error('ESP32 connection error:', error);
        } finally {
            setSensorConnecting(false);
        }
    }, []);

    // ✅ قطع الاتصال
    const disconnectSensor = useCallback(() => {
        esp32Service.stopPolling();
        setSensorActive(false);
        setSensorHeartRate(null);
        setSensorSpO2(null);
    }, []);

    // ✅ تنظيف عند إزالة المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            esp32Service.stopPolling();
        };
    }, []);

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
            
            {/* ✅ قسم التحليلات */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>📊 تحليل الأنشطة</h3>
                {analyticsLoading ? (
                    <p>جاري التحليل...</p>
                ) : analytics ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_activities || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>عدد الأنشطة</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_calories || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>سعرات حرارية</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_duration || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>دقائق</div>
                        </div>
                    </div>
                ) : (
                    <p>لا توجد بيانات كافية</p>
                )}
            </div>
            
            {/* ✅ قسم ESP32 */}
            <div style={{ background: '#1a1a2e', color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>🫀 ESP32 Health Monitor</h3>
                
                {!sensorActive ? (
                    <button onClick={connectSensor} disabled={sensorConnecting} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        {sensorConnecting ? 'جاري الاتصال...' : '🔌 اتصال ESP32'}
                    </button>
                ) : (
                    <button onClick={disconnectSensor} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        🔌 قطع الاتصال
                    </button>
                )}
                
                {sensorActive && (
                    <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                        <div>
                            <span>❤️ النبض: </span>
                            <strong>{sensorHeartRate || '---'} BPM</strong>
                        </div>
                        <div>
                            <span>💨 الأكسجين: </span>
                            <strong>{sensorSpO2 || '---'} SpO₂%</strong>
                        </div>
                    </div>
                )}
            </div>
            
            {/* ✅ نموذج إضافة نشاط */}
            <h3 style={{ margin: '0 0 15px 0' }}>➕ إضافة نشاط جديد</h3>
            <form onSubmit={handleSubmit}>
                <select name="activity_type" value={formData.activity_type} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="">اختر نوع النشاط</option>
                    <option value="walking">🚶 مشي</option>
                    <option value="running">🏃 جري</option>
                    <option value="cycling">🚴 دراجة</option>
                    <option value="swimming">🏊 سباحة</option>
                    <option value="yoga">🧘 يوجا</option>
                </select>
                
                <input type="number" name="duration_minutes" placeholder="المدة (دقائق)" value={formData.duration_minutes} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                
                <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {loading ? 'جاري الحفظ...' : '💾 حفظ النشاط'}
                </button>
            </form>
            
            <hr style={{ margin: '20px 0' }} />
            
            {/* ✅ قائمة الأنشطة */}
            <h4 style={{ margin: '0 0 10px 0' }}>📋 سجل الأنشطة ({activities.length})</h4>
            {fetching ? (
                <p>جاري التحميل...</p>
            ) : activities.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>لا توجد أنشطة مسجلة</p>
            ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {activities.map(act => (
                        <div key={act.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{act.activity_type}</span>
                            <span>{act.duration_minutes} دقيقة</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityForm;