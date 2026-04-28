// src/components/ActivityForm.jsx - نسخة كاملة مع ESP32 + تحليلات + سجلات زمنية + مخططات
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showCharts, setShowCharts] = useState(true);
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
    const unsubscribeESP32Ref = useRef(null); // ✅ لتخزين دالة إلغاء الاشتراك

    // ✅ جلب الأنشطة - مرة واحدة فقط
    useEffect(() => {
        fetchActivities();
        fetchAnalytics();
    }, []);

    // ✅ ✅ ✅ تسجيل مستمع ESP32 (الجزء المصحح)
    useEffect(() => {
        console.log('🎯 Setting up ESP32 listener...');
        
        // ✅ دالة معالجة بيانات ESP32 (الصيغة الصحيحة)
        const handleESP32Event = (type, data) => {
            console.log(`📡 ESP32 Event received: ${type} =`, data);
            
            if (!isMountedRef.current) return;
            
            if (type === 'heartRate') {
                setSensorHeartRate(data);
            } else if (type === 'spo2') {
                setSensorSpO2(data);
            } else if (type === 'data') {
                if (data && data.heartRate) setSensorHeartRate(data.heartRate);
                if (data && data.spo2) setSensorSpO2(data.spo2);
            } else if (type === 'error') {
                console.error('ESP32 Error:', data);
            }
        };
        
        // ✅ تسجيل المستمع (تأكد من أن esp32Service.on موجود)
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
    }, []);

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

    // ✅ حساب إحصائيات المخططات
    const getChartData = () => {
        // ✅ إحصائيات حسب نوع النشاط
        const typeStats = {};
        activities.forEach(act => {
            const type = act.activity_type;
            if (!typeStats[type]) {
                typeStats[type] = { count: 0, duration: 0, calories: 0 };
            }
            typeStats[type].count++;
            typeStats[type].duration += act.duration_minutes || 0;
            typeStats[type].calories += act.calories_burned || 0;
        });

        // ✅ أنشطة الأيام السبعة الأخيرة
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

        return { typeStats, last7Days };
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
                    avg_duration: activities.length > 0 ? Math.round(activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / activities.length) : 0
                });
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            if (isMountedRef.current) {
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: 0,
                    total_duration: 0,
                    avg_duration: 0
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
            await fetchAnalytics();
            
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            
            setFormData({ activity_type: '', duration_minutes: '', start_time: '' });
            
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ✅ ✅ ✅ دالة الاتصال بـ ESP32 (المصححة)
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        
        try {
            // بدء الـ polling (المستمع مسجل بالفعل في useEffect)
            if (esp32Service && typeof esp32Service.startPolling === 'function') {
                esp32Service.startPolling();
                setSensorActive(true);
                
                // جلب قراءة فورية
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

    // ✅ حساب أقصى قيمة للمخطط
    const maxDuration = Math.max(...Object.values(chartData.typeStats).map(s => s.duration), 0);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* ✅ قسم التحليلات */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📊 تحليل الأنشطة</h3>
                {analyticsLoading ? (
                    <p>جاري التحليل...</p>
                ) : analytics ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', textAlign: 'center' }}>
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
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_duration || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>متوسط المدة</div>
                        </div>
                    </div>
                ) : (
                    <p>لا توجد بيانات كافية</p>
                )}
            </div>
            
            {/* ✅ قسم ESP32 */}
            <div style={{ background: '#1a1a2e', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>🫀 ESP32 Health Monitor</h3>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {!sensorActive ? (
                        <button onClick={connectSensor} disabled={sensorConnecting} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            {sensorConnecting ? '⏳ جاري الاتصال...' : '🔌 اتصال ESP32'}
                        </button>
                    ) : (
                        <button onClick={disconnectSensor} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            🔌 قطع الاتصال
                        </button>
                    )}
                    
                    {sensorActive && (
                        <div style={{ display: 'flex', gap: '30px', marginTop: '15px' }}>
                            <div>
                                <span style={{ fontSize: '20px' }}>❤️</span>
                                <strong style={{ fontSize: '24px', marginLeft: '10px' }}>{sensorHeartRate !== null ? sensorHeartRate : '---'}</strong>
                                <span> BPM</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '20px' }}>💨</span>
                                <strong style={{ fontSize: '24px', marginLeft: '10px' }}>{sensorSpO2 !== null ? sensorSpO2 : '---'}</strong>
                                <span> SpO₂%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* ✅ نموذج إضافة نشاط */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>➕ إضافة نشاط جديد</h3>
                <form onSubmit={handleSubmit}>
                    <select name="activity_type" value={formData.activity_type} onChange={handleChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <option value="">اختر نوع النشاط</option>
                        <option value="walking">🚶 مشي</option>
                        <option value="running">🏃 جري</option>
                        <option value="cycling">🚴 دراجة</option>
                        <option value="swimming">🏊 سباحة</option>
                        <option value="yoga">🧘 يوجا</option>
                        <option value="weightlifting">🏋️ رفع أثقال</option>
                        <option value="cardio">❤️ تمارين قلب</option>
                    </select>
                    
                    <input type="number" name="duration_minutes" placeholder="المدة (دقائق)" value={formData.duration_minutes} onChange={handleChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    
                    <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {loading ? 'جاري الحفظ...' : '💾 حفظ النشاط'}
                    </button>
                </form>
            </div>
            
            {/* ✅ المخططات البيانية */}
            {activities.length > 0 && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>📈 المخططات البيانية</h3>
                        <button 
                            onClick={() => setShowCharts(!showCharts)}
                            style={{ padding: '5px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            {showCharts ? '📋 إخفاء المخططات' : '📊 إظهار المخططات'}
                        </button>
                    </div>
                    
                    {showCharts && (
                        <>
                            {/* مخطط 1: توزيع الأنشطة حسب النوع */}
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 توزيع الأنشطة حسب النوع</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {Object.entries(chartData.typeStats).map(([type, stats]) => (
                                        <div key={type}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                                                <span>{getActivityIcon(type)} {getActivityName(type)}</span>
                                                <span>{stats.duration} دقيقة ({stats.count} نشاط)</span>
                                            </div>
                                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${maxDuration > 0 ? (stats.duration / maxDuration) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                                    padding: '8px 10px',
                                                    borderRadius: '10px',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    textAlign: 'right',
                                                    transition: 'width 0.5s ease'
                                                }}>
                                                    {stats.duration} دقيقة
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* مخطط 2: نشاط آخر 7 أيام */}
                            <div>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📅 آخر 7 أيام</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', justifyContent: 'center', minHeight: '200px' }}>
                                    {chartData.last7Days.map((day, idx) => {
                                        const maxDayDuration = Math.max(...chartData.last7Days.map(d => d.duration), 1);
                                        const height = (day.duration / maxDayDuration) * 150;
                                        return (
                                            <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                                                <div style={{ 
                                                    height: `${height}px`, 
                                                    background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                                                    borderRadius: '8px 8px 0 0',
                                                    transition: 'height 0.5s ease',
                                                    cursor: 'pointer',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-25px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        fontSize: '11px',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {day.name}
                                                        <br />
                                                        <strong>{day.duration}د</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* مخطط 3: إحصائيات دائرية بسيطة */}
                            <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>🎯 ملخص سريع</h4>
                                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{activities.length}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>نشاط</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            {Math.round(activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>ساعة</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                            {Object.keys(chartData.typeStats).length}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>نوع نشاط</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {/* ✅ السجلات الزمنية (Timeline) */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📋 السجل الزمني للأنشطة</h3>
                
                {fetching ? (
                    <p style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</p>
                ) : activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏃‍♂️</div>
                        <p>لا توجد أنشطة مسجلة</p>
                        <p style={{ fontSize: '12px' }}>أضف نشاطك الأول باستخدام النموذج أعلاه</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '30px' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(180deg, #6366f1, #8b5cf6, #a855f7)' }}></div>
                        
                        {activities.map((act, index) => (
                            <div key={act.id} style={{ position: 'relative', marginBottom: '20px', paddingLeft: '20px' }}>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: '-26px', 
                                    top: '5px', 
                                    width: '12px', 
                                    height: '12px', 
                                    borderRadius: '50%', 
                                    background: index === 0 ? '#f59e0b' : '#6366f1', 
                                    border: '2px solid white', 
                                    boxShadow: '0 0 0 2px #6366f1' 
                                }}></div>
                                
                                <div style={{ 
                                    background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f8f9fa', 
                                    padding: '15px', 
                                    borderRadius: '10px', 
                                    cursor: 'pointer',
                                    border: index === 0 ? '1px solid #f59e0b' : '1px solid #e0e0e0',
                                    transition: 'transform 0.2s'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{getActivityIcon(act.activity_type)}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{getActivityName(act.activity_type)}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>{act.duration_minutes} دقيقة</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', direction: isArabic ? 'ltr' : 'ltr' }}>
                                            📅 {formatDateTime(act.start_time || act.created_at)}
                                        </div>
                                    </div>
                                    {act.calories_burned > 0 && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#f59e0b' }}>
                                            🔥 {act.calories_burned} سعرة حرارية
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {activities.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#666' }}>
                        <span>📊 آخر نشاط: {getActivityName(activities[0]?.activity_type)}</span>
                        <span>⏱️ إجمالي: {activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)} دقيقة</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityForm;