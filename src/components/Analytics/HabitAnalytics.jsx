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
            // جلب بيانات العادات وسجلاتها
            const [habitsRes, logsRes] = await Promise.all([
                axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] }))
            ]);

            const habits = habitsRes.data || [];
            const logs = logsRes.data || [];

            // تحليل البيانات - استنتاج الأدوية من العادات تلقائياً
            const analysis = analyzeHabitsAndMedications(habits, logs);
            setData(analysis);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
        } finally {
            setLoading(false);
        }
    };

    // دالة لاستنتاج نوع العادة (دواء، عادة صحية، ماء، إلخ)
    const detectHabitType = (habitName, habitDescription = '') => {
        const text = (habitName + ' ' + habitDescription).toLowerCase();
        
        // كلمات تدل على أدوية
        const medicationKeywords = [
            'دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment',
            'pain', 'ibuprofen', 'aspirin', 'acetaminophen', 'paracetamol',
            'antibiotic', 'مضاد', 'مسكن', 'tylenol', 'advil', 'capsule',
            'tablet', 'injection', 'oxycodone', 'morphine', 'codeine',
            'mg', 'ml', 'dose', 'جرعة', 'ملجم'
        ];
        
        // كلمات تدل على ماء
        const waterKeywords = ['ماء', 'water', 'ترطيب', 'hydration', 'كوب', 'glass'];
        
        // كلمات تدل على رياضة
        const exerciseKeywords = ['رياضة', 'exercise', 'مشي', 'walk', 'جري', 'run', 'gym', 'تمارين'];
        
        // كلمات تدل على نوم
        const sleepKeywords = ['نوم', 'sleep', 'استرخاء', 'relax'];
        
        // كلمات تدل على تغذية
        const nutritionKeywords = ['طعام', 'food', 'غذاء', 'nutrition', 'وجبة', 'meal', 'فيتامين', 'vitamin'];
        
        if (medicationKeywords.some(k => text.includes(k))) return 'medication';
        if (waterKeywords.some(k => text.includes(k))) return 'water';
        if (exerciseKeywords.some(k => text.includes(k))) return 'exercise';
        if (sleepKeywords.some(k => text.includes(k))) return 'sleep';
        if (nutritionKeywords.some(k => text.includes(k))) return 'nutrition';
        
        return 'general';
    };

    // استخراج معلومات الدواء من النص
    const extractMedicationInfo = (habitName, habitDescription) => {
        const text = (habitName + ' ' + habitDescription).toLowerCase();
        
        // استخراج الاسم العلمي
        let genericName = '';
        const genericPatterns = [
            /الاسم العلمي[:\s]+([^|\n]+)/i,
            /generic[:\s]+([^|\n]+)/i,
            /acetaminophen/i, /ibuprofen/i, /aspirin/i, /oxycodone/i, /morphine/i
        ];
        
        for (const pattern of genericPatterns) {
            if (typeof pattern === 'string') {
                if (text.includes(pattern)) {
                    genericName = pattern.charAt(0).toUpperCase() + pattern.slice(1);
                    break;
                }
            } else {
                const match = text.match(pattern);
                if (match) {
                    genericName = match[1] || match[0];
                    break;
                }
            }
        }
        
        // استخراج الشركة المصنعة
        let manufacturer = '';
        const manufacturerPatterns = [/🏭[:\s]+([^|]+)/i, /manufacturer[:\s]+([^|]+)/i, /شركة[:\s]+([^|]+)/i];
        for (const pattern of manufacturerPatterns) {
            const match = habitDescription.match(pattern);
            if (match) {
                manufacturer = match[1].trim();
                break;
            }
        }
        
        // استخراج الجرعة
        let dosage = '';
        const dosagePatterns = /(\d+\s*(mg|ml|g|mcg))/i;
        const dosageMatch = text.match(dosagePatterns);
        if (dosageMatch) dosage = dosageMatch[0];
        
        return { genericName, manufacturer, dosage };
    };

    const analyzeHabitsAndMedications = (habits, logs) => {
        // تصنيف العادات
        const categorizedHabits = habits.map(habit => {
            const type = detectHabitType(habit.name, habit.description);
            const medicationInfo = type === 'medication' ? extractMedicationInfo(habit.name, habit.description) : null;
            
            // حساب إحصائيات العادة
            const habitLogs = logs.filter(log => log.habit === habit.id);
            const completed = habitLogs.filter(log => log.is_completed).length;
            const total = habitLogs.length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            // حساب السلسلة المتتالية
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
                frequency: habit.frequency || 'Daily'
            };
        });
        
        // فصل الأدوية عن العادات الأخرى
        const medications = categorizedHabits.filter(h => h.type === 'medication');
        const otherHabits = categorizedHabits.filter(h => h.type !== 'medication');
        
        // إحصائيات الأدوية
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
        
        // أطول سلسلة متتالية للأدوية
        medicationStats.overallStreak = Math.max(...medications.map(m => m.streak), 0);
        
        // اكتشاف الأمراض المحتملة بناءً على الأدوية
        const diseaseKeywords = {
            'diabetes': ['metformin', 'insulin', 'diabetes', 'سكري', 'glucophage'],
            'hypertension': ['lisinopril', 'amlodipine', 'hypertension', 'ضغط', 'losartan', 'atenolol'],
            'cholesterol': ['atorvastatin', 'simvastatin', 'cholesterol', 'كوليسترول', 'lipitor', 'crestor'],
            'pain': ['ibuprofen', 'aspirin', 'acetaminophen', 'pain', 'ألم', 'مسكن', 'tylenol', 'advil'],
            'infection': ['antibiotic', 'amoxicillin', 'infection', 'عدوى', 'مضاد حيوي'],
            'mental': ['sertraline', 'fluoxetine', 'depression', 'اكتئاب', 'prozac', 'zoloft'],
            'thyroid': ['levothyroxine', 'thyroid', 'غدة', 'synthroid'],
            'asthma': ['albuterol', 'asthma', 'ربو', 'inhaler']
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
                        'infection': isArabic ? 'عدوى' : 'Infection',
                        'mental': isArabic ? 'اضطراب نفسي' : 'Mental Health Condition',
                        'thyroid': isArabic ? 'اضطراب الغدة الدرقية' : 'Thyroid Disorder',
                        'asthma': isArabic ? 'الربو' : 'Asthma'
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
            complianceMessage = isArabic 
                ? 'التزام ممتاز! استمر في هذا المستوى الرائع'
                : 'Excellent adherence! Keep up this great level';
        } else if (medicationStats.adherenceRate >= 70) {
            complianceLevel = 'good';
            complianceMessage = isArabic 
                ? 'التزام جيد، يمكنك التحسن'
                : 'Good adherence, you can improve';
        } else if (medicationStats.adherenceRate >= 50) {
            complianceLevel = 'fair';
            complianceMessage = isArabic 
                ? 'التزام متوسط، حاول تحسين روتينك'
                : 'Fair adherence, try to improve your routine';
        } else {
            complianceLevel = 'poor';
            complianceMessage = isArabic 
                ? 'التزام منخفض، ننصح بضبط تذكيرات للأدوية'
                : 'Low adherence, consider setting medication reminders';
        }
        
        // التنبؤات
        const predictions = [];
        
        if (medicationStats.adherenceRate < 70 && medicationStats.totalLogs > 0) {
            predictions.push({
                icon: '⚠️',
                title: isArabic ? 'انخفاض الالتزام بالأدوية' : 'Low medication adherence',
                description: isArabic 
                    ? `التزامك بالأدوية ${medicationStats.adherenceRate}% فقط، قد يؤثر ذلك على فعالية العلاج`
                    : `Your medication adherence is only ${medicationStats.adherenceRate}%, which may affect treatment effectiveness`,
                severity: 'high',
                suggestion: isArabic 
                    ? 'اضبط تذكيراً يومياً لأخذ أدويتك في الوقت المحدد'
                    : 'Set a daily reminder to take your medications on time'
            });
        }
        
        if (medications.length > 0 && medicationStats.overallStreak === 0) {
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
        
        if (medicationStats.adherenceRate >= 90 && medicationStats.totalLogs > 5) {
            predictions.push({
                icon: '🌟',
                title: isArabic ? 'التزام ممتاز بالأدوية' : 'Excellent medication adherence',
                description: isArabic 
                    ? `التزامك ${medicationStats.adherenceRate}%، استمر بهذا المستوى الرائع`
                    : `Your adherence is ${medicationStats.adherenceRate}%, keep up this great level`,
                severity: 'positive',
                suggestion: isArabic 
                    ? 'أحسنت! استمر في هذا الالتزام الممتاز'
                    : 'Great job! Keep up this excellent adherence'
            });
        }
        
        // توصيات
        const recommendations = [];
        
        if (medicationStats.adherenceRate < 80 && medicationStats.totalLogs > 0) {
            recommendations.push({
                icon: '💊',
                title: isArabic ? 'تحسين الالتزام بالأدوية' : 'Improve medication adherence',
                advice: isArabic 
                    ? `التزامك الحالي ${medicationStats.adherenceRate}%. حاول ضبط تذكير يومي`
                    : `Your current adherence is ${medicationStats.adherenceRate}%. Try setting a daily reminder`,
                action: isArabic ? 'أضف تذكيراً للأدوية في الإعدادات' : 'Add medication reminders in settings'
            });
        }
        
        if (detectedConditions.length > 0) {
            recommendations.push({
                icon: '🩺',
                title: isArabic ? 'استشارة طبية موصى بها' : 'Medical consultation recommended',
                advice: isArabic 
                    ? `بناءً على أدويتك، يبدو أنك تعاني من ${detectedConditions.map(c => c.name).join(' و ')}. استشر طبيبك بانتظام`
                    : `Based on your medications, you may have ${detectedConditions.map(c => c.name).join(' and ')}. Consult your doctor regularly`,
                action: isArabic ? 'حدد موعداً مع طبيبك' : 'Schedule an appointment with your doctor'
            });
        }
        
        if (otherHabits.length === 0 && medications.length > 0) {
            recommendations.push({
                icon: '🌱',
                title: isArabic ? 'أضف عادات صحية' : 'Add healthy habits',
                advice: isArabic 
                    ? 'إضافة عادات صحية مثل شرب الماء أو المشي تحسن صحتك العامة'
                    : 'Adding healthy habits like drinking water or walking improves your overall health',
                action: isArabic ? 'أضف عادة جديدة' : 'Add a new habit'
            });
        }
        
        // نصائح سريعة
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
                    <div className="stat-value">{data.medications.adherenceRate}%</div>
                    <div className="stat-label">{isArabic ? 'نسبة الالتزام' : 'Adherence'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-value">{data.medications.streak}</div>
                    <div className="stat-label">{isArabic ? 'أيام متتالية' : 'Day streak'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{data.otherHabits.length + data.medications.count}</div>
                    <div className="stat-label">{isArabic ? 'إجمالي العادات' : 'Total habits'}</div>
                </div>
            </div>

            {/* تبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'medications' ? 'active' : ''} onClick={() => setActiveTab('medications')}>
                    💊 {isArabic ? 'الأدوية والالتزام' : 'Medications'}
                </button>
                <button className={activeTab === 'habits' ? 'active' : ''} onClick={() => setActiveTab('habits')}>
                    📋 {isArabic ? 'جميع العادات' : 'All Habits'}
                </button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
                    🧠 {isArabic ? 'تحليلات وتنبؤات' : 'Insights'}
                </button>
            </div>

            <div className="tab-content">
                {/* تبويب الأدوية */}
                {activeTab === 'medications' && (
                    <div className="medications-section">
                        {data.medications.count === 0 ? (
                            <div className="empty-state">
                                <span>💊</span>
                                <p>{isArabic ? 'لا توجد أدوية مسجلة' : 'No medications recorded'}</p>
                                <p className="empty-hint">{isArabic 
                                    ? 'يمكنك إضافة دواء عبر مسح الباركود أو البحث في قاعدة بيانات FDA'
                                    : 'You can add a medication by scanning a barcode or searching the FDA database'}</p>
                            </div>
                        ) : (
                            <>
                                <div className="compliance-card">
                                    <div className="compliance-circle" style={{
                                        background: `conic-gradient(#10b981 0% ${data.medications.adherenceRate}%, #e5e7eb ${data.medications.adherenceRate}% 100%)`
                                    }}>
                                        <span>{data.medications.adherenceRate}%</span>
                                    </div>
                                    <div className="compliance-info">
                                        <h4>{isArabic ? 'نسبة الالتزام بالأدوية' : 'Medication Adherence'}</h4>
                                        <p className={`compliance-message ${data.medications.complianceLevel}`}>
                                            {data.medications.complianceMessage}
                                        </p>
                                        <div className="streak-info">📅 {isArabic ? 'أطول سلسلة متتالية' : 'Longest streak'}: {data.medications.streak} {isArabic ? 'يوم' : 'days'}</div>
                                    </div>
                                </div>

                                <div className="medications-list">
                                    <h3>{isArabic ? 'قائمة الأدوية' : 'Medication List'}</h3>
                                    {data.medications.list.map(med => (
                                        <div key={med.id} className="medication-item">
                                            <div className="med-icon">💊</div>
                                            <div className="med-info">
                                                <div className="med-name">{med.name}</div>
                                                {med.medicationInfo?.genericName && (
                                                    <div className="med-generic">💊 {med.medicationInfo.genericName}</div>
                                                )}
                                                {med.medicationInfo?.manufacturer && (
                                                    <div className="med-manufacturer">🏭 {med.medicationInfo.manufacturer}</div>
                                                )}
                                                <div className="med-stats">
                                                    <span>✅ {med.completed}/{med.total}</span>
                                                    <span>📅 {med.streak} {isArabic ? 'يوم متتالي' : 'day streak'}</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${med.rate}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {data.detectedConditions.length > 0 && (
                                    <div className="conditions-card">
                                        <h3>🩺 {isArabic ? 'الأمراض المحتملة' : 'Potential Conditions'}</h3>
                                        <div className="conditions-list">
                                            {data.detectedConditions.map((cond, i) => (
                                                <div key={i} className="condition-item">
                                                    <span className="condition-icon">🏥</span>
                                                    <span className="condition-name">{cond.name}</span>
                                                    <span className={`condition-type ${cond.type}`}>
                                                        {cond.type === 'chronic' ? (isArabic ? 'مزمن' : 'Chronic') : (isArabic ? 'حاد' : 'Acute')}
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

                {/* تبويب جميع العادات */}
                {activeTab === 'habits' && (
                    <div className="habits-section">
                        {data.otherHabits.length === 0 && data.medications.count === 0 ? (
                            <div className="empty-state">
                                <span>📋</span>
                                <p>{isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded'}</p>
                            </div>
                        ) : (
                            <div className="habits-list">
                                {[...data.medications.list, ...data.otherHabits].map(habit => (
                                    <div key={habit.id} className="habit-card">
                                        <div className="habit-header">
                                            <span className="habit-name">
                                                {habit.type === 'medication' ? '💊 ' : ''}{habit.name}
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
                                {data.quickTips.map((tip, i) => (
                                    <li key={i}>{tip.icon} {tip.text}</li>
                                ))}
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
                .compliance-message { font-size: 0.85rem; margin: 8px 0; }
                .compliance-message.excellent { color: #10b981; }
                .compliance-message.good { color: #3b82f6; }
                .compliance-message.fair { color: #f59e0b; }
                .compliance-message.poor { color: #ef4444; }
                
                .medications-list, .habits-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
                .medication-item, .habit-card {
                    background: var(--secondary-bg);
                    border-radius: 12px;
                    padding: 12px;
                }
                .med-icon { font-size: 1.5rem; display: inline-block; margin-right: 10px; }
                .med-info { flex: 1; }
                .med-name { font-weight: 600; }
                .med-generic, .med-manufacturer { font-size: 0.7rem; color: var(--text-tertiary); }
                .med-stats { display: flex; gap: 12px; font-size: 0.7rem; color: var(--text-tertiary); margin: 8px 0; }
                .progress-bar { background: var(--border-light); border-radius: 10px; height: 4px; overflow: hidden; }
                .progress-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #667eea, #764ba2); }
                
                .habit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                .habit-rate { font-weight: bold; }
                .habit-rate.high { color: #10b981; }
                .habit-rate.medium { color: #f59e0b; }
                .habit-rate.low { color: #ef4444; }
                .habit-desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px; }
                .habit-stats { display: flex; gap: 12px; font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 8px; }
                
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
                .conditions-note { font-size: 0.7rem; margin-top: 12px; color: var(--text-tertiary); }
                
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
                .empty-hint { font-size: 0.8rem; margin-top: 8px; color: var(--text-tertiary); }
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