import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import './Analytics.css';

// ✅ نفس دوال التصنيف المستخدمة في HabitTracker
const getStoredHabitType = (habitId) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`habit_type_${habitId}`);
};

const detectHabitType = (habitName, habitDescription = '', habitId = null) => {
    // ✅ أولاً: التحقق من التخزين المحلي
    const storedType = habitId ? getStoredHabitType(habitId) : null;
    if (storedType === 'medication') return 'medication';
    if (storedType === 'habit') return 'habit';
    
    const text = (habitName + ' ' + habitDescription).toLowerCase();
    
    // كلمات تدل على دواء
    const medicationKeywords = [
        'دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment',
        'مضاد حيوي', 'antibiotic', 'مسكن', 'painkiller', 'ibuprofen',
        'paracetamol', 'advil', 'tylenol', 'aspirin', 'metformin',
        'lisinopril', 'amlodipine', 'mg', 'ملجم', 'جرعة', 'dose'
    ];
    
    // كلمات تدل على عادة
    const habitKeywords = [
        'ماء', 'water', 'رياضة', 'exercise', 'مشي', 'walk', 'جري', 'run',
        'نوم', 'sleep', 'يوجا', 'yoga', 'تأمل', 'meditation', 'قراءة', 'reading'
    ];
    
    for (const keyword of medicationKeywords) {
        if (text.includes(keyword)) return 'medication';
    }
    
    for (const keyword of habitKeywords) {
        if (text.includes(keyword)) return 'habit';
    }
    
    // ✅ إذا كان الوصف يحتوي على معلومات دوائية
    if (habitDescription && (
        habitDescription.includes('mg') || 
        habitDescription.includes('ملجم') ||
        habitDescription.includes('💊')
    )) {
        return 'medication';
    }
    
    return 'habit';
};

