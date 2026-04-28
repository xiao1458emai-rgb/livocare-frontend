// src/components/ActivityForm.jsx - نسخة مع حساب السعرات الحرارية
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showCharts, setShowCharts] = useState(true);
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        calories_burned: '' // ✅ حقل السعرات
    });
    
    // ✅ حالة التحليلات
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    
    // ✅ وزن المستخدم (لحساب السعرات بدقة)
    const [userWeight, setUserWeight] = useState(null);
    const [showCaloriesEdit, setShowCaloriesEdit] = useState(false);
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const analyticsFetchedRef = useRef(false);

    // ✅ جلب وزن المستخدم
    useEffect(() => {
        fetchUserWeight();
        fetchActivities();
        fetchAnalytics();
    }, []);

    const fetchUserWeight = async () => {
        try {
            const response = await axiosInstance.get('/health_status/latest/');
            if (response.data && response.data.weight_kg) {
                setUserWeight(response.data.weight_kg);
            } else {
                // قيمة افتراضية إذا لم يوجد وزن مسجل
                setUserWeight(70);
            }
        } catch (err) {
            console.error('Error fetching user weight:', err);
            setUserWeight(70); // قيمة افتراضية
        }
    };

    // ✅ معاملات حرق السعرات لكل نشاط (سعرات لكل دقيقة لكل كيلوغرام)
    const MET_VALUES = {
        walking: 3.5,      // مشي بطيء
        running: 9.8,      // جري
        cycling: 7.5,      // دراجة
        swimming: 7.0,     // سباحة
        yoga: 2.5,         // يوجا
        weightlifting: 5.0, // رفع أثقال
        cardio: 6.5,       // تمارين قلب
        other: 4.0         // أنشطة أخرى
    };

    // ✅ دالة حساب السعرات الحرارية
    const calculateCalories = (activityType, durationMinutes, weight) => {
        if (!activityType || !durationMinutes || !weight) return 0;
        const met = MET_VALUES[activityType] || 4.0;
        // الصيغة: MET × الوزن(كجم) × المدة(ساعات)
        const calories = Math.round(met * weight * (durationMinutes / 60));
        return calories;
    };

    // ✅ تحديث السعرات تلقائياً عند تغيير النشاط أو المدة
    const updateCalories = useCallback((activityType, durationMinutes) => {
        if (activityType && durationMinutes && userWeight) {
            const calories = calculateCalories(activityType, parseInt(durationMinutes), userWeight);
            setFormData(prev => ({ ...prev, calories_burned: calories.toString() }));
            setShowCaloriesEdit(false);
        }
    }, [userWeight]);

    // ✅ معالجة تغيير الحقول مع تحديث السعرات
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'activity_type' || name === 'duration_minutes') {
            const activityType = name === 'activity_type' ? value : formData.activity_type;
            const duration = name === 'duration_minutes' ? value : formData.duration_minutes;
            if (activityType && duration) {
                updateCalories(activityType, duration);
            }
        }
    };

    // ✅ معالجة تغيير السعرات يدوياً
    const handleCaloriesChange = (e) => {
        setFormData(prev => ({ ...prev, calories_burned: e.target.value }));
        setShowCaloriesEdit(true);
    };

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
                const totalCalories = activities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: totalCalories,
                    total_duration: activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                    avg_duration: activities.length > 0 ? Math.round(activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / activities.length) : 0,
                    avg_calories_per_activity: activities.length > 0 ? Math.round(totalCalories / activities.length) : 0
                });
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            if (isMountedRef.current) {
                const totalCalories = activities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: totalCalories,
                    total_duration: 0,
                    avg_duration: 0,
                    avg_calories_per_activity: activities.length > 0 ? Math.round(totalCalories / activities.length) : 0
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
            
            const totalCalories = sortedData.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
            setAnalytics(prev => ({
                ...prev,
                total_activities: sortedData.length,
                total_calories: totalCalories,
                total_duration: sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                avg_duration: sortedData.length > 0 ? Math.round(sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / sortedData.length) : 0,
                avg_calories_per_activity: sortedData.length > 0 ? Math.round(totalCalories / sortedData.length) : 0
            }));
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setFetching(false);
            isFetchingRef.current = false;
        }
    };

    // ✅ إرسال النموذج
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await axiosInstance.post('/activities/', {
                activity_type: formData.activity_type,
                duration_minutes: parseInt(formData.duration_minutes),
                start_time: formData.start_time || new Date().toISOString().slice(0, 16),
                calories_burned: parseInt(formData.calories_burned) || 0
            });
            
            await fetchActivities();
            await fetchAnalytics();
            
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            
            setFormData({ 
                activity_type: '', 
                duration_minutes: '', 
                start_time: '', 
                calories_burned: '' 
            });
            setShowCaloriesEdit(false);
            
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

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
                calories: dayActivities.reduce((sum, a) => sum + (a.calories_burned || 0), 0),
                count: dayActivities.length
            });
        }

        return { typeStats, last7Days };
    };

    const chartData = getChartData();

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const maxDuration = Math.max(...Object.values(chartData.typeStats).map(s => s.duration), 0);
    const maxCalories = Math.max(...Object.values(chartData.typeStats).map(s => s.calories), 0);

    // ✅ أيقونة النشاط حسب MET
    const getMetIcon = (type) => {
        const met = MET_VALUES[type] || 4.0;
        if (met >= 8) return '🔥🔥';
        if (met >= 6) return '🔥';
        if (met >= 4) return '⚡';
        return '💨';
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* ✅ قسم التحليلات - مع السعرات */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📊 تحليل الأنشطة</h3>
                {analyticsLoading ? (
                    <p>جاري التحليل...</p>
                ) : analytics ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', textAlign: 'center' }}>
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
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_calories_per_activity || 0}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>سعرات/نشاط</div>
                        </div>
                    </div>
                ) : (
                    <p>لا توجد بيانات كافية</p>
                )}
            </div>
            
            {/* ✅ نموذج إضافة نشاط مع حساب السعرات */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>➕ إضافة نشاط جديد</h3>
                
                {/* معلومات وزن المستخدم */}
                {userWeight && (
                    <div style={{ 
                        background: '#e0e7ff', 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        marginBottom: '15px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⚖️</span>
                        <span>{isArabic ? `وزنك: ${userWeight} كجم` : `Your weight: ${userWeight} kg`}</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>
                            {isArabic ? '(يستخدم لحساب السعرات)' : '(used for calorie calculation)'}
                        </span>
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <select 
                        name="activity_type" 
                        value={formData.activity_type} 
                        onChange={handleChange} 
                        required 
                        style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    >
                        <option value="">اختر نوع النشاط</option>
                        <option value="walking">🚶 مشي (3.5 MET)</option>
                        <option value="running">🏃 جري (9.8 MET)</option>
                        <option value="cycling">🚴 دراجة (7.5 MET)</option>
                        <option value="swimming">🏊 سباحة (7.0 MET)</option>
                        <option value="yoga">🧘 يوجا (2.5 MET)</option>
                        <option value="weightlifting">🏋️ رفع أثقال (5.0 MET)</option>
                        <option value="cardio">❤️ تمارين قلب (6.5 MET)</option>
                        <option value="other">🏅 أخرى (4.0 MET)</option>
                    </select>
                    
                    <input 
                        type="number" 
                        name="duration_minutes" 
                        placeholder={isArabic ? "المدة (دقائق)" : "Duration (minutes)"}
                        value={formData.duration_minutes} 
                        onChange={handleChange} 
                        required 
                        style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} 
                    />
                    
                    {/* حقل السعرات مع إمكانية التعديل */}
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                        <input 
                            type="number" 
                            name="calories_burned" 
                            placeholder={isArabic ? "السعرات المحروقة (تلقائي)" : "Calories burned (auto)"}
                            value={formData.calories_burned} 
                            onChange={handleCaloriesChange} 
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                paddingRight: '90px',
                                borderRadius: '8px', 
                                border: showCaloriesEdit ? '2px solid #f59e0b' : '1px solid #ddd',
                                backgroundColor: showCaloriesEdit ? '#fffbeb' : 'white'
                            }} 
                        />
                        <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            color: '#666',
                            background: '#f0f0f0',
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}>
                            {isArabic ? 'سعرة' : 'cal'}
                        </span>
                    </div>
                    
                    {!showCaloriesEdit && formData.activity_type && formData.duration_minutes && (
                        <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>🤖</span>
                            <span>{isArabic ? 'تم حساب السعرات تلقائياً' : 'Calories calculated automatically'}</span>
                            <button 
                                type="button"
                                onClick={() => setShowCaloriesEdit(true)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '11px' }}
                            >
                                {isArabic ? 'تعديل يدوي' : 'Edit manually'}
                            </button>
                        </div>
                    )}
                    
                    {showCaloriesEdit && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>✏️</span>
                            <span>{isArabic ? 'تم التعديل اليدوي - حساب تلقائي متوقف' : 'Manual edit - auto calculation paused'}</span>
                            <button 
                                type="button"
                                onClick={() => {
                                    updateCalories(formData.activity_type, formData.duration_minutes);
                                    setShowCaloriesEdit(false);
                                }}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '11px' }}
                            >
                                {isArabic ? 'إعادة الحساب التلقائي' : 'Recalculate'}
                            </button>
                        </div>
                    )}
                    
                    <input 
                        type="datetime-local" 
                        name="start_time" 
                        value={formData.start_time} 
                        onChange={handleChange} 
                        required 
                        style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} 
                    />
                    
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        {loading ? 'جاري الحفظ...' : '💾 حفظ النشاط'}
                    </button>
                </form>
            </div>
            
            {/* ✅ المخططات البيانية مع السعرات */}
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
                            {/* مخطط 1: توزيع الأنشطة حسب النوع مع السعرات */}
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 توزيع الأنشطة حسب النوع</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {Object.entries(chartData.typeStats).map(([type, stats]) => (
                                        <div key={type}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                                                <span>
                                                    {getActivityIcon(type)} {getActivityName(type)}
                                                    <span style={{ fontSize: '11px', marginLeft: '8px', color: '#f59e0b' }}>
                                                        {getMetIcon(type)} {MET_VALUES[type]} MET
                                                    </span>
                                                </span>
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <span>⏱️ {stats.duration} دقيقة</span>
                                                    <span style={{ color: '#f59e0b' }}>🔥 {stats.calories} سعرة</span>
                                                    <span>({stats.count} نشاط)</span>
                                                </div>
                                            </div>
                                            {/* شريط المدة */}
                                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', marginBottom: '5px' }}>
                                                <div style={{
                                                    width: `${maxDuration > 0 ? (stats.duration / maxDuration) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                                    padding: '6px 10px',
                                                    borderRadius: '10px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    textAlign: 'right'
                                                }}>
                                                    {stats.duration} دقيقة
                                                </div>
                                            </div>
                                            {/* شريط السعرات */}
                                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${maxCalories > 0 ? (stats.calories / maxCalories) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                                                    padding: '6px 10px',
                                                    borderRadius: '10px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    textAlign: 'right'
                                                }}>
                                                    🔥 {stats.calories} سعرة
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* مخطط 2: نشاط آخر 7 أيام مع السعرات */}
                            <div>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📅 آخر 7 أيام</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'center', minHeight: '220px', overflowX: 'auto' }}>
                                    {chartData.last7Days.map((day, idx) => {
                                        const maxDayCalories = Math.max(...chartData.last7Days.map(d => d.calories), 1);
                                        const heightCalories = (day.calories / maxDayCalories) * 150;
                                        return (
                                            <div key={idx} style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
                                                <div style={{ 
                                                    height: `${heightCalories}px`, 
                                                    background: 'linear-gradient(180deg, #f59e0b, #ef4444)',
                                                    borderRadius: '8px 8px 0 0',
                                                    transition: 'height 0.5s ease',
                                                    position: 'relative',
                                                    marginBottom: '5px'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-20px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        fontSize: '10px',
                                                        whiteSpace: 'nowrap',
                                                        color: '#f59e0b'
                                                    }}>
                                                        🔥{day.calories}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '10px' }}>
                                                    {day.name}
                                                    <br />
                                                    <strong>{day.duration}د</strong>
                                                    <br />
                                                    <span style={{ fontSize: '9px', color: '#666' }}>({day.count})</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* مخطط 3: ملخص سريع محسن */}
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
                                            {activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>سعرة حرارية</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
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
            
            {/* ✅ السجلات الزمنية مع عرض السعرات */}
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
                                    border: index === 0 ? '1px solid #f59e0b' : '1px solid #e0e0e0',
                                    transition: 'transform 0.2s'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{getActivityIcon(act.activity_type)}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{getActivityName(act.activity_type)}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    {act.duration_minutes} دقيقة
                                                    {act.calories_burned > 0 && (
                                                        <span style={{ marginLeft: '10px', color: '#f59e0b' }}>
                                                            🔥 {act.calories_burned} سعرة
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', direction: isArabic ? 'ltr' : 'ltr' }}>
                                            📅 {formatDateTime(act.start_time || act.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {activities.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#666', flexWrap: 'wrap' }}>
                        <span>📊 آخر نشاط: {getActivityName(activities[0]?.activity_type)}</span>
                        <span>⏱️ إجمالي: {activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)} دقيقة</span>
                        <span style={{ color: '#f59e0b' }}>🔥 إجمالي: {activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0)} سعرة</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityForm;