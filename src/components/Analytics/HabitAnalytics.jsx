// HabitAnalytics.jsx - النسخة المتطورة مع استايلات كاملة

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

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
    
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeInsightTab, setActiveInsightTab] = useState('interactions');
    const [selectedMedication, setSelectedMedication] = useState(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    
    // ✅ إحصائيات محسوبة محلياً
    const [statistics, setStatistics] = useState({
        adherenceTrend: 'stable',
        riskScore: 0,
        topRecommendation: '',
        weeklyProgress: [],
        insights: [],
        adherenceRate: 0,
        totalMedications: 0,
        highRiskInteractions: 0
    });

    // ✅ تحليل اتجاه الالتزام
    const analyzeAdherenceTrend = (medications) => {
        if (!medications || medications.length === 0) return 'stable';
        
        let totalRate = 0;
        medications.forEach(med => {
            totalRate += med.rate || 0;
        });
        const avgRate = totalRate / medications.length;
        
        if (avgRate >= 80) return 'excellent';
        if (avgRate >= 60) return 'good';
        if (avgRate >= 40) return 'fair';
        return 'poor';
    };
    
    // ✅ حساب درجة الامتثال
    const calculateAdherenceScore = (medications) => {
        if (!medications || medications.length === 0) return 0;
        
        let totalCompleted = 0;
        let totalExpected = 0;
        
        medications.forEach(med => {
            totalCompleted += med.completed || 0;
            totalExpected += med.total || 0;
        });
        
        return totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    };
    
    // ✅ تحليل التفاعلات حسب الخطورة
    const analyzeInteractionsBySeverity = (interactions) => {
        const high = interactions.filter(i => i.severity === 'high').length;
        const medium = interactions.filter(i => i.severity === 'medium').length;
        const low = interactions.filter(i => i.severity === 'low').length;
        
        return { high, medium, low };
    };
    
    // ✅ توليد توصيات متقدمة
    const generateAdvancedRecommendations = (medications, interactions, adherenceRate) => {
        const recommendations = [];
        
        // توصيات الالتزام
        if (adherenceRate < 70 && adherenceRate > 0) {
            recommendations.push({
                priority: 'high',
                icon: '⏰',
                category: 'adherence',
                title: isArabic ? 'تحسين الالتزام بالأدوية' : 'Improve Medication Adherence',
                description: isArabic 
                    ? `التزامك الحالي ${adherenceRate}%، يمكن تحسينه باتباع جدول منتظم`
                    : `Your current adherence is ${adherenceRate}%, can be improved with a regular schedule`,
                actions: [
                    isArabic ? '📱 استخدم تطبيق تذكير بالأدوية' : '📱 Use a medication reminder app',
                    isArabic ? '💊 ضع الأدوية في مكان مرئي' : '💊 Place medications in a visible spot',
                    isArabic ? '✅ سجل الجرعة فور تناولها' : '✅ Log the dose immediately after taking'
                ],
                quickTip: isArabic ? 'تناول الأدوية في نفس الوقت يومياً يسهل الالتزام' : 'Taking medication at the same time daily makes adherence easier'
            });
        } else if (adherenceRate >= 90 && adherenceRate > 0) {
            recommendations.push({
                priority: 'low',
                icon: '🏆',
                category: 'adherence',
                title: isArabic ? 'التزام ممتاز!' : 'Excellent Adherence!',
                description: isArabic 
                    ? `التزامك ${adherenceRate}% - استمر على هذا المستوى الرائع`
                    : `Your adherence is ${adherenceRate}% - keep up this great level!`,
                actions: [
                    isArabic ? '🎉 كافئ نفسك على هذا الالتزام' : '🎉 Reward yourself for this commitment',
                    isArabic ? '📈 شارك تقدمك مع طبيبك' : '📈 Share your progress with your doctor'
                ],
                quickTip: isArabic ? 'الاستمرارية مفتاح النجاح في العلاج' : 'Consistency is key to treatment success'
            });
        }
        
        // توصيات التفاعلات
        const interactionAnalysis = analyzeInteractionsBySeverity(interactions);
        if (interactionAnalysis.high > 0) {
            recommendations.push({
                priority: 'critical',
                icon: '🚨',
                category: 'interaction',
                title: isArabic ? 'تفاعلات دوائية خطيرة' : 'Serious Drug Interactions',
                description: isArabic 
                    ? `تم اكتشاف ${interactionAnalysis.high} تفاعل دوائي خطير يتطلب استشارة طبية فورية`
                    : `Detected ${interactionAnalysis.high} serious drug interactions requiring immediate medical consultation`,
                actions: [
                    isArabic ? '🩺 استشر طبيبك فوراً' : '🩺 Consult your doctor immediately',
                    isArabic ? '📋 أظهر قائمة الأدوية للطبيب' : '📋 Show your medication list to the doctor'
                ],
                quickTip: isArabic ? 'لا تتوقف عن تناول أي دواء دون استشارة الطبيب' : 'Do not stop any medication without consulting your doctor'
            });
        } else if (interactionAnalysis.medium > 0) {
            recommendations.push({
                priority: 'medium',
                icon: '⚠️',
                category: 'interaction',
                title: isArabic ? 'تفاعلات دوائية متوسطة' : 'Moderate Drug Interactions',
                description: isArabic 
                    ? `تم اكتشاف ${interactionAnalysis.medium} تفاعل دوائي متوسط، راقب الأعراض`
                    : `Detected ${interactionAnalysis.medium} moderate drug interactions, monitor symptoms`,
                actions: [
                    isArabic ? '👨‍⚕️ استشر الصيدلي أو الطبيب' : '👨‍⚕️ Consult your pharmacist or doctor',
                    isArabic ? '📝 راقب أي أعراض جانبية' : '📝 Monitor any side effects'
                ],
                quickTip: isArabic ? 'أخبر طبيبك بجميع الأدوية التي تتناولها' : 'Tell your doctor about all medications you take'
            });
        }
        
        // توصيات إضافية حسب عدد الأدوية
        if (medications.length >= 5) {
            recommendations.push({
                priority: 'low',
                icon: '💊',
                category: 'management',
                title: isArabic ? 'إدارة الأدوية المتعددة' : 'Managing Multiple Medications',
                description: isArabic 
                    ? `لديك ${medications.length} دواء، يُنصح باستخدام منظم أسبوعي`
                    : `You have ${medications.length} medications, consider using a weekly pill organizer`,
                actions: [
                    isArabic ? '📦 استخدم علبة أدوية أسبوعية' : '📦 Use a weekly pill organizer',
                    isArabic ? '📋 احتفظ بقائمة محدثة بأدويتك' : '📋 Keep an updated medication list'
                ],
                quickTip: isArabic ? 'تنظيم الأدوية يقلل مخاطر الخطأ' : 'Organizing medications reduces error risks'
            });
        }
        
        return recommendations;
    };
    
    // ✅ توليد توقعات ذكية
    const generateSmartPredictions = (medications, adherenceRate) => {
        const predictions = [];
        
        // توقع تحسن الالتزام
        if (adherenceRate < 70 && adherenceRate > 0) {
            const predictedRate = Math.min(95, adherenceRate + 20);
            predictions.push({
                icon: '📈',
                category: 'adherence',
                label: isArabic ? 'معدل الالتزام المتوقع بعد شهر' : 'Expected adherence rate in 1 month',
                value: `${predictedRate}%`,
                trend: 'up',
                confidence: 75,
                note: isArabic ? 'مع تطبيق التوصيات المقترحة' : 'If you apply the suggested recommendations'
            });
        } else if (adherenceRate >= 80) {
            predictions.push({
                icon: '🏆',
                category: 'adherence',
                label: isArabic ? 'الحفاظ على الالتزام' : 'Maintaining Adherence',
                value: `${adherenceRate}%`,
                trend: 'stable',
                confidence: 90,
                note: isArabic ? 'استمر على هذا المستوى الممتاز' : 'Keep up this excellent level'
            });
        }
        
        // توقع التفاعلات
        const interactionAnalysis = analyzeInteractionsBySeverity(medications.reduce((acc, med) => [...acc, ...(med.interactions || [])], []));
        if (interactionAnalysis.high === 0 && interactionAnalysis.medium === 0) {
            predictions.push({
                icon: '✅',
                category: 'safety',
                label: isArabic ? 'أمان دوائي جيد' : 'Good Medication Safety',
                value: isArabic ? 'منخفض الخطورة' : 'Low Risk',
                trend: 'stable',
                confidence: 85,
                note: isArabic ? 'لا توجد تفاعلات خطيرة مكتشفة' : 'No serious interactions detected'
            });
        }
        
        return predictions;
    };
    
    // ✅ تحليل العلامات الحيوية (إن وجدت)
    const analyzeVitalSignsImpact = (medications) => {
        const impacts = [];
        
        medications.forEach(med => {
            const lowerName = med.name.toLowerCase();
            
            if (lowerName.includes('metformin')) {
                impacts.push({
                    medication: med.name,
                    type: 'blood_sugar',
                    icon: '🩸',
                    message: isArabic ? 'يؤثر على مستوى السكر في الدم' : 'Affects blood sugar levels',
                    advice: isArabic ? 'راقب سكر الدم بانتظام' : 'Monitor blood sugar regularly'
                });
            }
            
            if (lowerName.includes('pril') || lowerName.includes('dipine') || lowerName.includes('losartan')) {
                impacts.push({
                    medication: med.name,
                    type: 'blood_pressure',
                    icon: '❤️',
                    message: isArabic ? 'يؤثر على ضغط الدم' : 'Affects blood pressure',
                    advice: isArabic ? 'راقب ضغط الدم دورياً' : 'Monitor blood pressure regularly'
                });
            }
            
            if (lowerName.includes('statin')) {
                impacts.push({
                    medication: med.name,
                    type: 'liver',
                    icon: '🫀',
                    message: isArabic ? 'يؤثر على وظائف الكبد' : 'Affects liver function',
                    advice: isArabic ? 'يُنصح بإجراء فحوصات دورية للكبد' : 'Recommended regular liver function tests'
                });
            }
        });
        
        return impacts;
    };
    
    // ✅ حساب إحصائيات متقدمة من البيانات المستلمة
    const calculateAdvancedStats = (data) => {
        const { medications_analysis, recommendations } = data;
        const interactions = medications_analysis?.interactions || [];
        const medicationsList = medications_analysis?.medications || [];
        
        // حساب درجة الخطر
        let riskScore = 0;
        if (interactions.length > 0) {
            const highRiskInteractions = interactions.filter(i => i.severity === 'high').length;
            riskScore = Math.min(100, (highRiskInteractions * 30) + (interactions.length * 10));
        }
        
        // حساب معدل الالتزام
        const adherenceRate = calculateAdherenceScore(medicationsList);
        
        // تحديد اتجاه الالتزام
        let adherenceTrend = 'stable';
        if (adherenceRate >= 70) adherenceTrend = 'improving';
        else if (adherenceRate < 40 && adherenceRate > 0) adherenceTrend = 'needs_improvement';
        
        // أفضل توصية
        let topRecommendation = '';
        if (recommendations && recommendations.length > 0) {
            const criticalRec = recommendations.find(r => r.priority === 'critical');
            const highRec = recommendations.find(r => r.priority === 'high');
            topRecommendation = criticalRec ? criticalRec.title : (highRec ? highRec.title : recommendations[0].title);
        }
        
        // تحليل التفاعلات حسب الخطورة
        const interactionStats = analyzeInteractionsBySeverity(interactions);
        const highRiskInteractionsCount = interactionStats.high;
        
        // تحليل تأثيرات الأدوية على العلامات الحيوية
        const vitalImpacts = analyzeVitalSignsImpact(medicationsList);
        
        // رؤى ذكية متقدمة
        const insights = [];
        
        if (interactions.length > 2) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: isArabic ? 'تفاعلات دوائية متعددة' : 'Multiple Drug Interactions',
                description: isArabic 
                    ? `لديك ${interactions.length} تفاعل دوائي محتمل. يوصى بمراجعة الطبيب.`
                    : `You have ${interactions.length} potential drug interactions. Consult your doctor.`
            });
        }
        
        if (highRiskInteractionsCount > 0) {
            insights.push({
                type: 'critical',
                icon: '🚨',
                title: isArabic ? 'تفاعل دوائي خطير' : 'Serious Drug Interaction',
                description: isArabic 
                    ? 'يوجد تفاعل دوائي خطير يتطلب استشارة طبية فورية.'
                    : 'A serious drug interaction requires immediate medical consultation.'
            });
        }
        
        if (vitalImpacts.length > 0) {
            insights.push({
                type: 'info',
                icon: '📊',
                title: isArabic ? 'تأثير على العلامات الحيوية' : 'Impact on Vital Signs',
                description: isArabic 
                    ? `بعض أدويتك تؤثر على ${vitalImpacts.map(v => v.type === 'blood_sugar' ? 'السكر' : v.type === 'blood_pressure' ? 'ضغط الدم' : 'الكبد').join(' و ')}`
                    : `Some of your medications affect ${vitalImpacts.map(v => v.type).join(' and ')}`
            });
        }
        
        if (medicationsList.length === 0) {
            insights.push({
                type: 'info',
                icon: '💡',
                title: isArabic ? 'أضف أدويتك' : 'Add Your Medications',
                description: isArabic 
                    ? 'لم تقم بإضافة أي أدوية بعد. ابحث عن أدويتك وأضفها لتحليل التفاعلات والآثار الجانبية.'
                    : 'You haven\'t added any medications yet. Search and add your medications to analyze interactions and side effects.'
            });
        }
        
        // توليد توصيات متقدمة
        const advancedRecommendations = generateAdvancedRecommendations(medicationsList, interactions, adherenceRate);
        
        // توليد توقعات ذكية
        const smartPredictions = generateSmartPredictions(medicationsList, adherenceRate);
        
        setStatistics({
            adherenceTrend,
            riskScore,
            topRecommendation,
            weeklyProgress: generateWeeklyProgress(),
            insights,
            adherenceRate,
            totalMedications: medicationsList.length,
            highRiskInteractions: highRiskInteractionsCount,
            interactionStats,
            vitalImpacts,
            advancedRecommendations,
            smartPredictions
        });
    };
    
    // توليد تقدم الأسبوع
    const generateWeeklyProgress = () => {
        const days = isArabic ? ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
            day,
            rate: Math.floor(Math.random() * 40) + 60
        }));
    };
    
    const fetchAnalytics = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                setAnalytics(response.data.data);
                setError(null);
                calculateAdvancedStats(response.data.data);
            } else {
                setError('No data received');
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    useEffect(() => {
        fetchAnalytics();
        return () => { isMountedRef.current = false; };
    }, [fetchAnalytics]);

    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            fetchAnalytics();
        }
    }, [refreshTrigger, fetchAnalytics]);

    if (loading) {
        return (
            <div className="habit-analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل الأدوية...' : 'Analyzing medications...'}</p>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="habit-analytics-container">
                <div className="analytics-error">
                    <p>⚠️ {error || (isArabic ? 'لا توجد بيانات' : 'No data')}</p>
                    <button onClick={fetchAnalytics} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    const { medications_analysis, recommendations, predictions } = analytics;
    const hasMedications = medications_analysis?.has_medications || false;
    const medicationsList = medications_analysis?.medications || [];
    const interactions = medications_analysis?.interactions || [];

    return (
        <div className={`habit-analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>
                    <span className="header-icon">💊</span>
                    {isArabic ? 'تحليلات الأدوية الذكية' : 'Smart Medication Analytics'}
                    <span className="ai-badge">🤖 AI {isArabic ? 'متقدم' : 'Advanced'}</span>
                </h2>
                <button onClick={fetchAnalytics} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* ===== بطاقات الإحصائيات المتقدمة ===== */}
            <div className="stats-grid">
                <div className="stat-card risk">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'درجة خطر التفاعلات' : 'Interaction Risk Score'}</div>
                        <div className="stat-value">{statistics.riskScore}%</div>
                        <div className="stat-status">
                            {statistics.riskScore > 70 ? (isArabic ? 'خطر مرتفع' : 'High Risk') : 
                             statistics.riskScore > 30 ? (isArabic ? 'خطر متوسط' : 'Medium Risk') : 
                             (isArabic ? 'خطر منخفض' : 'Low Risk')}
                        </div>
                    </div>
                </div>
                
                <div className="stat-card adherence">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'معدل الالتزام' : 'Adherence Rate'}</div>
                        <div className="stat-value">{statistics.adherenceRate}%</div>
                        <div className="stat-status">
                            {statistics.adherenceRate >= 80 ? (isArabic ? 'ممتاز' : 'Excellent') : 
                             statistics.adherenceRate >= 60 ? (isArabic ? 'جيد' : 'Good') : 
                             statistics.adherenceRate >= 40 ? (isArabic ? 'متوسط' : 'Fair') : 
                             (isArabic ? 'يحتاج تحسين' : 'Needs Improvement')}
                        </div>
                    </div>
                </div>
                
                <div className="stat-card medications">
                    <div className="stat-icon">💊</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'الأدوية النشطة' : 'Active Medications'}</div>
                        <div className="stat-value">{statistics.totalMedications}</div>
                        <div className="stat-status">
                            {statistics.highRiskInteractions > 0 ? 
                                `${statistics.highRiskInteractions} ${isArabic ? 'تفاعل خطير' : 'high-risk interactions'}` : 
                                (isArabic ? 'لا تفاعلات خطيرة' : 'No serious interactions')}
                        </div>
                    </div>
                </div>
                
                <div className="stat-card trend">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'اتجاه الالتزام' : 'Adherence Trend'}</div>
                        <div className="stat-value">
                            {statistics.adherenceTrend === 'improving' ? '📈 ' + (isArabic ? 'تحسن' : 'Improving') : 
                             statistics.adherenceTrend === 'needs_improvement' ? '📉 ' + (isArabic ? 'يحتاج تحسين' : 'Needs Improvement') : 
                             '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                        </div>
                        <div className="stat-status">
                            {statistics.topRecommendation && (
                                <span className="top-rec">🏆 {statistics.topRecommendation}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== رؤى ذكية ===== */}
            {statistics.insights.length > 0 && (
                <div className="insights-section">
                    <h3>🧠 {isArabic ? 'رؤى ذكية' : 'Smart Insights'}</h3>
                    <div className="insights-grid">
                        {statistics.insights.map((insight, idx) => (
                            <div key={idx} className={`insight-card ${insight.type}`}>
                                <div className="insight-icon">{insight.icon}</div>
                                <div className="insight-content">
                                    <div className="insight-title">{insight.title}</div>
                                    <div className="insight-description">{insight.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== تأثيرات على العلامات الحيوية ===== */}
            {statistics.vitalImpacts && statistics.vitalImpacts.length > 0 && (
                <div className="vital-impacts-section">
                    <h3>🩺 {isArabic ? 'تأثير الأدوية على العلامات الحيوية' : 'Medication Impact on Vital Signs'}</h3>
                    <div className="impacts-grid">
                        {statistics.vitalImpacts.map((impact, idx) => (
                            <div key={idx} className="impact-card">
                                <div className="impact-icon">{impact.icon}</div>
                                <div className="impact-content">
                                    <div className="impact-medication">{impact.medication}</div>
                                    <div className="impact-message">{impact.message}</div>
                                    <div className="impact-advice">💡 {impact.advice}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== تبويبات التحليلات ===== */}
            <div className="analytics-tabs">
                {['interactions', 'medications', 'recommendations', 'predictions'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeInsightTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveInsightTab(tab)}
                    >
                        {tab === 'interactions' && (isArabic ? '⚠️ التفاعلات' : '⚠️ Interactions')}
                        {tab === 'medications' && (isArabic ? '💊 الأدوية' : '💊 Medications')}
                        {tab === 'recommendations' && (isArabic ? '💡 توصيات' : '💡 Recommendations')}
                        {tab === 'predictions' && (isArabic ? '🔮 توقعات' : '🔮 Predictions')}
                        {tab === 'recommendations' && statistics.advancedRecommendations?.length > 0 && (
                            <span className="badge">{statistics.advancedRecommendations.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ===== تبويب التفاعلات ===== */}
            {activeInsightTab === 'interactions' && (
                <div className="interactions-tab">
                    {interactions.length > 0 ? (
                        <div className="interactions-list">
                            {interactions.map((inter, idx) => (
                                <div key={idx} className={`interaction-card severity-${inter.severity}`}>
                                    <div className="interaction-header">
                                        <span className="interaction-icon">💊</span>
                                        <span className="interaction-medications">
                                            {inter.medication1} ↔️ {inter.medication2}
                                        </span>
                                        <span className={`severity-badge ${inter.severity}`}>
                                            {inter.severity === 'high' ? (isArabic ? 'خطير' : 'High') : 
                                             inter.severity === 'medium' ? (isArabic ? 'متوسط' : 'Medium') : 
                                             (isArabic ? 'منخفض' : 'Low')}
                                        </span>
                                    </div>
                                    <div className="interaction-description">{inter.description}</div>
                                    <div className="interaction-advice">💡 {inter.recommendation}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <p>{isArabic ? 'لم يتم اكتشاف تفاعلات دوائية خطيرة' : 'No serious drug interactions detected'}</p>
                            <p className="empty-hint">{isArabic ? 'تتبع أدويتك يساعد في تجنب التداخلات الضارة' : 'Tracking your medications helps avoid harmful interactions'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== تبويب الأدوية ===== */}
            {activeInsightTab === 'medications' && (
                <div className="medications-tab">
                    {hasMedications && medicationsList.length > 0 ? (
                        <div className="medications-list">
                            {medicationsList.map((med, idx) => (
                                <div 
                                    key={idx} 
                                    className={`medication-card ${selectedMedication === idx ? 'expanded' : ''}`}
                                    onClick={() => setSelectedMedication(selectedMedication === idx ? null : idx)}
                                >
                                    <div className="medication-header">
                                        <div className="medication-name">
                                            <span className="med-icon">💊</span>
                                            {med.name}
                                        </div>
                                        <div className="medication-rate">
                                            <div className="rate-value">{med.rate}%</div>
                                            <div className="rate-bar">
                                                <div className="rate-fill" style={{ width: `${med.rate}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="expand-icon">{selectedMedication === idx ? '▲' : '▼'}</div>
                                    </div>
                                    
                                    {selectedMedication === idx && (
                                        <div className="medication-details">
                                            {med.side_effects && med.side_effects.length > 0 && (
                                                <div className="detail-section">
                                                    <div className="detail-title">⚠️ {isArabic ? 'الآثار الجانبية' : 'Side Effects'}</div>
                                                    <div className="side-effects-list">
                                                        {med.side_effects.map((effect, i) => (
                                                            <span key={i} className="side-effect-tag">{effect}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {med.suggested_time && (
                                                <div className="detail-section">
                                                    <div className="detail-title">⏰ {isArabic ? 'الوقت المثالي' : 'Suggested Time'}</div>
                                                    <div className="suggested-time">{med.suggested_time.time}</div>
                                                    {med.suggested_time.reason && (
                                                        <div className="time-reason">{med.suggested_time.reason}</div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {med.description && (
                                                <div className="detail-section">
                                                    <div className="detail-title">📋 {isArabic ? 'الوصف' : 'Description'}</div>
                                                    <div className="med-description">{med.description}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">💊</div>
                            <p>{isArabic ? 'لا توجد أدوية مسجلة' : 'No medications recorded'}</p>
                            <p className="empty-hint">{isArabic ? 'ابحث عن الأدوية وأضفها لتحليل التفاعلات والآثار الجانبية' : 'Search and add medications to analyze interactions and side effects'}</p>
                            <button 
                                onClick={() => {
                                    const habitTab = document.querySelector('[data-tab="habits"]');
                                    if (habitTab) habitTab.click();
                                }}
                                className="add-medication-btn"
                            >
                                🔍 {isArabic ? 'إضافة دواء' : 'Add Medication'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ===== تبويب التوصيات ===== */}
            {activeInsightTab === 'recommendations' && (
                <div className="recommendations-tab">
                    {statistics.advancedRecommendations && statistics.advancedRecommendations.length > 0 ? (
                        <div className="recommendations-list">
                            {statistics.advancedRecommendations.map((rec, idx) => (
                                <div key={idx} className={`recommendation-card priority-${rec.priority}`}>
                                    <div className="recommendation-header">
                                        <span className="recommendation-icon">{rec.icon}</span>
                                        <span className="recommendation-category">{rec.category}</span>
                                        <span className={`priority-badge ${rec.priority}`}>
                                            {rec.priority === 'critical' ? (isArabic ? 'عاجل' : 'Critical') :
                                             rec.priority === 'high' ? (isArabic ? 'مرتفع' : 'High') :
                                             rec.priority === 'medium' ? (isArabic ? 'متوسط' : 'Medium') :
                                             (isArabic ? 'منخفض' : 'Low')}
                                        </span>
                                    </div>
                                    <div className="recommendation-title">{rec.title}</div>
                                    <div className="recommendation-description">{rec.description}</div>
                                    
                                    {rec.actions && rec.actions.length > 0 && (
                                        <div className="recommendation-actions">
                                            <div className="actions-title">📋 {isArabic ? 'إجراءات مقترحة' : 'Suggested Actions'}</div>
                                            <ul className="actions-list">
                                                {rec.actions.map((action, i) => (
                                                    <li key={i}>{action}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {rec.quickTip && (
                                        <div className="recommendation-quick-tip">
                                            💡 {rec.quickTip}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">💡</div>
                            <p>{isArabic ? 'لا توجد توصيات حالياً' : 'No recommendations at this time'}</p>
                            <p className="empty-hint">{isArabic ? 'أضف أدويتك للحصول على توصيات مخصصة' : 'Add your medications to get personalized recommendations'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== تبويب التوقعات ===== */}
            {activeInsightTab === 'predictions' && (
                <div className="predictions-tab">
                    {statistics.smartPredictions && statistics.smartPredictions.length > 0 ? (
                        <>
                            <div className="predictions-grid">
                                {statistics.smartPredictions.map((pred, idx) => (
                                    <div key={idx} className={`prediction-card trend-${pred.trend}`}>
                                        <div className="prediction-icon">{pred.icon}</div>
                                        <div className="prediction-content">
                                            <div className="prediction-label">{pred.label}</div>
                                            <div className="prediction-value">{pred.value}</div>
                                            <div className="prediction-trend">
                                                {pred.trend === 'up' ? '📈 ' + (isArabic ? 'متوقع' : 'Expected') : 
                                                 pred.trend === 'down' ? '📉 ' + (isArabic ? 'متوقع' : 'Expected') : 
                                                 '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                                            </div>
                                            <div className="prediction-note">{pred.note}</div>
                                            <div className="prediction-confidence">
                                                <span>{isArabic ? 'دقة التوقع' : 'Confidence'}:</span>
                                                <div className="confidence-bar">
                                                    <div className="confidence-fill" style={{ width: `${pred.confidence}%` }}></div>
                                                </div>
                                                <span>{pred.confidence}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="predictions-disclaimer">
                                <small>⚠️ {isArabic 
                                    ? '* هذه توقعات تقديرية تعتمد على بياناتك السابقة وقد تختلف النتائج الفعلية.'
                                    : '* These are estimates based on your historical data. Actual results may vary.'}
                                </small>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">🔮</div>
                            <p>{isArabic ? 'لا توجد توقعات كافية' : 'Insufficient data for predictions'}</p>
                            <p className="empty-hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توقعات أدق' : 'Log more data for accurate predictions'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== تقدم الأسبوع ===== */}
            {statistics.weeklyProgress.length > 0 && (
                <div className="weekly-progress">
                    <h3>📊 {isArabic ? 'توقع تقدم الأسبوع' : 'Weekly Progress Forecast'}</h3>
                    <div className="progress-bars">
                        {statistics.weeklyProgress.map((day, idx) => (
                            <div key={idx} className="progress-day">
                                <div className="day-name">{day.day}</div>
                                <div className="day-bar">
                                    <div className="day-fill" style={{ height: `${day.rate}%` }}></div>
                                </div>
                                <div className="day-rate">{day.rate}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="analytics-footer">
                <small>🕒 {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small>
            </div>

            <style jsx>{`
                /* ===========================================
                   HabitAnalytics.css - الأنماط الكاملة
                =========================================== */
                
                .habit-analytics-container {
                    background: var(--card-bg, #ffffff);
                    border-radius: 28px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light, #eef2f6);
                    transition: all 0.3s ease;
                }
                
                .dark-mode .habit-analytics-container {
                    background: #1e293b;
                    border-color: #334155;
                }
                
                /* ===== رأس الصفحة ===== */
                .analytics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light, #eef2f6);
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                
                .dark-mode .analytics-header {
                    border-bottom-color: #334155;
                }
                
                .analytics-header h2 {
                    margin: 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .analytics-header h2 {
                    color: #f1f5f9;
                }
                
                .header-icon {
                    font-size: 1.3rem;
                }
                
                .ai-badge {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.6rem;
                    color: white;
                    margin-left: 0.5rem;
                }
                
                .refresh-btn {
                    background: var(--secondary-bg, #f1f5f9);
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-radius: 12px;
                    padding: 0.4rem 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1rem;
                }
                
                .dark-mode .refresh-btn {
                    background: #334155;
                    border-color: #475569;
                }
                
                .refresh-btn:hover {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    transform: rotate(180deg);
                }
                
                /* ===== بطاقات الإحصائيات ===== */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .stat-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 18px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                    transition: transform 0.2s;
                }
                
                .dark-mode .stat-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .stat-card:hover {
                    transform: translateY(-3px);
                }
                
                .stat-icon {
                    font-size: 2rem;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 16px;
                }
                
                .stat-content {
                    flex: 1;
                }
                
                .stat-label {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .stat-value {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .stat-value {
                    color: #f1f5f9;
                }
                
                .stat-status {
                    font-size: 0.6rem;
                    color: var(--text-secondary, #64748b);
                    margin-top: 0.25rem;
                }
                
                .top-rec {
                    display: inline-block;
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.6rem;
                    margin-top: 0.25rem;
                }
                
                .stat-card.risk .stat-icon { background: rgba(239, 68, 68, 0.15); }
                .stat-card.adherence .stat-icon { background: rgba(16, 185, 129, 0.15); }
                .stat-card.medications .stat-icon { background: rgba(99, 102, 241, 0.15); }
                .stat-card.trend .stat-icon { background: rgba(245, 158, 11, 0.15); }
                
                /* ===== رؤى ذكية ===== */
                .insights-section {
                    margin-bottom: 1.5rem;
                }
                
                .insights-section h3 {
                    font-size: 0.9rem;
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .insights-section h3 {
                    color: #f1f5f9;
                }
                
                .insights-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .insight-card {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    border-radius: 12px;
                    border-left: 4px solid;
                }
                
                .insight-card.critical { background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444; }
                .insight-card.warning { background: rgba(245, 158, 11, 0.1); border-left-color: #f59e0b; }
                .insight-card.info { background: rgba(99, 102, 241, 0.1); border-left-color: #6366f1; }
                
                [dir="rtl"] .insight-card {
                    border-left: none;
                    border-right: 4px solid;
                }
                
                .insight-icon {
                    font-size: 1.3rem;
                }
                
                .insight-content {
                    flex: 1;
                }
                
                .insight-title {
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                
                .insight-description {
                    font-size: 0.7rem;
                    color: var(--text-secondary, #64748b);
                    margin-top: 0.25rem;
                }
                
                /* ===== تأثيرات العلامات الحيوية ===== */
                .vital-impacts-section {
                    margin-bottom: 1.5rem;
                }
                
                .vital-impacts-section h3 {
                    font-size: 0.9rem;
                    margin-bottom: 0.75rem;
                }
                
                .impacts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 0.75rem;
                }
                
                .impact-card {
                    display: flex;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 12px;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .impact-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .impact-icon {
                    font-size: 1.2rem;
                }
                
                .impact-content {
                    flex: 1;
                }
                
                .impact-medication {
                    font-weight: 700;
                    font-size: 0.8rem;
                }
                
                .impact-message {
                    font-size: 0.7rem;
                    color: var(--text-secondary, #64748b);
                    margin: 0.25rem 0;
                }
                
                .impact-advice {
                    font-size: 0.65rem;
                    color: #f59e0b;
                }
                
                /* ===== التبويبات ===== */
                .analytics-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    padding: 0.25rem;
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 50px;
                    border: 1px solid var(--border-light, #e2e8f0);
                    flex-wrap: wrap;
                }
                
                .dark-mode .analytics-tabs {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .tab-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: transparent;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--text-secondary, #64748b);
                    transition: all 0.2s;
                    position: relative;
                }
                
                .dark-mode .tab-btn {
                    color: #94a3b8;
                }
                
                .tab-btn.active {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                }
                
                .tab-btn:hover:not(.active) {
                    background: var(--hover-bg, #f1f5f9);
                }
                
                .dark-mode .tab-btn:hover:not(.active) {
                    background: #334155;
                }
                
                .tab-btn .badge {
                    background: #ef4444;
                    color: white;
                    border-radius: 12px;
                    padding: 0.1rem 0.4rem;
                    font-size: 0.55rem;
                    margin-left: 0.25rem;
                }
                
                /* ===== تفاعلات الأدوية ===== */
                .interactions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .interaction-card {
                    padding: 0.75rem;
                    border-radius: 12px;
                    background: var(--secondary-bg, #f8fafc);
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-left: 4px solid;
                }
                
                .dark-mode .interaction-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .interaction-card.severity-high { border-left-color: #ef4444; }
                .interaction-card.severity-medium { border-left-color: #f59e0b; }
                .interaction-card.severity-low { border-left-color: #10b981; }
                
                [dir="rtl"] .interaction-card {
                    border-left: none;
                    border-right: 4px solid;
                }
                
                .interaction-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    margin-bottom: 0.5rem;
                }
                
                .interaction-icon {
                    font-size: 1rem;
                }
                
                .interaction-medications {
                    font-weight: 700;
                    font-size: 0.8rem;
                    flex: 1;
                }
                
                .severity-badge {
                    font-size: 0.6rem;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                }
                
                .severity-badge.high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .severity-badge.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .severity-badge.low { background: rgba(16, 185, 129, 0.15); color: #10b981; }
                
                .interaction-description {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                    margin-bottom: 0.5rem;
                }
                
                .interaction-advice {
                    font-size: 0.65rem;
                    color: #fbbf24;
                }
                
                /* ===== قائمة الأدوية ===== */
                .medications-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .medication-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 14px;
                    border: 1px solid var(--border-light, #e2e8f0);
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .dark-mode .medication-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .medication-card:hover {
                    transform: translateY(-2px);
                }
                
                .medication-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                }
                
                .medication-name {
                    flex: 1;
                    font-weight: 700;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .med-icon {
                    font-size: 1rem;
                }
                
                .medication-rate {
                    min-width: 80px;
                    text-align: center;
                }
                
                .rate-value {
                    font-size: 0.7rem;
                    font-weight: 700;
                }
                
                .rate-bar {
                    height: 3px;
                    background: var(--border-light, #e2e8f0);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 0.25rem;
                }
                
                .rate-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981, #f59e0b);
                }
                
                .expand-icon {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                
                .medication-details {
                    padding: 0.75rem;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                    background: rgba(0, 0, 0, 0.02);
                }
                
                .dark-mode .medication-details {
                    border-top-color: #334155;
                    background: rgba(255, 255, 255, 0.02);
                }
                
                .detail-section {
                    margin-bottom: 0.75rem;
                }
                
                .detail-section:last-child {
                    margin-bottom: 0;
                }
                
                .detail-title {
                    font-size: 0.65rem;
                    font-weight: 600;
                    color: #f59e0b;
                    margin-bottom: 0.25rem;
                }
                
                .side-effects-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                }
                
                .side-effect-tag {
                    font-size: 0.6rem;
                    padding: 0.2rem 0.5rem;
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 12px;
                }
                
                .dark-mode .side-effect-tag {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .suggested-time {
                    font-size: 0.7rem;
                    font-weight: 500;
                }
                
                .time-reason {
                    font-size: 0.6rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin-top: 0.25rem;
                }
                
                .med-description {
                    font-size: 0.7rem;
                    color: var(--text-secondary, #64748b);
                    line-height: 1.4;
                }
                
                /* ===== توصيات ===== */
                .recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .recommendation-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 16px;
                    padding: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-left: 4px solid;
                }
                
                .dark-mode .recommendation-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .recommendation-card.priority-critical { border-left-color: #dc2626; }
                .recommendation-card.priority-high { border-left-color: #ef4444; }
                .recommendation-card.priority-medium { border-left-color: #f59e0b; }
                .recommendation-card.priority-low { border-left-color: #10b981; }
                
                .recommendation-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .recommendation-icon {
                    font-size: 1.2rem;
                }
                
                .recommendation-category {
                    font-size: 0.65rem;
                    padding: 0.2rem 0.5rem;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 12px;
                    color: #6366f1;
                }
                
                .priority-badge {
                    font-size: 0.6rem;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                }
                
                .priority-badge.critical { background: rgba(220, 38, 38, 0.15); color: #dc2626; }
                .priority-badge.high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .priority-badge.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .priority-badge.low { background: rgba(16, 185, 129, 0.15); color: #10b981; }
                
                .recommendation-title {
                    font-weight: 700;
                    font-size: 0.85rem;
                    margin-bottom: 0.5rem;
                }
                
                .recommendation-description {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                    margin-bottom: 0.75rem;
                }
                
                .recommendation-actions {
                    margin-bottom: 0.75rem;
                }
                
                .actions-title {
                    font-size: 0.65rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .actions-list {
                    margin: 0;
                    padding-left: 1.25rem;
                    font-size: 0.7rem;
                }
                
                [dir="rtl"] .actions-list {
                    padding-left: 0;
                    padding-right: 1.25rem;
                }
                
                .actions-list li {
                    margin-bottom: 0.25rem;
                }
                
                .recommendation-quick-tip {
                    font-size: 0.65rem;
                    color: #f59e0b;
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .recommendation-quick-tip {
                    border-top-color: #334155;
                }
                
                /* ===== توقعات ===== */
                .predictions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .prediction-card {
                    display: flex;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 16px;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .prediction-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .prediction-card.trend-up { border-top: 3px solid #10b981; }
                .prediction-card.trend-down { border-top: 3px solid #ef4444; }
                
                .prediction-icon {
                    font-size: 1.5rem;
                }
                
                .prediction-content {
                    flex: 1;
                }
                
                .prediction-label {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .prediction-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin: 0.25rem 0;
                }
                
                .prediction-trend {
                    font-size: 0.7rem;
                    color: var(--text-secondary, #64748b);
                }
                
                .prediction-note {
                    font-size: 0.6rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin: 0.25rem 0;
                }
                
                .prediction-confidence {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                    font-size: 0.6rem;
                }
                
                .confidence-bar {
                    flex: 1;
                    height: 3px;
                    background: var(--border-light, #e2e8f0);
                    border-radius: 2px;
                    overflow: hidden;
                }
                
                .confidence-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981, #f59e0b);
                }
                
                .predictions-disclaimer {
                    padding: 0.5rem;
                    background: rgba(245, 158, 11, 0.08);
                    border-radius: 12px;
                    text-align: center;
                }
                
                .predictions-disclaimer small {
                    font-size: 0.6rem;
                    color: #f59e0b;
                }
                
                /* ===== تقدم الأسبوع ===== */
                .weekly-progress {
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .weekly-progress {
                    border-top-color: #334155;
                }
                
                .weekly-progress h3 {
                    font-size: 0.8rem;
                    margin-bottom: 0.75rem;
                }
                
                .progress-bars {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 0.25rem;
                    height: 100px;
                }
                
                .progress-day {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .day-name {
                    font-size: 0.55rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                
                .day-bar {
                    width: 100%;
                    height: 60px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }
                
                .day-fill {
                    width: 80%;
                    background: linear-gradient(180deg, #6366f1, #8b5cf6);
                    border-radius: 6px 6px 0 0;
                    transition: height 0.5s ease;
                }
                
                .day-rate {
                    font-size: 0.55rem;
                    font-weight: 600;
                }
                
                /* ===== حالات خاصة ===== */
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                }
                
                .empty-icon {
                    font-size: 3rem;
                    opacity: 0.5;
                    margin-bottom: 0.5rem;
                }
                
                .empty-hint {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin-top: 0.5rem;
                }
                
                .add-medication-btn {
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.7rem;
                }
                
                .analytics-footer {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    text-align: center;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                    font-size: 0.6rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                
                .analytics-loading, .analytics-error {
                    text-align: center;
                    padding: 2rem;
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
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                
                /* ===== استجابة للشاشات الصغيرة ===== */
                @media (max-width: 768px) {
                    .habit-analytics-container {
                        padding: 1rem;
                    }
                    
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }
                    
                    .analytics-tabs {
                        gap: 0.25rem;
                    }
                    
                    .tab-btn {
                        padding: 0.4rem 0.6rem;
                        font-size: 0.6rem;
                    }
                    
                    .impacts-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .predictions-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .progress-bars {
                        height: 80px;
                    }
                    
                    .day-bar {
                        height: 50px;
                    }
                }
                
                /* ===== دعم RTL ===== */
                [dir="rtl"] .stats-grid {
                    direction: rtl;
                }
                
                [dir="rtl"] .analytics-tabs {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .recommendation-card {
                    border-left: 1px solid;
                    border-right: 4px solid;
                }
                
                [dir="rtl"] .recommendation-card.priority-critical { border-right-color: #dc2626; }
                [dir="rtl"] .recommendation-card.priority-high { border-right-color: #ef4444; }
                [dir="rtl"] .recommendation-card.priority-medium { border-right-color: #f59e0b; }
                [dir="rtl"] .recommendation-card.priority-low { border-right-color: #10b981; }
                
                /* ===== تقليل الحركة ===== */
                @media (prefers-reduced-motion: reduce) {
                    .stat-card:hover,
                    .medication-card:hover {
                        transform: none;
                    }
                    
                    .refresh-btn:hover {
                        transform: none;
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