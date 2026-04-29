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

                    <style jsx>{`
 /* ===========================================
   HabitAnalytics.css - الأنماط الداخلية فقط
   ✅ الألوان والأشكال والبطاقات
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== حاوية التحليلات الداخلية ===== */
.analytics-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    margin: 0;
    transition: all 0.2s ease;
}

.analytics-container.dark-mode {
    background: #1e293b;
}

/* ===== الرأس ===== */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.analytics-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.3px;
}

.dark-mode .analytics-header h2 {
    background: linear-gradient(135deg, #818cf8, #a78bfa);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.refresh-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.1rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn {
    background: #334155;
    color: #94a3b8;
}

.refresh-btn:hover {
    background: #6366f1;
    color: white;
    transform: rotate(180deg);
}

/* ===== شبكة الإحصائيات ===== */
.analytics-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.analytics-stat-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.2s;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-stat-card {
    background: #0f172a;
    border-color: #334155;
}

.analytics-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dark-mode .analytics-stat-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.stat-icon {
    font-size: 1.8rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 16px;
    color: white;
}

.stat-content {
    flex: 1;
}

.stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    line-height: 1.2;
}

.dark-mode .stat-value {
    color: #f1f5f9;
}

.stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

/* ===== التبويبات ===== */
.analytics-tabs {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-light, #e2e8f0);
    padding-bottom: 0.5rem;
}

.dark-mode .analytics-tabs {
    border-bottom-color: #334155;
}

.analytics-tabs button {
    padding: 0.6rem 1.25rem;
    border: none;
    background: transparent;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    border-radius: 40px;
}

.analytics-tabs button.active {
    background: #6366f1;
    color: white;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.analytics-tabs button:hover:not(.active) {
    background: var(--hover-bg, #f1f5f9);
    color: var(--text-primary, #0f172a);
}

.dark-mode .analytics-tabs button:hover:not(.active) {
    background: #334155;
    color: #f1f5f9;
}

/* ===== بطاقات الإحصاءات والتحليلات ===== */
.insight-card {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
    display: flex;
    gap: 1rem;
    align-items: center;
}

.insight-icon {
    font-size: 2.5rem;
}

.insight-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
}

.insight-content .stat-value {
    color: white;
    font-size: 2.5rem;
    font-weight: 800;
}

.insight-content p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.9;
}

/* ===== قسم التوصيات ===== */
.recommendations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-section {
    background: #0f172a;
    border-color: #334155;
}

.recommendations-section h3,
.recommendations-section h4 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .recommendations-section h3,
.dark-mode .recommendations-section h4 {
    color: #f1f5f9;
}

.recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.recommendation-card {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    transition: all 0.2s;
    border-left: 3px solid #6366f1;
}

.dark-mode .recommendation-card {
    background: #1e293b;
}

.recommendation-card:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .recommendation-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[dir="rtl"] .recommendation-card {
    border-left: none;
    border-right: 3px solid #6366f1;
}

[dir="rtl"] .recommendation-card:hover {
    transform: translateX(-4px);
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

.rec-category {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #6366f1;
    letter-spacing: 0.5px;
}

.rec-message {
    font-size: 0.85rem;
    margin: 0.5rem 0;
    color: var(--text-primary, #0f172a);
    font-weight: 500;
}

.rec-advice {
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
    background: var(--tertiary-bg, #f1f5f9);
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
    margin-top: 0.5rem;
}

.dark-mode .rec-advice {
    background: #0f172a;
    color: #94a3b8;
}

/* ===== قائمة الأدوية والعادات ===== */
.habits-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.habit-card {
    background: var(--card-bg, #ffffff);
    border-radius: 18px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .habit-card {
    background: #1e293b;
    border-color: #334155;
}

.habit-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.dark-mode .habit-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.habit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.habit-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .habit-name {
    color: #f1f5f9;
}

.habit-rate {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 40px;
}

.habit-rate.high {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.habit-rate.medium {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

.habit-rate.low {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.habit-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .habit-stats {
    color: #94a3b8;
}

.progress-bar {
    background: var(--border-light, #e2e8f0);
    border-radius: 10px;
    height: 6px;
    overflow: hidden;
}

.dark-mode .progress-bar {
    background: #334155;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 10px;
    transition: width 0.3s ease;
}

/* ===== نصائح سريعة ===== */
.habit-tips {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .habit-tips {
    background: #0f172a;
    border-color: #334155;
}

.habit-tips h4 {
    margin: 0 0 1rem 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.tips-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
}

.tip-item {
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
    padding: 0.75rem;
    text-align: center;
    transition: all 0.2s;
}

.dark-mode .tip-item {
    background: #1e293b;
}

.tip-item:hover {
    transform: translateY(-2px);
}

.tip-icon {
    font-size: 1.5rem;
    display: block;
    margin-bottom: 0.25rem;
}

.tip-item p {
    font-size: 0.7rem;
    margin: 0;
    color: var(--text-secondary, #64748b);
}

/* ===== حالات فارغة ===== */
.analytics-empty {
    text-align: center;
    padding: 2rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-empty {
    background: #0f172a;
    border-color: #334155;
}

.empty-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
}

.analytics-empty p {
    margin: 0.25rem 0;
    color: var(--text-primary, #0f172a);
}

.empty-hint {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

/* ===== حالات التحميل والخطأ ===== */
.analytics-loading,
.analytics-error {
    text-align: center;
    padding: 2rem;
    background: var(--card-bg, #ffffff);
    border-radius: 20px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.25rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    background: #4f46e5;
    transform: translateY(-1px);
}

/* ===== التذييل ===== */
.analytics-footer {
    text-align: center;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
    margin-top: 0.5rem;
}

.dark-mode .analytics-footer {
    border-top-color: #334155;
}

.analytics-footer small {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== أنماط إضافية للثيم الداكن ===== */
.dark-mode .insight-card {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
}

/* ===== دعم RTL ===== */
[dir="rtl"] .habit-stats {
    flex-direction: row-reverse;
}

[dir="rtl"] .tips-grid {
    direction: rtl;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover,
    .recommendation-card:hover,
    .habit-card:hover,
    .tip-item:hover,
    .analytics-stat-card:hover {
        transform: none;
    }
    
    .progress-fill {
        transition: none;
    }
    
    .spinner {
        animation: none;
    }
}
            `}</style>
        </div>
    );
};


export default HabitAnalytics;