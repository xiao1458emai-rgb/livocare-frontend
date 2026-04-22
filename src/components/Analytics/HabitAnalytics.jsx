// src/components/Analytics/HabitAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Analytics.css';

const HabitAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('medications');
    const isArabic = i18n.language?.startsWith('ar');

    useEffect(() => {
        fetchData();
    }, [refreshTrigger]);

    // دالة مساعدة لاستخراج البيانات
    const extractData = (response) => {
        if (response?.results) return response.results;
        if (Array.isArray(response)) return response;
        return [];
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [habitsRes, logsRes] = await Promise.all([
                axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] }))
            ]);

            const habits = extractData(habitsRes.data);
            const logs = extractData(logsRes.data);

            if (habits.length === 0) {
                setData(null);
                setError(isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded');
                setLoading(false);
                return;
            }

            const analysis = analyzeHabitsAndMedications(habits, logs);
            setData(analysis);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
        } finally {
            setLoading(false);
        }
    };

    // دالة لاستنتاج نوع العادة
    const detectHabitType = (habitName, habitDescription = '') => {
        const text = (habitName + ' ' + habitDescription).toLowerCase();
        
        const medicationKeywords = ['دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment', 'pain', 'ibuprofen', 'aspirin', 'acetaminophen', 'paracetamol', 'antibiotic', 'مضاد', 'مسكن', 'tylenol', 'advil', 'capsule', 'tablet', 'mg', 'ml', 'dose', 'جرعة', 'ملجم'];
        const waterKeywords = ['ماء', 'water', 'ترطيب', 'hydration', 'كوب', 'glass'];
        const exerciseKeywords = ['رياضة', 'exercise', 'مشي', 'walk', 'جري', 'run', 'gym', 'تمارين'];
        const sleepKeywords = ['نوم', 'sleep', 'استرخاء', 'relax'];
        const nutritionKeywords = ['طعام', 'food', 'غذاء', 'nutrition', 'وجبة', 'meal', 'فيتامين', 'vitamin'];
        
        if (medicationKeywords.some(k => text.includes(k))) return 'medication';
        if (waterKeywords.some(k => text.includes(k))) return 'water';
        if (exerciseKeywords.some(k => text.includes(k))) return 'exercise';
        if (sleepKeywords.some(k => text.includes(k))) return 'sleep';
        if (nutritionKeywords.some(k => text.includes(k))) return 'nutrition';
        return 'general';
    };

    // استخراج معلومات الدواء
    const extractMedicationInfo = (habitName, habitDescription) => {
        const text = (habitName + ' ' + habitDescription).toLowerCase();
        
        let genericName = '';
        const genericPatterns = [/الاسم العلمي[:\s]+([^|\n]+)/i, /generic[:\s]+([^|\n]+)/i];
        for (const pattern of genericPatterns) {
            const match = habitDescription.match(pattern);
            if (match) {
                genericName = match[1]?.trim() || '';
                break;
            }
        }
        
        let manufacturer = '';
        const manufacturerPatterns = [/🏭[:\s]+([^|]+)/i, /manufacturer[:\s]+([^|]+)/i, /شركة[:\s]+([^|]+)/i];
        for (const pattern of manufacturerPatterns) {
            const match = habitDescription.match(pattern);
            if (match) {
                manufacturer = match[1]?.trim() || '';
                break;
            }
        }
        
        const dosageMatch = text.match(/(\d+\s*(mg|ml|g|mcg))/i);
        const dosage = dosageMatch ? dosageMatch[0] : '';
        
        return { genericName, manufacturer, dosage };
    };

    const analyzeHabitsAndMedications = (habits, logs) => {
        const categorizedHabits = habits.map(habit => {
            const type = detectHabitType(habit.name, habit.description);
            const medicationInfo = type === 'medication' ? extractMedicationInfo(habit.name, habit.description) : null;
            
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
            
            return {
                id: habit.id,
                name: habit.name,
                description: habit.description,
                type,
                medicationInfo,
                completed,
                total,
                rate,
                streak,
                frequency: habit.frequency || (isArabic ? 'يومي' : 'Daily')
            };
        });
        
        const medications = categorizedHabits.filter(h => h.type === 'medication');
        const otherHabits = categorizedHabits.filter(h => h.type !== 'medication');
        
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
        
        // اكتشاف الأمراض المحتملة
        const diseaseKeywords = {
            'diabetes': ['metformin', 'insulin', 'diabetes', 'سكري', 'glucophage'],
            'hypertension': ['lisinopril', 'amlodipine', 'hypertension', 'ضغط', 'losartan', 'atenolol'],
            'cholesterol': ['atorvastatin', 'simvastatin', 'cholesterol', 'كوليسترول', 'lipitor'],
            'pain': ['ibuprofen', 'aspirin', 'acetaminophen', 'pain', 'ألم', 'مسكن'],
            'infection': ['antibiotic', 'amoxicillin', 'infection', 'عدوى', 'مضاد حيوي']
        };
        
        const detectedConditions = [];
        medications.forEach(med => {
            const text = (med.name + ' ' + (med.medicationInfo?.genericName || '')).toLowerCase();
            for (const [condition, keywords] of Object.entries(diseaseKeywords)) {
                if (keywords.some(k => text.includes(k))) {
                    const conditionName = {
                        'diabetes': isArabic ? 'السكري' : 'Diabetes',
                        'hypertension': isArabic ? 'ارتفاع ضغط الدم' : 'Hypertension',
                        'cholesterol': isArabic ? 'ارتفاع الكوليسترول' : 'High Cholesterol',
                        'pain': isArabic ? 'آلام مزمنة' : 'Chronic Pain',
                        'infection': isArabic ? 'عدوى' : 'Infection'
                    }[condition];
                    
                    if (!detectedConditions.find(c => c.name === conditionName)) {
                        detectedConditions.push({ name: conditionName, type: 'chronic' });
                    }
                }
            }
        });
        
        // تحليل الالتزام
        let complianceLevel = 'good';
        let complianceMessage = '';
        if (medicationStats.adherenceRate >= 90) {
            complianceLevel = 'excellent';
            complianceMessage = isArabic ? 'التزام ممتاز! استمر في هذا المستوى الرائع' : 'Excellent adherence! Keep up this great level';
        } else if (medicationStats.adherenceRate >= 70) {
            complianceLevel = 'good';
            complianceMessage = isArabic ? 'التزام جيد، يمكنك التحسن' : 'Good adherence, you can improve';
        } else if (medicationStats.adherenceRate >= 50) {
            complianceLevel = 'fair';
            complianceMessage = isArabic ? 'التزام متوسط، حاول تحسين روتينك' : 'Fair adherence, try to improve your routine';
        } else {
            complianceLevel = 'poor';
            complianceMessage = isArabic ? 'التزام منخفض، ننصح بضبط تذكيرات للأدوية' : 'Low adherence, consider setting medication reminders';
        }
        
        // التنبؤات
        const predictions = [];
        if (medicationStats.adherenceRate < 70 && medicationStats.totalLogs > 0) {
            predictions.push({
                icon: '⚠️',
                title: isArabic ? 'انخفاض الالتزام بالأدوية' : 'Low medication adherence',
                description: isArabic ? `التزامك بالأدوية ${medicationStats.adherenceRate}% فقط، قد يؤثر ذلك على فعالية العلاج` : `Your medication adherence is only ${medicationStats.adherenceRate}%, which may affect treatment effectiveness`,
                severity: 'high',
                suggestion: isArabic ? 'اضبط تذكيراً يومياً لأخذ أدويتك في الوقت المحدد' : 'Set a daily reminder to take your medications on time'
            });
        }
        
        if (medicationStats.adherenceRate >= 90 && medicationStats.totalLogs > 5) {
            predictions.push({
                icon: '🌟',
                title: isArabic ? 'التزام ممتاز بالأدوية' : 'Excellent medication adherence',
                description: isArabic ? `التزامك ${medicationStats.adherenceRate}%، استمر بهذا المستوى الرائع` : `Your adherence is ${medicationStats.adherenceRate}%, keep up this great level`,
                severity: 'positive',
                suggestion: isArabic ? 'أحسنت! استمر في هذا الالتزام الممتاز' : 'Great job! Keep up this excellent adherence'
            });
        }
        
        // توصيات
        const recommendations = [];
        if (medicationStats.adherenceRate < 80 && medicationStats.totalLogs > 0) {
            recommendations.push({
                icon: '💊',
                title: isArabic ? 'تحسين الالتزام بالأدوية' : 'Improve medication adherence',
                advice: isArabic ? `التزامك الحالي ${medicationStats.adherenceRate}%. حاول ضبط تذكير يومي` : `Your current adherence is ${medicationStats.adherenceRate}%. Try setting a daily reminder`,
                action: isArabic ? 'أضف تذكيراً للأدوية في الإعدادات' : 'Add medication reminders in settings'
            });
        }
        
        if (detectedConditions.length > 0) {
            recommendations.push({
                icon: '🩺',
                title: isArabic ? 'استشارة طبية موصى بها' : 'Medical consultation recommended',
                advice: isArabic ? `بناءً على أدويتك، يبدو أنك تعاني من ${detectedConditions.map(c => c.name).join(' و ')}. استشر طبيبك بانتظام` : `Based on your medications, you may have ${detectedConditions.map(c => c.name).join(' and ')}. Consult your doctor regularly`,
                action: isArabic ? 'حدد موعداً مع طبيبك' : 'Schedule an appointment with your doctor'
            });
        }
        
        const quickTips = [
            { icon: '💊', text: isArabic ? 'استخدم تذكيرات الأدوية لتحسين الالتزام' : 'Use medication reminders to improve adherence' },
            { icon: '📅', text: isArabic ? 'حافظ على روتين يومي ثابت للعادات' : 'Maintain a consistent daily routine for habits' },
            { icon: '🩺', text: isArabic ? 'استشر طبيبك بانتظام لمتابعة حالتك' : 'Consult your doctor regularly to monitor your condition' }
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
            otherHabits,
            detectedConditions,
            predictions,
            recommendations,
            quickTips,
            lastUpdated: new Date().toISOString()
        };
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <p>❌ {error || (isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data')}</p>
                    <button onClick={fetchData} className="retry-btn">🔄 {t('common.retry')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* رأس التحليلات */}
            <div className="analytics-header">
                <h2>
                    <span>💊</span>
                    {isArabic ? 'تحليل العادات والأدوية' : 'Habits & Medications Analytics'}
                </h2>
                <button onClick={fetchData} className="refresh-btn" title={t('common.refresh')}>🔄</button>
            </div>

            {/* بطاقات الإحصائيات السريعة */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                    <div className="stat-icon">💊</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.medications.count}</div>
                        <div className="stat-label">{isArabic ? 'أدوية مسجلة' : 'Medications'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.medications.adherenceRate}%</div>
                        <div className="stat-label">{isArabic ? 'نسبة الالتزام' : 'Adherence'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.medications.streak}</div>
                        <div className="stat-label">{isArabic ? 'أيام متتالية' : 'Day streak'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.otherHabits.length + data.medications.count}</div>
                        <div className="stat-label">{isArabic ? 'إجمالي العادات' : 'Total habits'}</div>
                    </div>
                </div>
            </div>

            {/* التبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'medications' ? 'active' : ''} onClick={() => setActiveTab('medications')}>
                    💊 {isArabic ? 'الأدوية' : 'Medications'}
                </button>
                <button className={activeTab === 'habits' ? 'active' : ''} onClick={() => setActiveTab('habits')}>
                    📋 {isArabic ? 'جميع العادات' : 'All Habits'}
                </button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
                    🧠 {isArabic ? 'تحليلات' : 'Insights'}
                </button>
            </div>

            {/* محتوى التبويبات */}
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
                                {/* بطاقة الالتزام */}
                                <div className="insight-card">
                                    <div className="insight-icon">📊</div>
                                    <div className="insight-content">
                                        <h3>{isArabic ? 'نسبة الالتزام بالأدوية' : 'Medication Adherence'}</h3>
                                        <div className="stat-value" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
                                            {data.medications.adherenceRate}%
                                        </div>
                                        <p className={`stat-trend ${data.medications.complianceLevel}`}>
                                            {data.medications.complianceMessage}
                                        </p>
                                        <div className="habit-stats" style={{ marginTop: '0.5rem' }}>
                                            <span>📅 {isArabic ? 'أطول سلسلة' : 'Longest streak'}: {data.medications.streak} {isArabic ? 'يوم' : 'days'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* قائمة الأدوية */}
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
                                                {med.medicationInfo?.genericName && (
                                                    <div className="med-generic">💊 {med.medicationInfo.genericName}</div>
                                                )}
                                                {med.medicationInfo?.manufacturer && (
                                                    <div className="med-manufacturer">🏭 {med.medicationInfo.manufacturer}</div>
                                                )}
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

                                {/* الأمراض المحتملة */}
                                {data.detectedConditions.length > 0 && (
                                    <div className="insight-card" style={{ background: 'var(--warning-bg)' }}>
                                        <div className="insight-icon">🩺</div>
                                        <div className="insight-content">
                                            <h3>{isArabic ? 'الأمراض المحتملة' : 'Potential Conditions'}</h3>
                                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                                {data.detectedConditions.map((cond, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--card-bg)', borderRadius: '8px' }}>
                                                        <span>🏥</span>
                                                        <span style={{ flex: 1 }}>{cond.name}</span>
                                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                                            {isArabic ? 'مزمن' : 'Chronic'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p style={{ fontSize: '0.7rem', marginTop: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                ⚠️ {isArabic ? 'هذه تقديرات بناءً على أدويتك، استشر طبيبك للتشخيص الدقيق' : 'These are estimates based on your medications, consult your doctor for accurate diagnosis'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* تبويب جميع العادات */}
                {activeTab === 'habits' && (
                    <div className="habits-section">
                        {data.otherHabits.length === 0 && data.medications.count === 0 ? (
                            <div className="analytics-empty">
                                <div className="empty-icon">📋</div>
                                <p>{isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded'}</p>
                            </div>
                        ) : (
                            <div className="habits-list">
                                {[...data.medications.list, ...data.otherHabits].map(habit => (
                                    <div key={habit.id} className="habit-card">
                                        <div className="habit-header">
                                            <span className="habit-name">
                                                {habit.type === 'medication' ? '💊 ' : 
                                                 habit.type === 'water' ? '💧 ' :
                                                 habit.type === 'exercise' ? '🏃 ' :
                                                 habit.type === 'sleep' ? '😴 ' : '📋 '}
                                                {habit.name}
                                            </span>
                                            <span className={`habit-rate ${habit.rate >= 70 ? 'high' : habit.rate >= 40 ? 'medium' : 'low'}`}>
                                                {habit.rate}%
                                            </span>
                                        </div>
                                        {habit.description && <p className="habit-desc">{habit.description}</p>}
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
                        )}
                    </div>
                )}

                {/* تبويب التحليلات */}
                {activeTab === 'insights' && (
                    <div className="insights-section">
                        {/* التنبؤات */}
                        {data.predictions.length > 0 && (
                            <div className="recommendations-section">
                                <h3>🔮 {isArabic ? 'تنبؤات وتنبيهات' : 'Predictions & Alerts'}</h3>
                                <div className="recommendations-list">
                                    {data.predictions.map((pred, i) => (
                                        <div key={i} className={`recommendation-card priority-${pred.severity === 'high' ? 'high' : pred.severity === 'medium' ? 'medium' : 'low'}`}>
                                            <div className="rec-header">
                                                <span className="rec-icon">{pred.icon}</span>
                                                <span className="rec-category">{pred.title}</span>
                                            </div>
                                            <p className="rec-message">{pred.description}</p>
                                            <div className="rec-advice">💡 {pred.suggestion}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* التوصيات */}
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

                        {/* نصائح سريعة */}
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

            {/* تذييل */}
            <div className="analytics-footer">
                <small>{isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(data.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small>
            </div>
        </div>
    );
};

export default HabitAnalytics;