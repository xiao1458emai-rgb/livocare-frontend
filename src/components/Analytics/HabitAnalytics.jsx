// src/components/Analytics/HabitAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Analytics.css';

const HabitAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('medications');
    const isArabic = i18n.language.startsWith('ar');

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        fetchData();
    }, [refreshTrigger]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // جلب بيانات العادات والأدوية
            const [habitsRes, logsRes, userMedsRes] = await Promise.all([
                axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/medications/user/').catch(() => ({ data: [] }))
            ]);

            const habits = habitsRes.data || [];
            const logs = logsRes.data || [];
            const userMedications = userMedsRes.data?.data || [];

            const analysis = analyzeData(habits, logs, userMedications);
            setData(analysis);
        } catch (err) {
            console.error('Error fetching habit data:', err);
            setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const analyzeData = (habits, logs, medications) => {
        // تصنيف العادات حسب النوع
        const medicationHabits = [];
        const generalHabits = [];
        
        habits.forEach(habit => {
            const name = (habit.name || '').toLowerCase();
            const isMedication = name.includes('دواء') || name.includes('medication') || 
                                name.includes('حبة') || name.includes('pill') ||
                                name.includes('علاج') || name.includes('treatment');
            
            if (isMedication) {
                medicationHabits.push(habit);
            } else {
                generalHabits.push(habit);
            }
        });

        // حساب الالتزام بالأدوية
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        
        let medicationCompliance = {
            total: 0,
            completed: 0,
            rate: 0,
            missed: [],
            streak: 0
        };

        medicationHabits.forEach(habit => {
            const habitLogs = logs.filter(log => log.habit === habit.id);
            const completed = habitLogs.filter(log => log.is_completed).length;
            medicationCompliance.total += habitLogs.length;
            medicationCompliance.completed += completed;
        });
        
        medicationCompliance.rate = medicationCompliance.total > 0 
            ? Math.round((medicationCompliance.completed / medicationCompliance.total) * 100) 
            : 0;

        // حساب السلسلة المتتالية للأدوية
        let streak = 0;
        const checkDate = new Date();
        for (let i = 0; i < 30; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const hasLog = logs.some(log => {
                const habit = medicationHabits.find(h => h.id === log.habit);
                return habit && log.log_date === dateStr && log.is_completed;
            });
            if (hasLog) streak++;
            else break;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        medicationCompliance.streak = streak;

        // أدوية المستخدم
        const userMeds = medications.map(med => ({
            id: med.id,
            name: med.medication?.brand_name || med.medication_name || 'دواء',
            genericName: med.medication?.generic_name,
            dosage: med.dosage,
            frequency: med.frequency,
            startDate: med.start_date,
            reminderTime: med.reminder_time
        }));

        // التنبؤات بناءً على الالتزام
        const predictions = [];
        
        if (medicationCompliance.rate < 70 && medicationCompliance.rate > 0) {
            predictions.push({
                icon: '⚠️',
                title: isArabic ? 'انخفاض الالتزام بالأدوية' : 'Low medication adherence',
                description: isArabic 
                    ? `التزامك بالأدوية ${medicationCompliance.rate}% فقط، قد يؤثر ذلك على فعالية العلاج`
                    : `Your medication adherence is only ${medicationCompliance.rate}%, which may affect treatment effectiveness`,
                severity: 'high',
                suggestion: isArabic 
                    ? 'اضبط تذكيراً يومياً لأخذ أدويتك في الوقت المحدد'
                    : 'Set a daily reminder to take your medications on time'
            });
        }

        if (medicationCompliance.streak === 0 && medicationCompliance.total > 0) {
            predictions.push({
                icon: '📅',
                title: isArabic ? 'انقطاع عن الأدوية' : 'Medication gap detected',
                description: isArabic 
                    ? 'لم تسجل أي جرعة دواء اليوم، حافظ على انتظام جرعاتك'
                    : 'No medication recorded today, maintain your regular schedule',
                severity: 'medium',
                suggestion: isArabic 
                    ? 'حاول ألا تفوت جرعات الدواء لضمان فعالية العلاج'
                    : 'Try not to miss medication doses to ensure treatment effectiveness'
            });
        }

        if (medicationCompliance.rate >= 90 && medicationCompliance.total > 5) {
            predictions.push({
                icon: '🌟',
                title: isArabic ? 'التزام ممتاز بالأدوية' : 'Excellent medication adherence',
                description: isArabic 
                    ? `التزامك ${medicationCompliance.rate}%، استمر بهذا المستوى الرائع`
                    : `Your adherence is ${medicationCompliance.rate}%, keep up this great level`,
                severity: 'positive',
                suggestion: isArabic 
                    ? 'أحسنت! استمر في هذا الالتزام الممتاز'
                    : 'Great job! Keep up this excellent adherence'
            });
        }

        // الأمراض المحتملة بناءً على الأدوية
        const conditions = [];
        const conditionMap = {
            'atorvastatin': { name: isArabic ? 'ارتفاع الكوليسترول' : 'High Cholesterol', type: 'chronic' },
            'lisinopril': { name: isArabic ? 'ارتفاع ضغط الدم' : 'Hypertension', type: 'chronic' },
            'metformin': { name: isArabic ? 'السكري من النوع 2' : 'Type 2 Diabetes', type: 'chronic' },
            'levothyroxine': { name: isArabic ? 'قصور الغدة الدرقية' : 'Hypothyroidism', type: 'chronic' },
            'albuterol': { name: isArabic ? 'الربو' : 'Asthma', type: 'respiratory' },
            'omeprazole': { name: isArabic ? 'ارتجاع المريء' : 'GERD', type: 'digestive' },
            'sertraline': { name: isArabic ? 'الاكتئاب' : 'Depression', type: 'mental' },
            'amoxicillin': { name: isArabic ? 'عدوى بكتيرية' : 'Bacterial Infection', type: 'acute' }
        };

        userMeds.forEach(med => {
            const name = (med.name + ' ' + (med.genericName || '')).toLowerCase();
            for (const [key, condition] of Object.entries(conditionMap)) {
                if (name.includes(key)) {
                    if (!conditions.find(c => c.name === condition.name)) {
                        conditions.push(condition);
                    }
                }
            }
        });

        // العادات الأكثر تكراراً
        const habitStats = generalHabits.map(habit => {
            const habitLogs = logs.filter(log => log.habit === habit.id);
            const completed = habitLogs.filter(log => log.is_completed).length;
            const total = habitLogs.length;
            return {
                id: habit.id,
                name: habit.name,
                description: habit.description,
                completed,
                total,
                rate: total > 0 ? Math.round((completed / total) * 100) : 0,
                frequency: habit.frequency
            };
        }).sort((a, b) => b.rate - a.rate);

        // توصيات مخصصة
        const recommendations = [];

        if (medicationCompliance.rate < 80 && medicationCompliance.total > 0) {
            recommendations.push({
                icon: '💊',
                title: isArabic ? 'تحسين الالتزام بالأدوية' : 'Improve medication adherence',
                advice: isArabic 
                    ? `التزامك الحالي ${medicationCompliance.rate}%. حاول ضبط تذكير يومي`
                    : `Your current adherence is ${medicationCompliance.rate}%. Try setting a daily reminder`,
                action: isArabic ? 'أضف تذكيراً للأدوية في الإعدادات' : 'Add medication reminders in settings'
            });
        }

        if (habitStats.length > 0 && habitStats[0].rate < 50) {
            recommendations.push({
                icon: '🎯',
                title: isArabic ? 'ابدأ بعادة صغيرة' : 'Start with a small habit',
                advice: isArabic 
                    ? 'حاول إضافة عادة صغيرة وسهلة مثل شرب كوب ماء صباحاً'
                    : 'Try adding a small, easy habit like drinking a glass of water in the morning',
                action: isArabic ? 'أضف عادة جديدة' : 'Add a new habit'
            });
        }

        if (conditions.length > 0) {
            recommendations.push({
                icon: '🩺',
                title: isArabic ? 'استشارة طبية موصى بها' : 'Medical consultation recommended',
                advice: isArabic 
                    ? `بناءً على أدويتك، يبدو أنك تعاني من ${conditions.map(c => c.name).join(' و ')}. استشر طبيبك بانتظام`
                    : `Based on your medications, you may have ${conditions.map(c => c.name).join(' and ')}. Consult your doctor regularly`,
                action: isArabic ? 'حدد موعداً مع طبيبك' : 'Schedule an appointment with your doctor'
            });
        }

        return {
            medications: {
                list: userMeds,
                count: userMeds.length,
                compliance: medicationCompliance,
                conditions
            },
            habits: habitStats,
            predictions,
            recommendations,
            lastUpdated: new Date().toISOString()
        };
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error || (isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data')}</p>
                <button onClick={fetchData} className="retry-btn">🔄 {t('common.retry')}</button>
            </div>
        );
    }

    return (
        <div className={`analytics-container habit-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>💊 {isArabic ? 'تحليل العادات والأدوية' : 'Habits & Medications Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={t('common.refresh')}>🔄</button>
            </div>

            {/* بطاقات سريعة */}
            <div className="quick-stats">
                <div className="stat-card">
                    <div className="stat-icon">💊</div>
                    <div className="stat-value">{data.medications.count}</div>
                    <div className="stat-label">{isArabic ? 'أدوية مسجلة' : 'Medications'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">{data.medications.compliance.rate}%</div>
                    <div className="stat-label">{isArabic ? 'نسبة الالتزام' : 'Adherence'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-value">{data.medications.compliance.streak}</div>
                    <div className="stat-label">{isArabic ? 'أيام متتالية' : 'Day streak'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{data.habits.length}</div>
                    <div className="stat-label">{isArabic ? 'عادات مسجلة' : 'Habits'}</div>
                </div>
            </div>

            {/* تبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'medications' ? 'active' : ''} onClick={() => setActiveTab('medications')}>
                    💊 {isArabic ? 'الأدوية والالتزام' : 'Medications'}
                </button>
                <button className={activeTab === 'habits' ? 'active' : ''} onClick={() => setActiveTab('habits')}>
                    📋 {isArabic ? 'العادات' : 'Habits'}
                </button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
                    🧠 {isArabic ? 'تحليلات وتنبؤات' : 'Insights'}
                </button>
            </div>

            <div className="tab-content">
                {/* تبويب الأدوية */}
                {activeTab === 'medications' && (
                    <div className="medications-section">
                        {data.medications.list.length === 0 ? (
                            <div className="empty-state">
                                <span>💊</span>
                                <p>{isArabic ? 'لا توجد أدوية مسجلة' : 'No medications recorded'}</p>
                                <button onClick={() => window.location.href = '/habits'} className="add-btn">
                                    ➕ {isArabic ? 'أضف دواء' : 'Add medication'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="compliance-card">
                                    <div className="compliance-circle" style={{
                                        background: `conic-gradient(#10b981 0% ${data.medications.compliance.rate}%, #e5e7eb ${data.medications.compliance.rate}% 100%)`
                                    }}>
                                        <span>{data.medications.compliance.rate}%</span>
                                    </div>
                                    <div className="compliance-info">
                                        <h4>{isArabic ? 'نسبة الالتزام بالأدوية' : 'Medication Adherence'}</h4>
                                        <p>{isArabic 
                                            ? `سجلت ${data.medications.compliance.completed} من أصل ${data.medications.compliance.total} جرعة`
                                            : `${data.medications.compliance.completed} out of ${data.medications.compliance.total} doses recorded`}
                                        </p>
                                        <div className="streak-info">📅 {isArabic ? 'أيام متتالية' : 'Current streak'}: {data.medications.compliance.streak}</div>
                                    </div>
                                </div>

                                <div className="medications-list">
                                    <h3>{isArabic ? 'قائمة أدويتك' : 'Your Medications'}</h3>
                                    {data.medications.list.map(med => (
                                        <div key={med.id} className="medication-item">
                                            <div className="med-icon">💊</div>
                                            <div className="med-info">
                                                <div className="med-name">{med.name}</div>
                                                {med.dosage && <div className="med-dosage">💊 {med.dosage}</div>}
                                                {med.frequency && <div className="med-frequency">🕒 {med.frequency}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {data.medications.conditions.length > 0 && (
                                    <div className="conditions-card">
                                        <h3>🩺 {isArabic ? 'الأمراض المحتملة' : 'Potential Conditions'}</h3>
                                        <div className="conditions-list">
                                            {data.medications.conditions.map((cond, i) => (
                                                <div key={i} className="condition-item">
                                                    <span className="condition-icon">🏥</span>
                                                    <span className="condition-name">{cond.name}</span>
                                                    <span className={`condition-type ${cond.type}`}>
                                                        {cond.type === 'chronic' ? (isArabic ? 'مزمن' : 'Chronic') : 
                                                         cond.type === 'acute' ? (isArabic ? 'حاد' : 'Acute') : 
                                                         (isArabic ? 'تنفسي' : 'Respiratory')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="conditions-note">
                                            ⚠️ {isArabic 
                                                ? 'هذه تقديرات بناءً على أدويتك، استشر طبيبك للتشخيص الدقيق'
                                                : 'These are estimates based on your medications, consult your doctor for accurate diagnosis'}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* تبويب العادات */}
                {activeTab === 'habits' && (
                    <div className="habits-section">
                        {data.habits.length === 0 ? (
                            <div className="empty-state">
                                <span>📋</span>
                                <p>{isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded'}</p>
                                <button onClick={() => window.location.href = '/habits'} className="add-btn">
                                    ➕ {isArabic ? 'أضف عادة' : 'Add habit'}
                                </button>
                            </div>
                        ) : (
                            <div className="habits-list">
                                {data.habits.map(habit => (
                                    <div key={habit.id} className="habit-card">
                                        <div className="habit-header">
                                            <span className="habit-name">{habit.name}</span>
                                            <span className={`habit-rate ${habit.rate >= 70 ? 'high' : habit.rate >= 40 ? 'medium' : 'low'}`}>
                                                {habit.rate}%
                                            </span>
                                        </div>
                                        {habit.description && <p className="habit-desc">{habit.description}</p>}
                                        <div className="habit-stats">
                                            <span>✅ {habit.completed}/{habit.total}</span>
                                            <span>🔄 {habit.frequency || 'Daily'}</span>
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

                {/* تبويب التحليلات */}
                {activeTab === 'insights' && (
                    <div className="insights-section">
                        {/* التنبؤات */}
                        {data.predictions.length > 0 && (
                            <div className="predictions-card">
                                <h3>🔮 {isArabic ? 'تنبؤات وتنبيهات' : 'Predictions & Alerts'}</h3>
                                {data.predictions.map((pred, i) => (
                                    <div key={i} className={`prediction-item severity-${pred.severity || 'medium'}`}>
                                        <div className="prediction-header">
                                            <span className="prediction-icon">{pred.icon}</span>
                                            <span className="prediction-title">{pred.title}</span>
                                        </div>
                                        <p className="prediction-desc">{pred.description}</p>
                                        <div className="prediction-suggestion">
                                            💡 {pred.suggestion}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* التوصيات */}
                        {data.recommendations.length > 0 && (
                            <div className="recommendations-card">
                                <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                                {data.recommendations.map((rec, i) => (
                                    <div key={i} className="recommendation-item">
                                        <div className="rec-header">
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span className="rec-title">{rec.title}</span>
                                        </div>
                                        <p className="rec-advice">{rec.advice}</p>
                                        <div className="rec-action">
                                            🎯 {rec.action}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* نصائح سريعة */}
                        <div className="quick-tips-card">
                            <h3>💡 {isArabic ? 'نصائح سريعة' : 'Quick Tips'}</h3>
                            <ul className="tips-list">
                                <li>💊 {isArabic ? 'استخدم تذكيرات الأدوية لتحسين الالتزام' : 'Use medication reminders to improve adherence'}</li>
                                <li>📅 {isArabic ? 'حافظ على روتين يومي ثابت للعادات' : 'Maintain a consistent daily routine for habits'}</li>
                                <li>🩺 {isArabic ? 'استشر طبيبك بانتظام لمتابعة حالتك' : 'Consult your doctor regularly to monitor your condition'}</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="analytics-footer">
                <small>{isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(data.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small>
            </div>

            <style jsx>{`
                .quick-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .stat-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 12px;
                    text-align: center;
                }
                .stat-icon { font-size: 1.5rem; display: block; }
                .stat-value { font-size: 1.3rem; font-weight: bold; color: var(--text-primary); }
                .stat-label { font-size: 0.7rem; color: var(--text-tertiary); }
                
                .analytics-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--border-light);
                }
                .analytics-tabs button {
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .analytics-tabs button.active {
                    color: var(--primary-color);
                    border-bottom: 2px solid var(--primary-color);
                }
                
                .compliance-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .compliance-circle {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .medications-list, .habits-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
                .medication-item, .habit-card {
                    background: var(--secondary-bg);
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .med-icon { font-size: 1.5rem; }
                .med-info { flex: 1; }
                .med-name { font-weight: 600; }
                .med-dosage, .med-frequency { font-size: 0.7rem; color: var(--text-tertiary); }
                
                .conditions-card {
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 16px;
                    padding: 16px;
                    margin-top: 16px;
                }
                .condition-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                }
                .condition-type {
                    font-size: 0.7rem;
                    padding: 2px 8px;
                    border-radius: 20px;
                    background: rgba(0,0,0,0.1);
                }
                .condition-type.chronic { background: rgba(245,158,11,0.2); color: #f59e0b; }
                .condition-type.acute { background: rgba(239,68,68,0.2); color: #ef4444; }
                .conditions-note { font-size: 0.7rem; margin-top: 12px; color: var(--text-tertiary); }
                
                .habit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                .habit-rate { font-weight: bold; }
                .habit-rate.high { color: #10b981; }
                .habit-rate.medium { color: #f59e0b; }
                .habit-rate.low { color: #ef4444; }
                .habit-desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px; }
                .habit-stats { display: flex; gap: 12px; font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 8px; }
                .progress-bar { background: var(--border-light); border-radius: 10px; height: 4px; overflow: hidden; }
                .progress-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #667eea, #764ba2); }
                
                .predictions-card, .recommendations-card, .quick-tips-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                .prediction-item, .recommendation-item {
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 10px;
                    background: var(--card-bg);
                }
                .prediction-item.severity-high { border-left: 3px solid #ef4444; }
                .prediction-item.severity-medium { border-left: 3px solid #f59e0b; }
                .prediction-header, .rec-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
                .prediction-title, .rec-title { font-weight: 600; }
                .prediction-desc, .rec-advice { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; }
                .prediction-suggestion, .rec-action { font-size: 0.8rem; color: var(--primary-color); }
                
                .tips-list { list-style: none; padding: 0; margin: 0; }
                .tips-list li { padding: 6px 0; font-size: 0.85rem; }
                .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }
                .add-btn { background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin-top: 10px; }
                .analytics-footer { text-align: center; font-size: 0.7rem; color: var(--text-tertiary); margin-top: 16px; }
                
                @media (max-width: 600px) { .quick-stats { grid-template-columns: repeat(2, 1fr); } }
                .dark-mode .stat-card, .dark-mode .medication-item, .dark-mode .habit-card,
                .dark-mode .compliance-card, .dark-mode .predictions-card, .dark-mode .recommendations-card { background: #1e293b; }
                .dark-mode .condition-item { border-color: #334155; }
            `}</style>
        </div>
    );
};

export default HabitAnalytics;