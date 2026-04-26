// src/components/Analytics/HabitAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import './Analytics.css';

const HabitAnalytics = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() =>  {
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
    const [activeTab, setActiveTab] = useState('overview');
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

    // ✅ الاستماع لتغييرات نوع العادة
    useEffect(() => {
        const handleHabitTypeChange = () => {
            fetchData();
        };
        
        window.addEventListener('habitTypeChanged', handleHabitTypeChange);
        return () => window.removeEventListener('habitTypeChanged', handleHabitTypeChange);
    }, []);

    // ✅ دالة محسنة لتحديد نوع العادة (مع localStorage)
    const getHabitType = useCallback((habitId, habitName, habitDescription = '') => {
        // التحقق من التحديد اليدوي في localStorage
        const storedType = localStorage.getItem(`habit_type_${habitId}`);
        if (storedType === 'medication') return 'medication';
        if (storedType === 'habit') return 'habit';
        
        // التحقق من الكلمات المفتاحية
        const text = (habitName + ' ' + habitDescription).toLowerCase();
        
        // كلمات تدل على دواء
        const medicationKeywords = [
            'دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment',
            'مضاد حيوي', 'antibiotic', 'مسكن', 'painkiller', 'ibuprofen',
            'paracetamol', 'advil', 'tylenol', 'aspirin', 'metformin',
            'lisinopril', 'amlodipine', 'atorvastatin', 'mg', 'ملجم',
            'جرعة', 'dose', 'مرهم', 'ointment', 'كريم', 'cream',
            'حقن', 'injection', 'شراب', 'syrup', 'قطرة', 'drop'
        ];
        
        for (const keyword of medicationKeywords) {
            if (text.includes(keyword)) return 'medication';
        }
        
        return 'habit';
    }, []);

    // ✅ جلب البيانات
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

            const habits = habitsRes.data?.results || (Array.isArray(habitsRes.data) ? habitsRes.data : []);
            const logs = logsRes.data?.results || (Array.isArray(logsRes.data) ? logsRes.data : []);

            if (!isMountedRef.current) return;

            if (habits.length === 0) {
                setData(null);
                setError(isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded');
                setLoading(false);
                return;
            }

            const analysis = analyzeData(habits, logs);
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

    // ✅ تحليل البيانات الرئيسي
    const analyzeData = useCallback((habits, logs) => {
        // تصنيف العادات والأدوية
        const medications = [];
        const regularHabits = [];
        
        habits.forEach(habit => {
            const type = getHabitType(habit.id, habit.name, habit.description);
            const habitLogs = logs.filter(log => log.habit === habit.id);
            
            // حساب الإحصائيات
            const total = habitLogs.length;
            const completed = habitLogs.filter(log => log.is_completed).length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            // حساب الأيام المتتالية
            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() - i);
                const dateStr = checkDate.toISOString().split('T')[0];
                
                const hasLog = habitLogs.some(log => 
                    log.log_date === dateStr && log.is_completed
                );
                
                if (hasLog) streak++;
                else if (i > 0) break;
            }
            
            const habitData = {
                id: habit.id,
                name: habit.name,
                description: habit.description,
                type,
                total,
                completed,
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
        
        // إحصائيات الأدوية
        const medicationStats = calculateMedicationStats(medications);
        
        // إحصائيات العادات
        const habitStats = calculateHabitStats(regularHabits);
        
        // التحليل الذكي
        const insights = generateInsights(medications, regularHabits, medicationStats, habitStats);
        
        // التوصيات
        const recommendations = generateRecommendations(medications, regularHabits, medicationStats, habitStats);
        
        // أفضل وأسوأ العادات
        const bestHabit = [...medications, ...regularHabits].reduce((best, current) => 
            current.rate > best.rate ? current : best, { rate: 0, name: '—' });
        
        const worstHabit = [...medications, ...regularHabits].reduce((worst, current) => 
            current.rate < worst.rate && current.total > 0 ? current : worst, { rate: 100, name: '—' });
        
        return {
            medications: {
                list: medications,
                count: medications.length,
                stats: medicationStats,
                hasData: medications.length > 0
            },
            habits: {
                list: regularHabits,
                count: regularHabits.length,
                stats: habitStats,
                hasData: regularHabits.length > 0
            },
            insights,
            recommendations,
            bestHabit: bestHabit.name,
            bestHabitRate: bestHabit.rate,
            worstHabit: worstHabit.name !== '—' ? worstHabit.name : null,
            worstHabitRate: worstHabit.rate !== 100 ? worstHabit.rate : null,
            lastUpdated: new Date().toISOString()
        };
    }, [getHabitType, isArabic]);

    // ✅ حساب إحصائيات الأدوية
    const calculateMedicationStats = (medications) => {
        if (medications.length === 0) {
            return {
                totalLogs: 0,
                completedLogs: 0,
                adherenceRate: 0,
                overallStreak: 0,
                totalMeds: 0
            };
        }
        
        const totalLogs = medications.reduce((sum, m) => sum + m.total, 0);
        const completedLogs = medications.reduce((sum, m) => sum + m.completed, 0);
        const adherenceRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;
        const overallStreak = Math.max(...medications.map(m => m.streak), 0);
        
        let level = 'poor';
        let message = '';
        
        if (adherenceRate >= 90) {
            level = 'excellent';
            message = isArabic ? 'ممتاز! استمر يا بطل' : 'Excellent! Keep it up champion';
        } else if (adherenceRate >= 70) {
            level = 'good';
            message = isArabic ? 'جيد جداً، قريب من الممتاز' : 'Very good, close to excellent';
        } else if (adherenceRate >= 50) {
            level = 'fair';
            message = isArabic ? 'متوسط، يمكنك التحسين' : 'Fair, you can improve';
        } else if (adherenceRate > 0) {
            level = 'poor';
            message = isArabic ? 'بحاجة لتحسين الالتزام' : 'Need to improve adherence';
        } else {
            message = isArabic ? 'ابدأ بتسجيل أدويتك' : 'Start logging your medications';
        }
        
        return {
            totalLogs,
            completedLogs,
            adherenceRate,
            overallStreak,
            totalMeds: medications.length,
            level,
            message
        };
    };

    // ✅ حساب إحصائيات العادات
    const calculateHabitStats = (habits) => {
        if (habits.length === 0) {
            return {
                totalLogs: 0,
                completedLogs: 0,
                completionRate: 0,
                totalHabits: 0
            };
        }
        
        const totalLogs = habits.reduce((sum, h) => sum + h.total, 0);
        const completedLogs = habits.reduce((sum, h) => sum + h.completed, 0);
        const completionRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;
        
        return {
            totalLogs,
            completedLogs,
            completionRate,
            totalHabits: habits.length
        };
    };

    // ✅ توليد تحليلات ذكية
    const generateInsights = (medications, habits, medStats, habitStats) => {
        const insights = [];
        
        // تحليل التزام الأدوية
        if (medications.length > 0) {
            if (medStats.adherenceRate >= 80) {
                insights.push({
                    type: 'positive',
                    icon: '🎉',
                    title: isArabic ? 'التزام ممتاز بالأدوية' : 'Excellent Medication Adherence',
                    description: isArabic 
                        ? `التزامك ${medStats.adherenceRate}% - هذا رائع لصحتك`
                        : `${medStats.adherenceRate}% adherence - Great for your health`
                });
            } else if (medStats.adherenceRate < 50 && medStats.adherenceRate > 0) {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: isArabic ? 'تحسين التزام الأدوية' : 'Improve Medication Adherence',
                    description: isArabic 
                        ? `نسبة الالتزام ${medStats.adherenceRate}% - حاول ضبط تذكير يومي`
                        : `${medStats.adherenceRate}% adherence - Try setting a daily reminder`
                });
            }
        }
        
        // تحليل أقوى عادة
        if (habits.length > 0) {
            const bestHabit = habits.reduce((best, h) => h.rate > best.rate ? h : best, habits[0]);
            if (bestHabit.rate >= 70) {
                insights.push({
                    type: 'positive',
                    icon: '💪',
                    title: isArabic ? 'استمرارية ممتازة' : 'Great Consistency',
                    description: isArabic 
                        ? `عادة "${bestHabit.name}" بانجاز ${bestHabit.rate}%`
                        : `Habit "${bestHabit.name}" with ${bestHabit.rate}% completion`
                });
            }
        }
        
        // تحليل العادات التي تحتاج تحسين
        const needsImprovement = habits.filter(h => h.rate < 50 && h.total > 0);
        if (needsImprovement.length > 0) {
            insights.push({
                type: 'improvement',
                icon: '📈',
                title: isArabic ? 'فرص للتحسين' : 'Opportunities for Improvement',
                description: isArabic 
                    ? `${needsImprovement.length} عادة تحتاج تركيزاً أكثر`
                    : `${needsImprovement.length} habits need more focus`
            });
        }
        
        // تحليل الأيام المتتالية
        const totalStreak = Math.max(...[...medications, ...habits].map(h => h.streak), 0);
        if (totalStreak >= 7) {
            insights.push({
                type: 'positive',
                icon: '🔥',
                title: isArabic ? 'سلسلة إنجازات رائعة' : 'Amazing Streak',
                description: isArabic 
                    ? `${totalStreak} يوم متتالي من الإنجازات!`
                    : `${totalStreak} days consecutive achievements!`
            });
        }
        
        return insights;
    };

    // ✅ توليد توصيات ذكية
    const generateRecommendations = (medications, habits, medStats, habitStats) => {
        const recommendations = [];
        
        // توصيات الأدوية
        if (medications.length > 0 && medStats.adherenceRate < 70) {
            recommendations.push({
                id: 'med_reminder',
                icon: '⏰',
                title: isArabic ? 'تذكير بالأدوية' : 'Medication Reminder',
                description: isArabic 
                    ? 'اضبط منبهات يومية لأوقات تناول الدواء'
                    : 'Set daily alarms for medication times',
                action: isArabic ? 'استخدم تطبيق تذكير' : 'Use a reminder app'
            });
        }
        
        // توصيات العادات
        if (habits.length > 0) {
            const lowHabits = habits.filter(h => h.rate < 30 && h.total > 3);
            if (lowHabits.length > 0) {
                recommendations.push({
                    id: 'habit_focus',
                    icon: '🎯',
                    title: isArabic ? 'ركز على عادات محددة' : 'Focus on Specific Habits',
                    description: isArabic 
                        ? `حاول تحسين: ${lowHabits.slice(0, 2).map(h => h.name).join('، ')}`
                        : `Try improving: ${lowHabits.slice(0, 2).map(h => h.name).join(', ')}`,
                    action: isArabic ? 'ابدأ بهدف صغير يومياً' : 'Start with a small daily goal'
                });
            }
        }
        
        // توصية عامة
        if (medications.length === 0 && habits.length === 0) {
            recommendations.push({
                id: 'start_tracking',
                icon: '📝',
                title: isArabic ? 'ابدأ تتبع عاداتك' : 'Start Tracking Your Habits',
                description: isArabic 
                    ? 'أضف عاداتك اليومية أو أدويتك للحصول على تحليلات مخصصة'
                    : 'Add your daily habits or medications for personalized insights',
                action: isArabic ? 'أضف عادة جديدة' : 'Add a new habit'
            });
        }
        
        // توصية النجاح
        if (medStats.adherenceRate >= 80 || habitStats.completionRate >= 80) {
            recommendations.push({
                id: 'keep_going',
                icon: '🏆',
                title: isArabic ? 'استمر بهذا المستوى الرائع' : 'Keep Up the Great Work',
                description: isArabic 
                    ? 'أنت على الطريق الصحيح، استمر في تحدي نفسك'
                    : 'You\'re on the right track, keep challenging yourself',
                action: isArabic ? 'حافظ على هذا الزخم' : 'Maintain this momentum'
            });
        }
        
        return recommendations;
    };

    useEffect(() => {
        fetchData();
        return () => {
            isMountedRef.current = false;
            isFetchingRef.current = false;
        };
    }, [fetchData, refreshTrigger]);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
        
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // حالة التحميل
    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل عاداتك...' : 'Analyzing your habits...'}</p>
                </div>
            </div>
        );
    }

    // حالة الخطأ
    if (error || !data) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-error">
                    <div className="error-icon">📊</div>
                    <p className="error-message">{error || (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}</p>
                    <button onClick={fetchData} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container habit-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>
                    <span className="header-icon">📊</span>
                    {isArabic ? 'تحليل العادات والأدوية' : 'Habits & Medications Analytics'}
                </h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* بطاقات الإحصائيات الرئيسية */}
            <div className="stats-grid-main">
                <div className="stat-card-main">
                    <div className="stat-icon">💊</div>
                    <div className="stat-info">
                        <div className="stat-value">{data.medications.count}</div>
                        <div className="stat-label">{isArabic ? 'أدوية' : 'Medications'}</div>
                    </div>
                </div>
                <div className="stat-card-main">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">{data.habits.count}</div>
                        <div className="stat-label">{isArabic ? 'عادات' : 'Habits'}</div>
                    </div>
                </div>
                <div className="stat-card-main">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                        <div className="stat-value">{data.medications.stats.adherenceRate}%</div>
                        <div className="stat-label">{isArabic ? 'التزام الأدوية' : 'Med Adherence'}</div>
                    </div>
                </div>
                <div className="stat-card-main">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-info">
                        <div className="stat-value">{data.habits.stats.completionRate}%</div>
                        <div className="stat-label">{isArabic ? 'إنجاز العادات' : 'Habit Completion'}</div>
                    </div>
                </div>
            </div>

            {/* التبويبات */}
            <div className="analytics-tabs">
                <button 
                    className={activeTab === 'overview' ? 'active' : ''} 
                    onClick={() => setActiveTab('overview')}
                >
                    📊 {isArabic ? 'نظرة عامة' : 'Overview'}
                </button>
                <button 
                    className={activeTab === 'medications' ? 'active' : ''} 
                    onClick={() => setActiveTab('medications')}
                >
                    💊 {isArabic ? 'الأدوية' : 'Medications'}
                </button>
                <button 
                    className={activeTab === 'habits' ? 'active' : ''} 
                    onClick={() => setActiveTab('habits')}
                >
                    ✅ {isArabic ? 'العادات' : 'Habits'}
                </button>
                <button 
                    className={activeTab === 'insights' ? 'active' : ''} 
                    onClick={() => setActiveTab('insights')}
                >
                    💡 {isArabic ? 'تحليلات' : 'Insights'}
                </button>
            </div>

            {/* محتوى التبويبات */}
            <div className="tab-content">
                {/* تبويب النظرة العامة */}
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        {/* حالة الالتزام */}
                        {data.medications.hasData && (
                            <div className="insight-card">
                                <div className="insight-icon">💊</div>
                                <div className="insight-content">
                                    <h3>{isArabic ? 'الالتزام بالأدوية' : 'Medication Adherence'}</h3>
                                    <div className="progress-circle-container">
                                        <div className="progress-circle">
                                            <svg width="100" height="100" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                                <circle 
                                                    cx="50" cy="50" r="45" 
                                                    fill="none" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth="8"
                                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - data.medications.stats.adherenceRate / 100)}`}
                                                    transform="rotate(-90 50 50)"
                                                />
                                                <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                                    {data.medications.stats.adherenceRate}%
                                                </text>
                                            </svg>
                                        </div>
                                        <p className="insight-message">{data.medications.stats.message}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* حالة العادات */}
                        {data.habits.hasData && (
                            <div className="insight-card">
                                <div className="insight-icon">✅</div>
                                <div className="insight-content">
                                    <h3>{isArabic ? 'إنجاز العادات' : 'Habit Completion'}</h3>
                                    <div className="progress-circle-container">
                                        <div className="progress-circle">
                                            <svg width="100" height="100" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                                <circle 
                                                    cx="50" cy="50" r="45" 
                                                    fill="none" 
                                                    stroke="#10b981" 
                                                    strokeWidth="8"
                                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - data.habits.stats.completionRate / 100)}`}
                                                    transform="rotate(-90 50 50)"
                                                />
                                                <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                                    {data.habits.stats.completionRate}%
                                                </text>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* أفضل وأسوأ عادة */}
                        <div className="habits-summary">
                            {data.bestHabit !== '—' && (
                                <div className="summary-item best">
                                    <span className="summary-icon">🏆</span>
                                    <div>
                                        <div className="summary-label">{isArabic ? 'أفضل عادة' : 'Best Habit'}</div>
                                        <div className="summary-value">{data.bestHabit}</div>
                                        <div className="summary-sub">{data.bestHabitRate}% {isArabic ? 'إنجاز' : 'completion'}</div>
                                    </div>
                                </div>
                            )}
                            {data.worstHabit && (
                                <div className="summary-item improvement">
                                    <span className="summary-icon">📈</span>
                                    <div>
                                        <div className="summary-label">{isArabic ? 'تحتاج تحسين' : 'Needs Improvement'}</div>
                                        <div className="summary-value">{data.worstHabit}</div>
                                        <div className="summary-sub">{data.worstHabitRate}% {isArabic ? 'إنجاز' : 'completion'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* تبويب الأدوية */}
                {activeTab === 'medications' && (
                    <div className="medications-tab">
                        {!data.medications.hasData ? (
                            <div className="empty-state">
                                <div className="empty-icon">💊</div>
                                <p>{isArabic ? 'لا توجد أدوية مسجلة' : 'No medications recorded'}</p>
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('navigateTo', { detail: { section: 'habits' } }))}
                                    className="add-btn"
                                >
                                    + {isArabic ? 'أضف دواء' : 'Add Medication'}
                                </button>
                            </div>
                        ) : (
                            <div className="items-list">
                                {data.medications.list.map(med => (
                                    <div key={med.id} className="item-card">
                                        <div className="item-header">
                                            <div className="item-info">
                                                <span className="item-icon">💊</span>
                                                <div>
                                                    <div className="item-name">{med.name}</div>
                                                    {med.description && (
                                                        <div className="item-description">{med.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`item-rate ${med.rate >= 70 ? 'high' : med.rate >= 40 ? 'medium' : 'low'}`}>
                                                {med.rate}%
                                            </div>
                                        </div>
                                        <div className="item-stats">
                                            <span>✅ {med.completed}/{med.total}</span>
                                            <span>🔥 {med.streak} {isArabic ? 'يوم' : 'days'}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${med.rate}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* تبويب العادات */}
                {activeTab === 'habits' && (
                    <div className="habits-tab">
                        {!data.habits.hasData ? (
                            <div className="empty-state">
                                <div className="empty-icon">✅</div>
                                <p>{isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded'}</p>
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('navigateTo', { detail: { section: 'habits' } }))}
                                    className="add-btn"
                                >
                                    + {isArabic ? 'أضف عادة' : 'Add Habit'}
                                </button>
                            </div>
                        ) : (
                            <div className="items-list">
                                {data.habits.list.map(habit => (
                                    <div key={habit.id} className="item-card">
                                        <div className="item-header">
                                            <div className="item-info">
                                                <span className="item-icon">
                                                    {habit.type === 'water' ? '💧' : 
                                                     habit.type === 'exercise' ? '🏃' :
                                                     habit.type === 'sleep' ? '😴' : '✅'}
                                                </span>
                                                <div>
                                                    <div className="item-name">{habit.name}</div>
                                                    {habit.description && (
                                                        <div className="item-description">{habit.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`item-rate ${habit.rate >= 70 ? 'high' : habit.rate >= 40 ? 'medium' : 'low'}`}>
                                                {habit.rate}%
                                            </div>
                                        </div>
                                        <div className="item-stats">
                                            <span>✅ {habit.completed}/{habit.total}</span>
                                            <span>🔥 {habit.streak} {isArabic ? 'يوم' : 'days'}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${habit.rate}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* تبويب التحليلات والتوصيات */}
                {activeTab === 'insights' && (
                    <div className="insights-tab">
                        {/* التحليلات الذكية */}
                        {data.insights.length > 0 && (
                            <div className="insights-section">
                                <h3>🧠 {isArabic ? 'تحليلات ذكية' : 'Smart Insights'}</h3>
                                <div className="insights-list">
                                    {data.insights.map((insight, idx) => (
                                        <div key={idx} className={`insight-item ${insight.type}`}>
                                            <span className="insight-icon">{insight.icon}</span>
                                            <div className="insight-text">
                                                <div className="insight-title">{insight.title}</div>
                                                <div className="insight-description">{insight.description}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* التوصيات */}
                        {data.recommendations.length > 0 && (
                            <div className="recommendations-section">
                                <h3>💡 {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>
                                <div className="recommendations-list">
                                    {data.recommendations.map((rec, idx) => (
                                        <div key={idx} className="recommendation-item">
                                            <div className="rec-header">
                                                <span className="rec-icon">{rec.icon}</span>
                                                <span className="rec-title">{rec.title}</span>
                                            </div>
                                            <p className="rec-description">{rec.description}</p>
                                            <div className="rec-action">🎯 {rec.action}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* نصائح سريعة */}
                        <div className="quick-tips">
                            <h4>✨ {isArabic ? 'نصائح سريعة' : 'Quick Tips'}</h4>
                            <div className="tips-list">
                                <div className="tip-item">💡 {isArabic ? 'حدد أوقاتاً ثابتة للأدوية' : 'Set fixed times for medications'}</div>
                                <div className="tip-item">📱 {isArabic ? 'استخدم تطبيقات التذكير' : 'Use reminder apps'}</div>
                                <div className="tip-item">🎯 {isArabic ? 'ابدأ بأهداف صغيرة قابلة للتحقيق' : 'Start with small achievable goals'}</div>
                                <div className="tip-item">📊 {isArabic ? 'راجع تقدمك أسبوعياً' : 'Review your progress weekly'}</div>
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

            {/* أنماط CSS إضافية */}
            <style jsx>{`
                /* إضافات CSS للتحليلات الجديدة */
                .stats-grid-main {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .stat-card-main {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border: 1px solid var(--border-light);
                }
                
                .stat-card-main .stat-icon {
                    font-size: 2rem;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--hover-bg);
                    border-radius: 12px;
                }
                
                .stat-card-main .stat-info {
                    flex: 1;
                }
                
                .stat-card-main .stat-value {
                    font-size: 1.8rem;
                    font-weight: bold;
                    color: var(--text-primary);
                }
                
                .stat-card-main .stat-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                
                .progress-circle-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .progress-circle {
                    position: relative;
                }
                
                .insight-message {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    text-align: center;
                }
                
                .habits-summary {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .summary-item {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .summary-item.best {
                    border-left: 4px solid #10b981;
                }
                
                .summary-item.improvement {
                    border-left: 4px solid #f59e0b;
                }
                
                .summary-icon {
                    font-size: 2rem;
                }
                
                .summary-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                
                .summary-value {
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                
                .summary-sub {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                
                .items-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .item-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                }
                
                .item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.75rem;
                }
                
                .item-info {
                    display: flex;
                    gap: 0.75rem;
                    flex: 1;
                }
                
                .item-icon {
                    font-size: 1.5rem;
                }
                
                .item-name {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .item-description {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                
                .item-rate {
                    font-weight: bold;
                    font-size: 1rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                }
                
                .item-rate.high {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                
                .item-rate.medium {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                }
                
                .item-rate.low {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                
                .item-stats {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }
                
                .progress-bar {
                    background: var(--border-light);
                    border-radius: 10px;
                    height: 6px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: var(--primary-gradient);
                    border-radius: 10px;
                    transition: width 0.3s ease;
                }
                
                .insights-list,
                .recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .insight-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: var(--secondary-bg);
                    border-radius: 12px;
                }
                
                .insight-item.positive {
                    border-left: 3px solid #10b981;
                }
                
                .insight-item.warning {
                    border-left: 3px solid #f59e0b;
                }
                
                .insight-item.improvement {
                    border-left: 3px solid #3b82f6;
                }
                
                .insight-icon {
                    font-size: 1.5rem;
                }
                
                .insight-text {
                    flex: 1;
                }
                
                .insight-title {
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                }
                
                .insight-description {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
                
                .recommendation-item {
                    padding: 1rem;
                    background: var(--secondary-bg);
                    border-radius: 12px;
                }
                
                .rec-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .rec-icon {
                    font-size: 1.2rem;
                }
                
                .rec-title {
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                
                .rec-description {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }
                
                .rec-action {
                    font-size: 0.75rem;
                    color: var(--primary);
                }
                
                .quick-tips {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: var(--secondary-bg);
                    border-radius: 16px;
                }
                
                .quick-tips h4 {
                    margin: 0 0 0.75rem 0;
                    font-size: 0.9rem;
                }
                
                .tips-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .tip-item {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    padding: 0.25rem 0;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                }
                
                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .add-btn {
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                
                @media (max-width: 768px) {
                    .stats-grid-main {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }
                    
                    .habits-summary {
                        grid-template-columns: 1fr;
                    }
                    
                    .item-header {
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                }
                
                [dir="rtl"] .summary-item.best,
                [dir="rtl"] .summary-item.improvement,
                [dir="rtl"] .insight-item.positive,
                [dir="rtl"] .insight-item.warning,
                [dir="rtl"] .insight-item.improvement {
                    border-left: none;
                    border-right: 3px solid;
                }
            `}</style>
        </div>
    );
};

export default HabitAnalytics;