// src/components/ActivityForm.jsx - النسخة المحدثة مع درجة حرارة الجسم (إدخال يدوي)

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
        start_time: '',
        body_temperature: '',      // ✅ درجة حرارة الجسم - إدخال يدوي
        custom_calories: ''        // ✅ السعرات المخصصة
    });
    
    // ✅ حالة التحليلات
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    
    // ✅ حالة ESP32 (بدون درجة حرارة)
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    
    // ✅ وضع التحرير للسعرات
    const [editingCalories, setEditingCalories] = useState(null);
    const [tempCalories, setTempCalories] = useState('');
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const analyticsFetchedRef = useRef(false);
    const unsubscribeESP32Ref = useRef(null);

    // ✅ حساب السعرات الحرارية التقديرية حسب النشاط والمدة
    const calculateEstimatedCalories = (activityType, durationMinutes, weightKg = 70) => {
        const caloriesPerMinute = {
            walking: 3.5,
            running: 8.5,
            cycling: 6.5,
            swimming: 7.0,
            yoga: 3.0,
            weightlifting: 5.0,
            cardio: 7.5,
            other: 4.0
        };
        const rate = caloriesPerMinute[activityType] || 4.0;
        return Math.round(rate * durationMinutes * (weightKg / 70));
    };

    // ✅ تنسيق التاريخ والوقت
    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateString; }
    };

    // ✅ الحصول على أيقونة النشاط
    const getActivityIcon = (type) => {
        const icons = { walking: '🚶', running: '🏃', cycling: '🚴', swimming: '🏊', yoga: '🧘', weightlifting: '🏋️', cardio: '❤️', other: '🏅' };
        return icons[type] || '🏃‍♂️';
    };

    // ✅ الحصول على اسم النشاط بالعربية
    const getActivityName = (type) => {
        const names = { walking: 'مشي', running: 'جري', cycling: 'دراجة', swimming: 'سباحة', yoga: 'يوجا', weightlifting: 'رفع أثقال', cardio: 'تمارين قلب', other: 'أخرى' };
        return names[type] || type;
    };

    // ✅ حساب إحصائيات المخططات
    const getChartData = () => {
        const typeStats = {};
        activities.forEach(act => {
            const type = act.activity_type;
            if (!typeStats[type]) typeStats[type] = { count: 0, duration: 0, calories: 0 };
            typeStats[type].count++;
            typeStats[type].duration += act.duration_minutes || 0;
            typeStats[type].calories += act.calories_burned || 0;
        });

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
                setAnalytics({ total_activities: activities.length, total_calories: 0, total_duration: 0, avg_duration: 0 });
            }
        } finally {
            if (isMountedRef.current) setAnalyticsLoading(false);
        }
    };

    // ✅ جلب الأنشطة
    const fetchActivities = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setFetching(true);
        try {
            const response = await axiosInstance.get('/activities/');
            let data = response.data?.results || response.data || [];
            const sortedData = [...data].sort((a, b) => new Date(b.start_time || b.created_at) - new Date(a.start_time || a.created_at));
            setActivities(sortedData);
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setFetching(false);
            isFetchingRef.current = false;
        }
    };

    // ✅ جلب الأنشطة والتحليلات عند التحميل
    useEffect(() => {
        fetchActivities();
        fetchAnalytics();
    }, []);

    // ✅ تسجيل مستمع ESP32 (بدون درجة حرارة)
    useEffect(() => {
        console.log('🎯 Setting up ESP32 listener...');
        
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
        
        if (esp32Service && typeof esp32Service.on === 'function') {
            unsubscribeESP32Ref.current = esp32Service.on(handleESP32Event);
            console.log('✅ ESP32 listener registered');
        }
        
        return () => {
            if (unsubscribeESP32Ref.current) unsubscribeESP32Ref.current();
            if (esp32Service && typeof esp32Service.stopPolling === 'function') {
                esp32Service.stopPolling();
            }
        };
    }, []);

    // ✅ معالجة تغيير الحقول
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // ✅ تحديث السعرات التقديرية تلقائياً
        if (name === 'activity_type' || name === 'duration_minutes') {
            const activityType = name === 'activity_type' ? value : formData.activity_type;
            const duration = name === 'duration_minutes' ? parseInt(value) : parseInt(formData.duration_minutes);
            if (activityType && duration > 0) {
                const estimated = calculateEstimatedCalories(activityType, duration);
                setFormData(prev => ({ ...prev, custom_calories: estimated.toString() }));
            }
        }
    };

    // ✅ حفظ النشاط
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const duration = parseInt(formData.duration_minutes);
        const caloriesBurned = formData.custom_calories 
            ? parseInt(formData.custom_calories) 
            : calculateEstimatedCalories(formData.activity_type, duration);
        
        const bodyTemperature = formData.body_temperature 
            ? parseFloat(formData.body_temperature) 
            : null;
        
        try {
            await axiosInstance.post('/activities/', {
                activity_type: formData.activity_type,
                duration_minutes: duration,
                start_time: formData.start_time || new Date().toISOString().slice(0, 16),
                calories_burned: caloriesBurned,
                body_temperature: bodyTemperature  // ✅ إضافة درجة الحرارة
            });
            
            await fetchActivities();
            await fetchAnalytics();
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            
            setFormData({ 
                activity_type: '', duration_minutes: '', start_time: '', 
                body_temperature: '', custom_calories: '' 
            });
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ✅ الاتصال بـ ESP32
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        try {
            if (esp32Service && typeof esp32Service.startPolling === 'function') {
                esp32Service.startPolling();
                setSensorActive(true);
                if (typeof esp32Service.fetchLatestReading === 'function') {
                    await esp32Service.fetchLatestReading();
                }
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

    // ✅ تحرير السعرات
    const startEditCalories = (activityId, currentCalories) => {
        setEditingCalories(activityId);
        setTempCalories(currentCalories.toString());
    };

    const saveCaloriesEdit = async (activityId) => {
        try {
            await axiosInstance.patch(`/activities/${activityId}/`, {
                calories_burned: parseInt(tempCalories)
            });
            await fetchActivities();
            setEditingCalories(null);
            setTempCalories('');
        } catch (err) {
            console.error('Error updating calories:', err);
        }
    };

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
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* ✅ قسم التحليلات */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', padding: '20px', borderRadius: '16px',
                marginBottom: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📊 تحليل الأنشطة</h3>
                {analyticsLoading ? (
                    <p>جاري التحليل...</p>
                ) : analytics ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', textAlign: 'center' }}>
                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_activities || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>عدد الأنشطة</div></div>
                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_calories || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>سعرات حرارية</div></div>
                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_duration || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>دقائق</div></div>
                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_duration || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>متوسط المدة</div></div>
                    </div>
                ) : <p>لا توجد بيانات كافية</p>}
            </div>
            
            {/* ✅ قسم ESP32 - بدون درجة حرارة */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: 'white', padding: '20px', borderRadius: '16px',
                marginBottom: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>🫀 مراقبة العلامات الحيوية (ESP32)</h3>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
                    {!sensorActive ? (
                        <button onClick={connectSensor} disabled={sensorConnecting} style={{
                            padding: '10px 20px', background: '#10b981', color: 'white',
                            border: 'none', borderRadius: '10px', cursor: 'pointer',
                            fontWeight: 'bold', transition: 'all 0.2s'
                        }}>
                            {sensorConnecting ? '⏳ جاري الاتصال...' : '🔌 اتصال ESP32'}
                        </button>
                    ) : (
                        <button onClick={disconnectSensor} style={{
                            padding: '10px 20px', background: '#ef4444', color: 'white',
                            border: 'none', borderRadius: '10px', cursor: 'pointer',
                            fontWeight: 'bold', transition: 'all 0.2s'
                        }}>
                            🔌 قطع الاتصال
                        </button>
                    )}
                    
                    {!sensorActive && (
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>
                            💡 {isArabic ? 'اضغط "اتصال" لبدء استقبال البيانات' : 'Click "Connect" to start receiving data'}
                        </span>
                    )}
                </div>
                
                {sensorActive && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '40px',
                        flexWrap: 'wrap', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>❤️ {isArabic ? 'النبض' : 'BPM'}</div>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ef4444' }}>
                                {sensorHeartRate !== null ? sensorHeartRate : '---'}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6 }}>نبضة/دقيقة</div>
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>💨 {isArabic ? 'الأكسجين' : 'SpO₂'}</div>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3b82f6' }}>
                                {sensorSpO2 !== null ? sensorSpO2 : '---'}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6 }}>نسبة مئوية</div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* ✅ نموذج إضافة نشاط - مع حقل درجة حرارة الجسم */}
            <div style={{
                background: '#ffffff', padding: '24px', borderRadius: '16px',
                marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>➕ {isArabic ? 'إضافة نشاط جديد' : 'Add New Activity'}</h3>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {/* نوع النشاط */}
                        <select name="activity_type" value={formData.activity_type} onChange={handleChange} required style={{
                            padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                            fontSize: '14px', background: '#f8fafc'
                        }}>
                            <option value="">{isArabic ? 'اختر نوع النشاط' : 'Select activity type'}</option>
                            <option value="walking">🚶 {isArabic ? 'مشي' : 'Walking'}</option>
                            <option value="running">🏃 {isArabic ? 'جري' : 'Running'}</option>
                            <option value="cycling">🚴 {isArabic ? 'دراجة' : 'Cycling'}</option>
                            <option value="swimming">🏊 {isArabic ? 'سباحة' : 'Swimming'}</option>
                            <option value="yoga">🧘 {isArabic ? 'يوجا' : 'Yoga'}</option>
                            <option value="weightlifting">🏋️ {isArabic ? 'رفع أثقال' : 'Weightlifting'}</option>
                            <option value="cardio">❤️ {isArabic ? 'تمارين قلب' : 'Cardio'}</option>
                        </select>
                        
                        {/* المدة */}
                        <input type="number" name="duration_minutes" 
                            placeholder={isArabic ? 'المدة (دقائق)' : 'Duration (minutes)'}
                            value={formData.duration_minutes} onChange={handleChange} required style={{
                            padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                            fontSize: '14px', background: '#f8fafc'
                        }} />
                        
                        {/* التاريخ والوقت */}
                        <input type="datetime-local" name="start_time" 
                            value={formData.start_time} onChange={handleChange} required style={{
                            padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                            fontSize: '14px', background: '#f8fafc'
                        }} />
                        
                        {/* ✅ درجة حرارة الجسم - حقل إدخال يدوي */}
                        <div>
                            <input type="number" step="0.1" name="body_temperature" 
                                placeholder={isArabic ? '🌡️ درجة حرارة الجسم (اختياري)' : '🌡️ Body temperature (optional)'}
                                value={formData.body_temperature} onChange={handleChange} style={{
                                padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                                fontSize: '14px', background: '#f8fafc', width: '100%'
                            }} />
                        </div>
                        
                        {/* السعرات الحرارية */}
                        <div style={{ position: 'relative' }}>
                            <input type="number" name="custom_calories" 
                                placeholder={isArabic ? '🔥 السعرات (اختياري)' : '🔥 Calories (optional)'}
                                value={formData.custom_calories} onChange={handleChange} style={{
                                padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                                fontSize: '14px', background: '#f8fafc', width: '100%'
                            }} />
                            {formData.activity_type && formData.duration_minutes && !formData.custom_calories && (
                                <span style={{
                                    position: 'absolute', right: '10px', top: '12px',
                                    fontSize: '11px', color: '#10b981'
                                }}>🔥 {isArabic ? 'تقديري' : 'est.'}</span>
                            )}
                        </div>
                    </div>
                    
                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '14px', marginTop: '20px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white', border: 'none', borderRadius: '12px',
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                        transition: 'all 0.2s'
                    }}>
                        {loading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? '💾 حفظ النشاط' : '💾 Save Activity')}
                    </button>
                </form>
            </div>
            
            {/* ✅ المخططات البيانية */}
            {activities.length > 0 && (
                <div style={{
                    background: '#ffffff', padding: '20px', borderRadius: '16px',
                    marginBottom: '24px', border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#1e293b' }}>📈 {isArabic ? 'المخططات البيانية' : 'Charts'}</h3>
                        <button onClick={() => setShowCharts(!showCharts)} style={{
                            padding: '6px 14px', background: '#6366f1', color: 'white',
                            border: 'none', borderRadius: '20px', cursor: 'pointer',
                            fontSize: '12px'
                        }}>
                            {showCharts ? '📋 إخفاء' : '📊 إظهار'}
                        </button>
                    </div>
                    
                    {showCharts && (
                        <>
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ color: '#475569', marginBottom: '15px' }}>📊 {isArabic ? 'توزيع الأنشطة حسب النوع' : 'Activities by Type'}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {Object.entries(chartData.typeStats).map(([type, stats]) => (
                                        <div key={type}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
                                                <span>{getActivityIcon(type)} {getActivityName(type)}</span>
                                                <span>{stats.duration} {isArabic ? 'دقيقة' : 'min'} ({stats.count} {isArabic ? 'نشاط' : 'act'})</span>
                                            </div>
                                            <div style={{ background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${maxDuration > 0 ? (stats.duration / maxDuration) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                                    padding: '8px 10px', borderRadius: '10px',
                                                    color: 'white', fontSize: '12px', textAlign: 'right'
                                                }}>{stats.duration} {isArabic ? 'دقيقة' : 'min'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}>🎯 {isArabic ? 'ملخص سريع' : 'Quick Summary'}</h4>
                                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{activities.length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{isArabic ? 'نشاط' : 'Activities'}</div></div>
                                    <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{Math.round(activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60)}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{isArabic ? 'ساعة' : 'Hours'}</div></div>
                                    <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{Object.keys(chartData.typeStats).length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{isArabic ? 'نوع نشاط' : 'Activity Types'}</div></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {/* ✅ السجل الزمني للأنشطة */}
            <div style={{
                background: '#ffffff', padding: '20px', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>📋 {isArabic ? 'السجل الزمني للأنشطة' : 'Activity Timeline'}</h3>
                
                {fetching ? (
                    <p style={{ textAlign: 'center', padding: '40px' }}>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                ) : activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏃‍♂️</div>
                        <p>{isArabic ? 'لا توجد أنشطة مسجلة' : 'No activities recorded'}</p>
                        <p style={{ fontSize: '12px' }}>{isArabic ? 'أضف نشاطك الأول باستخدام النموذج أعلاه' : 'Add your first activity using the form above'}</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '30px' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(180deg, #6366f1, #8b5cf6, #a855f7)' }}></div>
                        
                        {activities.map((act, index) => (
                            <div key={act.id} style={{ position: 'relative', marginBottom: '20px', paddingLeft: '20px' }}>
                                <div style={{
                                    position: 'absolute', left: '-26px', top: '5px',
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: index === 0 ? '#f59e0b' : '#6366f1',
                                    border: '2px solid white', boxShadow: '0 0 0 2px #6366f1'
                                }}></div>
                                
                                <div style={{
                                    background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f8fafc',
                                    padding: '15px', borderRadius: '12px',
                                    border: index === 0 ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                                    transition: 'transform 0.2s'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{getActivityIcon(act.activity_type)}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b' }}>{getActivityName(act.activity_type)}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{act.duration_minutes} {isArabic ? 'دقيقة' : 'minutes'}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            📅 {formatDateTime(act.start_time || act.created_at)}
                                        </div>
                                    </div>
                                    
                                    {/* ✅ عرض درجة الحرارة إذا كانت موجودة */}
                                    {act.body_temperature && (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#f59e0b' }}>
                                            🌡️ {act.body_temperature}°C
                                        </div>
                                    )}
                                    
                                    {/* السعرات الحرارية مع إمكانية التعديل */}
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        {editingCalories === act.id ? (
                                            <>
                                                <input type="number" value={tempCalories} onChange={(e) => setTempCalories(e.target.value)}
                                                    style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                                                <button onClick={() => saveCaloriesEdit(act.id)} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                                    {isArabic ? 'حفظ' : 'Save'}
                                                </button>
                                                <button onClick={() => setEditingCalories(null)} style={{ padding: '4px 8px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '13px', color: '#f59e0b' }}>🔥 {act.calories_burned || 0} {isArabic ? 'سعرة حرارية' : 'calories'}</span>
                                                <button onClick={() => startEditCalories(act.id, act.calories_burned || 0)} style={{
                                                    padding: '2px 8px', background: 'transparent', border: '1px solid #cbd5e1',
                                                    borderRadius: '15px', cursor: 'pointer', fontSize: '10px', color: '#64748b'
                                                }}>✏️ {isArabic ? 'تعديل' : 'Edit'}</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {activities.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#64748b' }}>
                        <span>📊 {isArabic ? 'آخر نشاط' : 'Latest'}: {getActivityName(activities[0]?.activity_type)}</span>
                        <span>⏱️ {isArabic ? 'إجمالي' : 'Total'}: {activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)} {isArabic ? 'دقيقة' : 'min'}</span>
                        <span>🔥 {isArabic ? 'إجمالي السعرات' : 'Total calories'}: {activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityForm;