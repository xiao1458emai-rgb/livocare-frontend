// src/components/Analytics/HabitAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import './Analytics.css';

const HabitAnalytics = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
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

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // إعادة جلب البيانات عند تغيير اللغة
                fetchData();
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    const extractData = (response) => {
        if (response?.results) return response.results;
        if (Array.isArray(response)) return response;
        return [];
    };

    const fetchData = useCallback(async () => {
        if (!isMountedRef.current) return;
        
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

            if (habits.length === 0) {
                setData(null);
                setError(isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded');
                setLoading(false);
                return;
            }

            const analysis = analyzeHabits(habits, logs);
            setData(analysis);
        } catch (err) {
            console.error('Error fetching data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [isArabic]);

    useEffect(() => {
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [fetchData, refreshTrigger]);

    // ✅ تحديد نوع العادة
    const detectHabitType = (habitName, habitDescription = '') => {
        const text = (habitName + ' ' + habitDescription).toLowerCase();
        
        const medicationKeywords = ['دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment'];
        const waterKeywords = ['ماء', 'water', 'ترطيب', 'hydration'];
        const exerciseKeywords = ['رياضة', 'exercise', 'مشي', 'walk', 'جري', 'run'];
        const sleepKeywords = ['نوم', 'sleep', 'استرخاء', 'relax'];
        
        if (medicationKeywords.some(k => text.includes(k))) return 'medication';
        if (waterKeywords.some(k => text.includes(k))) return 'water';
        if (exerciseKeywords.some(k => text.includes(k))) return 'exercise';
        if (sleepKeywords.some(k => text.includes(k))) return 'sleep';
        return 'habit';
    };

    const analyzeHabits = (habits, logs) => {
        // ✅ فصل الأدوية عن العادات
        const medications = [];
        const regularHabits = [];
        
        habits.forEach(habit => {
            const type = detectHabitType(habit.name, habit.description);
            const habitLogs = logs.filter(log => log.habit === habit.id);
            const completed = habitLogs.filter(log => log.is_completed).length;
            const total = habitLogs.length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            
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
        medicationStats.overallStreak = Math.max(...medications.map(m => m.streak), 0);
        
        // ✅ تحليل الالتزام
        let complianceLevel = 'good';
        let complianceMessage = '';
        if (medicationStats.adherenceRate >= 90) {
            complianceLevel = 'excellent';
            complianceMessage = isArabic ? 'التزام ممتاز! استمر' : 'Excellent adherence! Keep it up';
        } else if (medicationStats.adherenceRate >= 70) {
            complianceLevel = 'good';
            complianceMessage = isArabic ? 'التزام جيد' : 'Good adherence';
        } else if (medicationStats.adherenceRate >= 50) {
            complianceLevel = 'fair';
            complianceMessage = isArabic ? 'التزام متوسط' : 'Fair adherence';
        } else if (medicationStats.adherenceRate > 0) {
            complianceLevel = 'poor';
            complianceMessage = isArabic ? 'التزام منخفض' : 'Low adherence';
        } else {
            complianceMessage = isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data';
        }
        
        // ✅ أنماط صحية محتملة (ليست تشخيصاً)
        const healthPatterns = [];
        if (medications.some(m => m.name.toLowerCase().includes('ibuprofen') || m.name.toLowerCase().includes('advil'))) {
            healthPatterns.push({
                icon: '⚠️',
                name: isArabic ? 'استخدام مسكنات الألم' : 'Pain reliever use',
                note: isArabic ? 'قد يشير إلى آلام متكررة' : 'May indicate recurring pain'
            });
        }
        if (medications.some(m => m.name.toLowerCase().includes('metformin'))) {
            healthPatterns.push({
                icon: '🩸',
                name: isArabic ? 'تنظيم سكر الدم' : 'Blood sugar management',
                note: isArabic ? 'يُنصح بمتابعة مستوى السكر بانتظام' : 'Regular blood sugar monitoring recommended'
            });
        }
        if (medications.some(m => m.name.toLowerCase().includes('lisinopril') || m.name.toLowerCase().includes('amlodipine'))) {
            healthPatterns.push({
                icon: '❤️',
                name: isArabic ? 'علاج ضغط الدم' : 'Blood pressure treatment',
                note: isArabic ? 'مراقبة الضغط بانتظام مهمة' : 'Regular blood pressure monitoring is important'
            });
        }
        
        // ✅ توصيات ذكية
        const recommendations = [];
        
        if (medicationStats.adherenceRate < 80 && medicationStats.adherenceRate > 0) {
            recommendations.push({
                icon: '💊',
                title: isArabic ? 'تحسين الالتزام بالأدوية' : 'Improve medication adherence',
                advice: isArabic 
                    ? `التزامك الحالي ${medicationStats.adherenceRate}%`
                    : `Your current adherence is ${medicationStats.adherenceRate}%`,
                action: isArabic ? 'اضبط تذكيراً يومياً للأدوية' : 'Set a daily medication reminder'
            });
        }
        
        if (medications.length > 0 && medicationStats.adherenceRate === 0) {
            recommendations.push({
                icon: '📝',
                title: isArabic ? 'ابدأ بتسجيل أدويتك' : 'Start tracking your medications',
                advice: isArabic ? 'لم تسجل أي جرعة دواء بعد' : 'No medication doses recorded yet',
                action: isArabic ? 'سجل جرعاتك اليومية من صفحة العادات' : 'Log your daily doses from the habits page'
            });
        }
        
        if (healthPatterns.length > 0) {
            recommendations.push({
                icon: '🩺',
                title: isArabic ? 'متابعة صحية منتظمة' : 'Regular health checkup',
                advice: isArabic ? 'بناءً على نمط أدويتك' : 'Based on your medication pattern',
                action: isArabic ? 'استشر طبيبك بانتظام لمتابعة حالتك' : 'Regular doctor visits are recommended'
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
        const strongestHabit = [...medications, ...regularHabits].reduce((best, current) => 
            current.rate > best.rate ? current : best, { rate: 0, name: '' });
        
        // ✅ نصائح سريعة
        const quickTips = [
            { icon: '💊', text: isArabic ? 'استخدم تذكيرات الأدوية' : 'Use medication reminders' },
            { icon: '📅', text: isArabic ? 'حافظ على روتين يومي ثابت' : 'Maintain a consistent daily routine' },
            { icon: '🩺', text: isArabic ? 'تابع حالتك الصحية بانتظام' : 'Regular health monitoring' }
        ];
        
        return {
            medications: {
                list: medications,
                count: medications.length,
                stats: medicationStats,
                adherenceRate: medicationStats.adherenceRate,
                streak: medicationStats.overallStreak,
                complianceLevel,
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
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل العادات' : 'Habits Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
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
                                        <p className="stat-trend">{data.medications.complianceMessage}</p>
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
                                                    <span>🔄 {med.frequency}</span>
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
                                        {data.strongestHabit && (
                                            <p className="stat-trend">💪 {data.strongestHabit}: {data.strongestHabitRate}%</p>
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
                                                         habit.type === 'sleep' ? '😴 ' : '📋 '}
                                                        {habit.name}
                                                    </span>
                                                    <span className={`habit-rate ${habit.rate >= 70 ? 'high' : habit.rate >= 40 ? 'medium' : 'low'}`}>
                                                        {habit.rate}%
                                                    </span>
                                                </div>
                                                <div className="habit-stats">
                                                    <span>✅ {habit.completed}/{habit.total}</span>
                                                    <span>🔄 {habit.frequency}</span>
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
                        {data.healthPatterns.length > 0 && (
                            <div className="insight-card" style={{ background: 'var(--info-bg)' }}>
                                <div className="insight-icon">📊</div>
                                <div className="insight-content">
                                    <h3>{isArabic ? 'أنماط صحية محتملة' : 'Health Patterns'}</h3>
                                    <p style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-tertiary)' }}>
                                        ⚠️ {isArabic ? 'هذه أنماط عامة وليست تشخيصاً طبياً' : 'These are general patterns, not a medical diagnosis'}
                                    </p>
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                        {data.healthPatterns.map((pattern, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--card-bg)', borderRadius: '8px' }}>
                                                <span>{pattern.icon}</span>
                                                <span style={{ flex: 1 }}>{pattern.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{pattern.note}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

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