const HabitAnalytics = ({ refreshTrigger }) => {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('medications');
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                fetchData();
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    // ✅ الاستماع لتغيير نوع العادة
    useEffect(() => {
        const handleTypeChange = () => {
            fetchData();
        };
        
        window.addEventListener('habitTypeChanged', handleTypeChange);
        return () => window.removeEventListener('habitTypeChanged', handleTypeChange);
    }, []);

    const extractData = (response) => {
        if (response?.results) return response.results;
        if (Array.isArray(response)) return response;
        return [];
    };

    const fetchData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const [habitsRes, logsRes] = await Promise.all([
                axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] }))
            ]);

            const habits = extractData(habitsRes.data);
            const logs = extractData(logsRes.data);

            if (!isMountedRef.current) return;

            console.log('📊 Habits for analytics:', habits.length);
            console.log('📊 Logs for analytics:', logs.length);

            if (habits.length === 0) {
                setData(null);
                setError(isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded');
                setLoading(false);
                return;
            }

            const analysis = analyzeHabits(habits, logs);
            console.log('📊 Analysis result - Medications count:', analysis.medications.count);
            setData(analysis);
        } catch (err) {
            console.error('Error fetching data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    useEffect(() => {
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [fetchData, refreshTrigger]);

    const analyzeHabits = (habits, logs) => {
        // ✅ فصل الأدوية عن العادات باستخدام نفس نظام التصنيف
        const medications = [];
        const regularHabits = [];
        
        habits.forEach(habit => {
            const type = detectHabitType(habit.name, habit.description, habit.id);
            console.log(`📊 Habit: ${habit.name} -> Type: ${type}`);
            
            const habitLogs = logs.filter(log => log.habit === habit.id);
            const completed = habitLogs.filter(log => log.is_completed).length;
            const total = habitLogs.length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            // حساب streak
            let streak = 0;
            const checkDate = new Date();
            for (let i = 0; i < 30; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                const hasLog = habitLogs.some(log => log.log_date === dateStr && log.is_completed);
                if (hasLog) streak++;
                else break;
                checkDate.setDate(checkDate.getDate() - 1);
            }
            
            const habitData = {
                id: habit.id,
                name: habit.name,
                description: habit.description,
                type,
                completed,
                total,
                rate,
                streak,
                frequency: habit.frequency || (isArabic ? 'يومي' : 'Daily')
            };
            
            if (type === 'medication') {
                medications.push(habitData);
            } else {
                regularHabits.push(habitData);
            }
        });
        
        console.log(`📊 Medications found: ${medications.length}, Habits found: ${regularHabits.length}`);
        
        // ✅ إحصائيات الأدوية
        const medicationStats = {
            total: medications.length,
            completed: medications.reduce((sum, m) => sum + m.completed, 0),
            totalLogs: medications.reduce((sum, m) => sum + m.total, 0),
            adherenceRate: 0,
            overallStreak: 0
        };
        
        medicationStats.adherenceRate = medicationStats.totalLogs > 0 
            ? Math.round((medicationStats.completed / medicationStats.totalLogs) * 100) 
            : 0;
        medicationStats.overallStreak = medications.length > 0 
            ? Math.max(...medications.map(m => m.streak), 0) 
            : 0;
        
        // ✅ تحليل الالتزام
        let complianceMessage = '';
        if (medicationStats.adherenceRate >= 90) {
            complianceMessage = isArabic ? 'التزام ممتاز! استمر' : 'Excellent adherence! Keep it up';
        } else if (medicationStats.adherenceRate >= 70) {
            complianceMessage = isArabic ? 'التزام جيد' : 'Good adherence';
        } else if (medicationStats.adherenceRate >= 50) {
            complianceMessage = isArabic ? 'التزام متوسط' : 'Fair adherence';
        } else if (medicationStats.adherenceRate > 0) {
            complianceMessage = isArabic ? 'التزام منخفض' : 'Low adherence';
        } else if (medications.length > 0) {
            complianceMessage = isArabic ? 'لم تسجل أي جرعة بعد' : 'No doses recorded yet';
        } else {
            complianceMessage = isArabic ? 'لا توجد أدوية' : 'No medications';
        }
        
        // ✅ أنماط صحية
        const healthPatterns = [];
        if (medications.some(m => m.name.toLowerCase().includes('ibuprofen') || m.name.toLowerCase().includes('advil') || m.name.toLowerCase().includes('pain'))) {
            healthPatterns.push({
                icon: '⚠️',
                name: isArabic ? 'استخدام مسكنات الألم' : 'Pain reliever use',
                note: isArabic ? 'قد يشير إلى آلام متكررة' : 'May indicate recurring pain'
            });
        }
        
        // ✅ توصيات ذكية
        const recommendations = [];
        
        if (medications.length > 0 && medicationStats.adherenceRate === 0) {
            recommendations.push({
                icon: '💊',
                title: isArabic ? 'سجل أدويتك' : 'Track your medications',
                advice: isArabic ? 'لديك أدوية مسجلة ولكن لم تسجل أي جرعة' : 'You have medications but no doses recorded',
                action: isArabic ? 'اضغط على زر "تم" بجانب كل دواء لتسجيل الجرعة' : 'Click "Taken" next to each medication to record doses'
            });
        } else if (medicationStats.adherenceRate < 70 && medicationStats.adherenceRate > 0) {
            recommendations.push({
                icon: '⏰',
                title: isArabic ? 'التزم بمواعيد أدويتك' : 'Stick to your medication schedule',
                advice: isArabic ? `التزامك الحالي ${medicationStats.adherenceRate}%` : `Your current adherence is ${medicationStats.adherenceRate}%`,
                action: isArabic ? 'اضبط تذكيراً يومياً للأدوية' : 'Set a daily medication reminder'
            });
        }
        
        if (medications.length === 0 && regularHabits.length === 0) {
            recommendations.push({
                icon: '➕',
                title: isArabic ? 'أضف عاداتك وأدويتك' : 'Add your habits and medications',
                advice: isArabic ? 'لم تقم بإضافة أي عادات أو أدوية بعد' : 'You haven\'t added any habits or medications yet',
                action: isArabic ? 'استخدم نموذج الإضافة أعلاه' : 'Use the form above to add them'
            });
        }
        
        // ✅ إحصائيات العادات
        const habitStats = {
            total: regularHabits.length,
            completed: regularHabits.reduce((sum, h) => sum + h.completed, 0),
            totalLogs: regularHabits.reduce((sum, h) => sum + h.total, 0),
            completionRate: 0
        };
        habitStats.completionRate = habitStats.totalLogs > 0 
            ? Math.round((habitStats.completed / habitStats.totalLogs) * 100) 
            : 0;
        
        // ✅ أقوى عادة
        const allItems = [...medications, ...regularHabits];
        const strongestHabit = allItems.reduce((best, current) => 
            current.rate > best.rate ? current : best, { rate: 0, name: '' });
        
        // ✅ نصائح سريعة
        const quickTips = [
            { icon: '💊', text: isArabic ? 'سجل أدويتك يومياً' : 'Log your medications daily' },
            { icon: '📅', text: isArabic ? 'حافظ على روتين ثابت' : 'Maintain a consistent routine' },
            { icon: '✅', text: isArabic ? 'أنجز عاداتك اليومية' : 'Complete your daily habits' }
        ];
        
        return {
            medications: {
                list: medications,
                count: medications.length,
                stats: medicationStats,
                adherenceRate: medicationStats.adherenceRate,
                streak: medicationStats.overallStreak,
                complianceMessage
            },
            habits: {
                list: regularHabits,
                count: regularHabits.length,
                stats: habitStats,
                completionRate: habitStats.completionRate
            },
            healthPatterns,
            recommendations,
            quickTips,
            strongestHabit: strongestHabit.name,
            strongestHabitRate: strongestHabit.rate,
            lastUpdated: new Date().toISOString()
        };
    };

    // تأثير الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-error">
                    <p>⚠️ {error || (isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data')}</p>
                    <button onClick={fetchData} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>📊 {isArabic ? 'تحليل العادات' : 'Habits Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* ملخص سريع */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                    <div className="stat-icon">💊</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.medications.count}</div>
                        <div className="stat-label">{isArabic ? 'الأدوية' : 'Medications'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.habits.count}</div>
                        <div className="stat-label">{isArabic ? 'العادات' : 'Habits'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.medications.adherenceRate}%</div>
                        <div className="stat-label">{isArabic ? 'الالتزام' : 'Adherence'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.medications.streak}</div>
                        <div className="stat-label">{isArabic ? 'أيام متتالية' : 'Day streak'}</div>
                    </div>
                </div>
            </div>

            {/* تبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'medications' ? 'active' : ''} onClick={() => setActiveTab('medications')}>
                    💊 {isArabic ? 'الأدوية' : 'Medications'}
                </button>
                <button className={activeTab === 'habits' ? 'active' : ''} onClick={() => setActiveTab('habits')}>
                    📋 {isArabic ? 'العادات' : 'Habits'}
                </button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
                    🧠 {isArabic ? 'تحليلات' : 'Insights'}
                </button>
            </div>

            <div className="tab-content">
                {/* تبويب الأدوية */}
                {activeTab === 'medications' && (
                    <div className="medications-section">
                        {data.medications.count === 0 ? (
                            <div className="analytics-empty">
                                <div className="empty-icon">💊</div>
                                <p>{isArabic ? 'لا توجد أدوية مسجلة' : 'No medications recorded'}</p>
                                <p className="empty-hint">
                                    {isArabic ? 'الأدوية التي أضفتها ستظهر هنا تلقائياً' : 'Medications you add will appear here automatically'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="insight-card">
                                    <div className="insight-icon">📊</div>
                                    <div className="insight-content">
                                        <h3>{isArabic ? 'الالتزام بالأدوية' : 'Medication Adherence'}</h3>
                                        <div className="stat-value" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
                                            {data.medications.adherenceRate}%
                                        </div>
                                        <p>{data.medications.complianceMessage}</p>
                                    </div>
                                </div>

                                <div className="recommendations-section">
                                    <h3>{isArabic ? 'قائمة الأدوية' : 'Medication List'}</h3>
                                    <div className="habits-list">
                                        {data.medications.list.map(med => (
                                            <div key={med.id} className="habit-card">
                                                <div className="habit-header">
                                                    <span className="habit-name">💊 {med.name}</span>
                                                    <span className={`habit-rate ${med.rate >= 70 ? 'high' : med.rate >= 40 ? 'medium' : 'low'}`}>
                                                        {med.rate}%
                                                    </span>
                                                </div>
                                                <div className="habit-stats">
                                                    <span>✅ {med.completed}/{med.total}</span>
                                                    <span>📅 {med.streak} {isArabic ? 'يوم' : 'days'}</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${med.rate}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* تبويب العادات */}
                {activeTab === 'habits' && (
                    <div className="habits-section">
                        {data.habits.count === 0 ? (
                            <div className="analytics-empty">
                                <div className="empty-icon">📋</div>
                                <p>{isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded'}</p>
                            </div>
                        ) : (
                            <>
                                <div className="insight-card">
                                    <div className="insight-icon">📊</div>
                                    <div className="insight-content">
                                        <h3>{isArabic ? 'إنجاز العادات' : 'Habits Completion'}</h3>
                                        <div className="stat-value" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
                                            {data.habits.completionRate}%
                                        </div>
                                        {data.strongestHabit && data.strongestHabitRate > 0 && (
                                            <p>💪 {data.strongestHabit}: {data.strongestHabitRate}%</p>
                                        )}
                                    </div>
                                </div>

                                <div className="recommendations-section">
                                    <h3>{isArabic ? 'قائمة العادات' : 'Habits List'}</h3>
                                    <div className="habits-list">
                                        {data.habits.list.map(habit => (
                                            <div key={habit.id} className="habit-card">
                                                <div className="habit-header">
                                                    <span className="habit-name">
                                                        {habit.type === 'water' ? '💧 ' : 
                                                         habit.type === 'exercise' ? '🏃 ' :
                                                         habit.type === 'sleep' ? '😴 ' : '✅ '}
                                                        {habit.name}
                                                    </span>
                                                    <span className={`habit-rate ${habit.rate >= 70 ? 'high' : habit.rate >= 40 ? 'medium' : 'low'}`}>
                                                        {habit.rate}%
                                                    </span>
                                                </div>
                                                <div className="habit-stats">
                                                    <span>✅ {habit.completed}/{habit.total}</span>
                                                    <span>📅 {habit.streak} {isArabic ? 'يوم' : 'days'}</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${habit.rate}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* تبويب التحليلات */}
                {activeTab === 'insights' && (
                    <div className="insights-section">
                        {data.recommendations.length > 0 && (
                            <div className="recommendations-section">
                                <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                                <div className="recommendations-list">
                                    {data.recommendations.map((rec, i) => (
                                        <div key={i} className="recommendation-card">
                                            <div className="rec-header">
                                                <span className="rec-icon">{rec.icon}</span>
                                                <span className="rec-category">{rec.title}</span>
                                            </div>
                                            <p className="rec-message">{rec.advice}</p>
                                            <div className="rec-advice">🎯 {rec.action}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="habit-tips">
                            <h4>💡 {isArabic ? 'نصائح سريعة' : 'Quick Tips'}</h4>
                            <div className="tips-grid">
                                {data.quickTips.map((tip, i) => (
                                    <div key={i} className="tip-item">
                                        <span className="tip-icon">{tip.icon}</span>
                                        <p>{tip.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="analytics-footer">
                <small>
                    {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(data.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>
        </div>
    );
};

export default HabitAnalytics;