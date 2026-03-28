// src/components/Analytics/SleepAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import './Analytics.css';

const SleepAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [smartInsights, setSmartInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // دالة لترجمة النصوص السلوكية حسب اللغة الحالية
    const translateBehavioralText = (text, type, data = {}) => {
        const isArabic = i18n.language === 'ar';
        
        // إذا كانت اللغة عربية، نعيد النص كما هو
        if (isArabic) return text;
        
        // ترجمة النصوص إلى الإنجليزية
        const translations = {
            // عناوين القسم
            '🧠 تحليل سلوكي ذكي': '🧠 Behavioral Analysis',
            
            // تنبيهات السهر
            'أنت تسهر كثيراً': 'You stay up late',
            'ليالٍ بعد 2 صباحاً': 'nights after 2 AM',
            'السهر المتأخر يقلل من جودة النوم ويؤثر على هرمونات الجسم': 'Late nights reduce sleep quality and affect your body\'s hormones',
            'حاول النوم قبل 12 منتصف الليل لتحسين جودة نومك': 'Try to sleep before midnight to improve your sleep quality',
            
            // تنبيهات عدم انتظام النوم
            'موعد نومك غير منتظم': 'Your bedtime is irregular',
            'يتغير وقت نومك بشكل كبير': 'Your sleep time varies significantly',
            'حاول النوم في وقت ثابت يومياً حتى في عطلات نهاية الأسبوع': 'Try to sleep at a consistent time daily, even on weekends',
            
            // مصطلحات عامة
            'التباين': 'variation',
            'نومك يتحسن! 🎉': 'Your sleep is improving! 🎉',
            'نومك في انخفاض': 'Your sleep is declining',
            'جودة نومك تتحسن': 'Your sleep quality is improving',
            'جودة نومك تتراجع': 'Your sleep quality is declining',
            
            // توصيات
            'تأثير قلة النوم على مزاجك': 'Impact of Poor Sleep on Your Mood',
            'النوم الجيد = طاقة أكثر': 'Good Sleep = More Energy',
            'السهر المتأخر': 'Late Nights',
            'النوم المتأخر': 'Late Bedtime',
            'عدم انتظام النوم': 'Irregular Sleep Pattern',
            'تحسن ملحوظ': 'Notable Improvement',
            'تراجع في النوم': 'Declining Sleep',
            
            // نصوص إضافية
            'لاحظ النظام أنك عندما تنام أقل من 6 ساعات': 'The system noticed that when you sleep less than 6 hours',
            'تنخفض حالتك المزاجية بنسبة': 'your mood drops by',
            'حاول النوم 7-8 ساعات لتحسين مزاجك': 'Try to sleep 7-8 hours to improve your mood',
            'عندما تنام بجودة عالية، تمارس نشاطاً أكثر بنسبة': 'When you sleep well, your activity increases by',
            'حاول تحسين جودة نومك لزيادة طاقتك خلال اليوم': 'Try to improve your sleep quality to boost your daily energy',
            'قدم موعد نومك ساعة كل يوم للوصول إلى 11 مساءً': 'Gradually move your bedtime earlier by one hour each day to reach 11 PM',
            'النوم المبكر يحسن جودة النوم ويزيد الطاقة صباحاً': 'Early sleep improves sleep quality and increases morning energy',
            'استمر على هذا النمط الصحي': 'Continue this healthy pattern',
            'حاول العودة لروتين نومك السابق': 'Try to return to your previous sleep routine',
            'أحسنت! حافظ على عادات نومك الجيدة': 'Great job! Maintain your good sleep habits',
            'تجنب الشاشات قبل النوم وحاول الاسترخاء': 'Avoid screens before bed and try to relax'
        };
        
        // معالجة النصوص التي تحتوي على أرقام
        if (type === 'very_late_pattern' && data.count && data.total) {
            return `You stay up late (${data.count} out of ${data.total} nights after 2 AM)`;
        }
        
        if (type === 'irregular_pattern' && data.variation) {
            return `Your bedtime is irregular (variation: ${data.variation})`;
        }
        
        if (type === 'low_sleep_impact' && data.days && data.percentage) {
            return `The system noticed that when you sleep less than 6 hours (${data.days} days), your mood drops by ${data.percentage}%`;
        }
        
        if (type === 'quality_activity_impact' && data.difference) {
            return `When you sleep well, your activity increases by ${data.difference}%`;
        }
        
        // البحث في الترجمة
        if (translations[text]) return translations[text];
        
        // معالجة النص الذي يحتوي على نسبة مئوية
        if (text.includes('بنسبة')) {
            return text.replace('بنسبة', 'by');
        }
        
        // معالجة النص الذي يحتوي على "ليالٍ"
        if (text.includes('ليالٍ')) {
            return text.replace(/ليالٍ/g, 'nights');
        }
        
        return text;
    };

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [refreshTrigger]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [
                sleepRes,
                moodRes,
                activitiesRes,
                mealsRes,
                habitsRes,
                healthRes
            ] = await Promise.all([
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] }))
            ]);

            const allData = {
                sleep: sleepRes.data || [],
                mood: moodRes.data || [],
                activities: activitiesRes.data || [],
                meals: mealsRes.data || [],
                habits: habitsRes.data || [],
                health: healthRes.data || []
            };
            
            console.log(t('analytics.sleep.analyzing'), allData);

            const analysis = analyzeSleepIntelligently(allData);
            setSmartInsights(analysis);

        } catch (err) {
            console.error('❌ Error:', err);
            setError(t('analytics.common.error'));
        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // دوال التحليل الأساسية
    // ===========================================

    const analyzeSleepQuality = (sleepRecords) => {
        if (sleepRecords.length === 0) return null;

        const qualities = sleepRecords.map(s => s.quality);
        const avgQuality = math.mean(qualities);

        return {
            avg: avgQuality.toFixed(1),
            distribution: {
                excellent: qualities.filter(q => q >= 4.5).length,
                good: qualities.filter(q => q >= 3.5 && q < 4.5).length,
                average: qualities.filter(q => q >= 2.5 && q < 3.5).length,
                poor: qualities.filter(q => q < 2.5).length
            }
        };
    };

    const extractSleepReasons = (issues, correlations, type, t) => {
        const reasons = [];
        
        issues.forEach(issue => {
            if (issue.type === type) reasons.push(issue.details);
        });
        
        correlations.forEach(corr => {
            if (corr.type === 'sleep_mood' || corr.type === 'sleep_activity') {
                reasons.push(corr.insight);
            }
        });

        return reasons.length > 0 ? reasons : [t('analytics.sleep.recommendations.defaultReason')];
    };

    const calculateSleepScore = (data, t) => {
        const {
            avgSleepHours, avgSleepQuality, avgBedTime,
            totalActivity, avgMood, hasSleepData
        } = data;

        let score = 0;

        if (hasSleepData) {
            if (avgSleepHours >= 7 && avgSleepHours <= 8) score += 30;
            else if (avgSleepHours >= 6 && avgSleepHours < 7) score += 20;
            else if (avgSleepHours > 8 && avgSleepHours <= 9) score += 15;
            else score += 10;

            score += Math.min(30, avgSleepQuality * 6);

            if (avgBedTime >= 22 && avgBedTime <= 23) score += 20;
            else if (avgBedTime >= 21 && avgBedTime < 22) score += 15;
            else if (avgBedTime >= 23 && avgBedTime <= 24) score += 10;
            else if (avgBedTime > 0) score += 5;
        } else {
            score += 20;
        }

        if (totalActivity >= 150) score += 10;
        else if (totalActivity >= 100) score += 5;

        if (avgMood >= 4) score += 10;
        else if (avgMood >= 3) score += 5;

        return {
            total: Math.min(100, Math.max(0, Math.round(score))),
            grade: score >= 90 ? 'A+' :
                   score >= 80 ? 'A' :
                   score >= 70 ? 'B' :
                   score >= 60 ? 'C' :
                   score >= 50 ? 'D' : 'F'
        };
    };

    const getScoreStatus = (score) => {
        if (score >= 80) return t('analytics.sleep.score.excellent');
        if (score >= 60) return t('analytics.sleep.score.good');
        if (score >= 40) return t('analytics.sleep.score.fair');
        return t('analytics.sleep.score.needsImprovement');
    };

    // ===========================================
    // دوال التحليل السلوكي المتقدم
    // ===========================================

    const analyzeSleepMoodImpact = (sleepRecords, moodData) => {
        if (sleepRecords.length < 3 || moodData.length < 3) return null;

        const analysis = [];
        
        const lowSleepDays = sleepRecords
            .filter(s => s.hours < 6 && s.hours > 0)
            .map(s => s.start?.toDateString());
        
        const moodAfterLowSleep = moodData.filter(m => {
            const moodDate = new Date(m.entry_time).toDateString();
            return lowSleepDays.includes(moodDate);
        });

        if (moodAfterLowSleep.length > 0) {
            const badMoodCount = moodAfterLowSleep.filter(m => 
                ['Stressed', 'Anxious', 'Sad'].includes(m.mood)
            ).length;
            
            const percentage = (badMoodCount / moodAfterLowSleep.length) * 100;
            
            if (percentage > 30) {
                analysis.push({
                    type: 'low_sleep_impact',
                    insight: `لاحظ النظام أنك عندما تنام أقل من 6 ساعات (${lowSleepDays.length} أيام)`,
                    details: `تنخفض حالتك المزاجية بنسبة ${percentage.toFixed(0)}%`,
                    recommendation: 'حاول النوم 7-8 ساعات لتحسين مزاجك',
                    severity: percentage > 50 ? 'high' : 'medium',
                    days: lowSleepDays.length,
                    percentage: percentage.toFixed(0)
                });
            }
        }

        const goodSleepDays = sleepRecords
            .filter(s => s.hours >= 7 && s.hours <= 9)
            .map(s => s.start?.toDateString());
        
        const moodAfterGoodSleep = moodData.filter(m => {
            const moodDate = new Date(m.entry_time).toDateString();
            return goodSleepDays.includes(moodDate);
        });

        if (moodAfterGoodSleep.length > 0) {
            const goodMoodCount = moodAfterGoodSleep.filter(m => 
                ['Excellent', 'Good'].includes(m.mood)
            ).length;
            
            const percentage = (goodMoodCount / moodAfterGoodSleep.length) * 100;
            
            if (percentage > 60) {
                analysis.push({
                    type: 'good_sleep_impact',
                    insight: `النوم الجيد (${goodSleepDays.length} أيام) يحسن مزاجك بنسبة`,
                    details: `${percentage.toFixed(0)}% من أيام النوم الجيد كانت مزاجك ممتازاً`,
                    recommendation: 'استمر في نمط نومك الصحي',
                    severity: 'positive'
                });
            }
        }

        return analysis.length > 0 ? analysis : null;
    };

    const analyzeSleepQualityImpact = (sleepRecords, activitiesData) => {
        if (sleepRecords.length < 3 || activitiesData.length < 3) return null;

        const analysis = [];

        const highQualityDays = sleepRecords
            .filter(s => s.quality >= 4)
            .map(s => s.start?.toDateString());

        const activityAfterHighQuality = activitiesData.filter(a => {
            const activityDate = new Date(a.date || a.activity_time || a.start_time).toDateString();
            return highQualityDays.includes(activityDate);
        });

        if (activityAfterHighQuality.length > 0) {
            const avgActivityHigh = activityAfterHighQuality.reduce((sum, a) => 
                sum + (a.duration_minutes || 0), 0) / activityAfterHighQuality.length;

            const lowQualityDays = sleepRecords
                .filter(s => s.quality <= 2)
                .map(s => s.start?.toDateString());

            const activityAfterLowQuality = activitiesData.filter(a => {
                const activityDate = new Date(a.date || a.activity_time || a.start_time).toDateString();
                return lowQualityDays.includes(activityDate);
            });

            if (activityAfterLowQuality.length > 0) {
                const avgActivityLow = activityAfterLowQuality.reduce((sum, a) => 
                    sum + (a.duration_minutes || 0), 0) / activityAfterLowQuality.length;

                const difference = ((avgActivityHigh - avgActivityLow) / avgActivityLow) * 100;

                if (difference > 20) {
                    analysis.push({
                        type: 'quality_activity_impact',
                        insight: `جودة نومك تؤثر بشكل كبير على نشاطك`,
                        details: `عندما تنام بجودة عالية، تمارس نشاطاً أكثر بنسبة ${difference.toFixed(0)}%`,
                        recommendation: 'حاول تحسين جودة نومك لزيادة طاقتك خلال اليوم',
                        severity: 'high',
                        difference: difference.toFixed(0)
                    });
                }
            }
        }

        return analysis.length > 0 ? analysis : null;
    };

    const analyzeBedtimePatterns = (sleepRecords) => {
        if (sleepRecords.length < 5) return null;

        const analysis = [];
        
        const bedtimes = sleepRecords.map(s => s.start?.getHours() || 0);
        
        const earlySleep = bedtimes.filter(h => h >= 21 && h <= 23).length;
        const lateSleep = bedtimes.filter(h => h >= 0 && h <= 4).length;
        const veryLateSleep = bedtimes.filter(h => h >= 2 && h <= 5).length;

        if (veryLateSleep > sleepRecords.length * 0.3) {
            analysis.push({
                type: 'very_late_pattern',
                insight: `أنت تسهر كثيراً (${veryLateSleep} من ${sleepRecords.length} ليالٍ بعد 2 صباحاً)`,
                details: 'السهر المتأخر يقلل من جودة النوم ويؤثر على هرمونات الجسم',
                recommendation: 'حاول النوم قبل 12 منتصف الليل لتحسين جودة نومك',
                severity: 'high',
                count: veryLateSleep,
                total: sleepRecords.length
            });
        } else if (lateSleep > sleepRecords.length * 0.5) {
            analysis.push({
                type: 'late_pattern',
                insight: `غالباً ما تنام بعد منتصف الليل (${lateSleep} من ${sleepRecords.length} ليالٍ)`,
                details: 'النوم المتأخر قد يسبب اضطراب في الساعة البيولوجية',
                recommendation: 'قدم موعد نومك ساعة كل يوم للوصول إلى 11 مساءً',
                severity: 'medium'
            });
        }

        if (earlySleep > sleepRecords.length * 0.5) {
            analysis.push({
                type: 'early_pattern',
                insight: `نمط نومك مبكر ومنتظم (${earlySleep} من ${sleepRecords.length} ليالٍ قبل 12)`,
                details: 'النوم المبكر يحسن جودة النوم ويزيد الطاقة صباحاً',
                recommendation: 'استمر على هذا النمط الصحي',
                severity: 'positive'
            });
        }

        const bedtimeVariance = stats.sampleVariance(bedtimes);
        if (bedtimeVariance > 4) {
            analysis.push({
                type: 'irregular_pattern',
                insight: 'موعد نومك غير منتظم',
                details: `يتغير وقت نومك بشكل كبير (التباين: ${bedtimeVariance.toFixed(1)})`,
                recommendation: 'حاول النوم في وقت ثابت يومياً حتى في عطلات نهاية الأسبوع',
                severity: 'medium',
                variation: bedtimeVariance.toFixed(1)
            });
        }

        return analysis.length > 0 ? analysis : null;
    };

    const analyzeSleepTrends = (sleepRecords) => {
        if (sleepRecords.length < 4) return null;

        const sorted = [...sleepRecords].sort((a, b) => a.start - b.start);
        const recent = sorted.slice(-7);
        
        if (recent.length < 3) return null;

        const avgRecentHours = math.mean(recent.map(s => s.hours));
        const avgRecentQuality = math.mean(recent.map(s => s.quality));
        
        const older = sorted.slice(0, -7);
        if (older.length > 0) {
            const avgOlderHours = math.mean(older.map(s => s.hours));
            const avgOlderQuality = math.mean(older.map(s => s.quality));

            const hoursTrend = avgRecentHours - avgOlderHours;
            const qualityTrend = avgRecentQuality - avgOlderQuality;

            if (hoursTrend > 0.5) {
                return {
                    type: 'improving_hours',
                    insight: `نومك يتحسن! 🎉`,
                    details: `زاد متوسط نومك بمقدار ${hoursTrend.toFixed(1)} ساعة خلال الفترة الأخيرة`,
                    recommendation: 'استمر في هذا التحسن الرائع',
                    severity: 'positive'
                };
            } else if (hoursTrend < -0.5) {
                return {
                    type: 'declining_hours',
                    insight: `نومك في انخفاض`,
                    details: `قل متوسط نومك بمقدار ${Math.abs(hoursTrend).toFixed(1)} ساعة مؤخراً`,
                    recommendation: 'حاول العودة لروتين نومك السابق',
                    severity: 'high'
                };
            }

            if (qualityTrend > 0.5) {
                return {
                    type: 'improving_quality',
                    insight: `جودة نومك تتحسن`,
                    details: `ارتفعت جودة نومك بمقدار ${qualityTrend.toFixed(1)} نقطة`,
                    recommendation: 'أحسنت! حافظ على عادات نومك الجيدة',
                    severity: 'positive'
                };
            } else if (qualityTrend < -0.5) {
                return {
                    type: 'declining_quality',
                    insight: `جودة نومك تتراجع`,
                    details: `انخفضت جودة نومك بمقدار ${Math.abs(qualityTrend).toFixed(1)} نقطة`,
                    recommendation: 'تجنب الشاشات قبل النوم وحاول الاسترخاء',
                    severity: 'high'
                };
            }
        }

        return null;
    };

    const generateBehavioralRecommendations = (sleepRecords, moodData, activitiesData) => {
        const recommendations = [];
        
        const moodImpact = analyzeSleepMoodImpact(sleepRecords, moodData);
        if (moodImpact) {
            moodImpact.forEach(impact => {
                if (impact.type === 'low_sleep_impact') {
                    recommendations.push({
                        icon: '😴',
                        title: 'تأثير قلة النوم على مزاجك',
                        mainAdvice: impact.details,
                        details: impact.insight,
                        recommendation: impact.recommendation,
                        priority: impact.severity === 'high' ? 'urgent' : 'high'
                    });
                }
            });
        }

        const qualityImpact = analyzeSleepQualityImpact(sleepRecords, activitiesData);
        if (qualityImpact) {
            qualityImpact.forEach(impact => {
                recommendations.push({
                    icon: '⚡',
                    title: 'النوم الجيد = طاقة أكثر',
                    mainAdvice: impact.details,
                    details: impact.insight,
                    recommendation: impact.recommendation,
                    priority: 'medium'
                });
            });
        }

        const bedtimePatterns = analyzeBedtimePatterns(sleepRecords);
        if (bedtimePatterns) {
            bedtimePatterns.forEach(pattern => {
                if (pattern.type === 'very_late_pattern') {
                    recommendations.push({
                        icon: '🌙',
                        title: 'السهر المتأخر',
                        mainAdvice: pattern.details,
                        details: pattern.insight,
                        recommendation: pattern.recommendation,
                        priority: 'high'
                    });
                } else if (pattern.type === 'late_pattern') {
                    recommendations.push({
                        icon: '⏰',
                        title: 'النوم المتأخر',
                        mainAdvice: pattern.details,
                        details: pattern.insight,
                        recommendation: pattern.recommendation,
                        priority: 'medium'
                    });
                } else if (pattern.type === 'irregular_pattern') {
                    recommendations.push({
                        icon: '📊',
                        title: 'عدم انتظام النوم',
                        mainAdvice: pattern.details,
                        details: pattern.insight,
                        recommendation: pattern.recommendation,
                        priority: 'medium'
                    });
                }
            });
        }

        const trends = analyzeSleepTrends(sleepRecords);
        if (trends) {
            if (trends.type.includes('improving')) {
                recommendations.push({
                    icon: '🎯',
                    title: 'تحسن ملحوظ',
                    mainAdvice: trends.details,
                    details: trends.insight,
                    recommendation: trends.recommendation,
                    priority: 'low'
                });
            } else if (trends.type.includes('declining')) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'تراجع في النوم',
                    mainAdvice: trends.details,
                    details: trends.insight,
                    recommendation: trends.recommendation,
                    priority: 'high'
                });
            }
        }

        return recommendations;
    };

    // ===========================================
    // الدالة الرئيسية للتحليل
    // ===========================================

    const analyzeSleepIntelligently = (allData) => {
        const { sleep, mood, activities, meals, habits, health } = allData;

        console.log(t('analytics.sleep.debug.title'), allData);
        console.log(t('analytics.sleep.debug.type'), typeof sleep);
        console.log(t('analytics.sleep.debug.isArray'), Array.isArray(sleep));
        console.log(t('analytics.sleep.debug.length'), sleep?.length);
        
        if (sleep && sleep.length > 0) {
            const first = sleep[0];
            console.log(t('analytics.sleep.debug.availableFields'), first);
            console.log(t('analytics.sleep.debug.sleepStart'), first.sleep_start);
            console.log(t('analytics.sleep.debug.sleepEnd'), first.sleep_end);
            console.log(t('analytics.sleep.debug.startTime'), first.start_time);
            console.log(t('analytics.sleep.debug.endTime'), first.end_time);
            console.log(t('analytics.sleep.debug.start'), first.start);
            console.log(t('analytics.sleep.debug.end'), first.end);
            console.log(t('analytics.sleep.debug.duration'), first.duration);
            console.log(t('analytics.sleep.debug.durationHours'), first.duration_hours);
        }

        const hasSleepData = sleep && sleep.length > 0;
        
        console.log(t('analytics.sleep.debug.receivedData'), allData);
        console.log(t('analytics.sleep.debug.sleepCount'), sleep.length);
        console.log(t('analytics.sleep.debug.hasData'), hasSleepData);
        
        if (hasSleepData) {
            console.log(t('analytics.sleep.debug.firstThree'), sleep.slice(0, 3));
        }

        const sleepRecords = sleep.map(s => {
            const startTime = s.sleep_start || s.start_time || s.start;
            const endTime = s.sleep_end || s.end_time || s.end;
            
            console.log(t('analytics.sleep.debug.processing', { id: s.id }), {
                startTime,
                endTime
            });
            
            let hours = 0;
            if (startTime && endTime) {
                const start = new Date(startTime);
                const end = new Date(endTime);
                
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const durationMs = end - start;
                    hours = durationMs / (1000 * 60 * 60);
                    hours = Math.round(hours * 100) / 100;
                    console.log(t('analytics.sleep.debug.calculatedHours', { id: s.id, hours }));
                }
            }
            
            return {
                hours: hours,
                quality: s.quality_rating || 3,
                start: startTime ? new Date(startTime) : null,
                end: endTime ? new Date(endTime) : null,
                notes: s.notes || ''
            };
        });

        console.log(t('analytics.sleep.debug.processedRecords'), sleepRecords.map(r => ({
            hours: r.hours,
            quality: r.quality
        })));

        const totalSleepHours = hasSleepData ? sleepRecords.reduce((sum, s) => sum + s.hours, 0) : 0;
        const avgSleepHours = hasSleepData ? totalSleepHours / sleepRecords.length : 0;
        const avgSleepQuality = hasSleepData ? math.mean(sleepRecords.map(s => s.quality)) || 0 : 0;

        console.log(t('analytics.sleep.debug.totalHours'), totalSleepHours);
        console.log(t('analytics.sleep.debug.avgHours'), avgSleepHours);

        const bedTimes = hasSleepData ? sleepRecords.map(s => s.start?.getHours() || 0) : [];
        const wakeTimes = hasSleepData ? sleepRecords.map(s => s.end?.getHours() || 0) : [];
        const avgBedTime = hasSleepData && bedTimes.length > 0 ? math.mean(bedTimes) || 0 : 0;
        const avgWakeTime = hasSleepData && wakeTimes.length > 0 ? math.mean(wakeTimes) || 0 : 0;

        const moodScores = mood.map(m => {
            const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
            return map[m.mood] || 3;
        });
        const avgMood = math.mean(moodScores) || 0;

        const activityMinutes = activities.map(a => a.duration_minutes || 0);
        const totalActivity = activityMinutes.reduce((a, b) => a + b, 0);

        const habitRate = math.mean(habits.map(h => h.is_completed ? 1 : 0)) || 0;

        const weights = health.map(h => parseFloat(h.weight_kg)).filter(w => w);
        const currentWeight = weights[weights.length - 1] || 0;

        const qualityAnalysis = hasSleepData ? analyzeSleepQuality(sleepRecords) : null;

        const correlations = [];

        if (hasSleepData && sleepRecords.length > 2 && moodScores.length > 2) {
            const minLength = Math.min(sleepRecords.length, moodScores.length);
            const sleepHoursData = sleepRecords.slice(0, minLength).map(s => s.hours);
            const moodData = moodScores.slice(0, minLength);
            
            const sleepMoodCorr = stats.sampleCorrelation(sleepHoursData, moodData);
            
            if (!isNaN(sleepMoodCorr) && Math.abs(sleepMoodCorr) > 0.2) {
                correlations.push({
                    type: 'sleep_mood',
                    strength: sleepMoodCorr,
                    insight: sleepMoodCorr > 0.3 ? 
                        t('analytics.sleep.correlations.sleepMood.strong') :
                        t('analytics.sleep.correlations.sleepMood.normal'),
                    recommendation: t('analytics.sleep.correlations.sleepMood.recommendation')
                });
            }
        }

        if (hasSleepData && sleepRecords.length > 2 && activityMinutes.length > 2) {
            const minLength = Math.min(sleepRecords.length, activityMinutes.length);
            const sleepData = sleepRecords.slice(0, minLength).map(s => s.hours);
            const activityData = activityMinutes.slice(0, minLength);
            
            const sleepActivityCorr = stats.sampleCorrelation(sleepData, activityData);
            
            if (!isNaN(sleepActivityCorr) && sleepActivityCorr > 0.2) {
                correlations.push({
                    type: 'sleep_activity',
                    strength: sleepActivityCorr,
                    insight: t('analytics.sleep.correlations.sleepActivity.insight'),
                    recommendation: t('analytics.sleep.correlations.sleepActivity.recommendation')
                });
            }
        }

        const issues = [];

        if (hasSleepData) {
            if (avgSleepHours < 7) {
                issues.push({
                    type: 'low_sleep',
                    severity: 'high',
                    message: t('analytics.sleep.issues.lowSleep.message'),
                    details: t('analytics.sleep.issues.lowSleep.details', { hours: avgSleepHours.toFixed(1) })
                });
            } else if (avgSleepHours > 9) {
                issues.push({
                    type: 'high_sleep',
                    severity: 'medium',
                    message: t('analytics.sleep.issues.highSleep.message'),
                    details: t('analytics.sleep.issues.highSleep.details', { hours: avgSleepHours.toFixed(1) })
                });
            }

            if (avgSleepQuality < 3) {
                issues.push({
                    type: 'poor_quality',
                    severity: 'high',
                    message: t('analytics.sleep.issues.poorQuality.message'),
                    details: t('analytics.sleep.issues.poorQuality.details', { quality: avgSleepQuality.toFixed(1) })
                });
            }

            if (avgBedTime >= 24 || (avgBedTime <= 4 && avgBedTime > 0)) {
                issues.push({
                    type: 'late_bedtime',
                    severity: 'medium',
                    message: t('analytics.sleep.issues.lateBedtime.message'),
                    details: avgBedTime > 0 
                        ? t('analytics.sleep.issues.lateBedtime.detailsWithTime', { time: avgBedTime.toFixed(0) })
                        : t('analytics.sleep.issues.lateBedtime.detailsNoTime')
                });
            }
        } else {
            issues.push({
                type: 'no_sleep_data',
                severity: 'info',
                message: t('analytics.sleep.issues.noData.message'),
                details: t('analytics.sleep.issues.noData.details')
            });
        }

        const patterns = [];

        if (hasSleepData && sleepRecords.length >= 7) {
            const weekendSleep = sleepRecords.filter((_, i) => {
                const day = sleepRecords[i].start?.getDay() || 0;
                return day === 5 || day === 6;
            });
            
            const weekendAvg = weekendSleep.length > 0 ? 
                math.mean(weekendSleep.map(s => s.hours)) : 0;
            
            if (weekendAvg > avgSleepHours + 1) {
                patterns.push({
                    type: 'weekend_recovery',
                    insight: t('analytics.sleep.patterns.weekendRecovery.insight'),
                    details: t('analytics.sleep.patterns.weekendRecovery.details')
                });
            }
        }

        // ===========================================
        // التحليل السلوكي المتقدم
        // ===========================================
        const behavioralInsights = [];

        const moodImpact = analyzeSleepMoodImpact(sleepRecords, mood);
        if (moodImpact) {
            behavioralInsights.push(...moodImpact);
        }

        const qualityImpact = analyzeSleepQualityImpact(sleepRecords, activities);
        if (qualityImpact) {
            behavioralInsights.push(...qualityImpact);
        }

        const bedtimePatterns = analyzeBedtimePatterns(sleepRecords);
        if (bedtimePatterns) {
            behavioralInsights.push(...bedtimePatterns);
        }

        const trends = analyzeSleepTrends(sleepRecords);
        if (trends) {
            behavioralInsights.push(trends);
        }

        const behavioralRecommendations = generateBehavioralRecommendations(sleepRecords, mood, activities);

        const recommendations = [];

        if (hasSleepData && avgSleepHours < 7) {
            const needed = 8 - avgSleepHours;
            recommendations.push({
                icon: '⏰',
                title: t('analytics.sleep.recommendations.sleepMore.title'),
                mainAdvice: t('analytics.sleep.recommendations.sleepMore.advice', { hours: needed.toFixed(1) }),
                reasons: extractSleepReasons(issues, correlations, 'low_sleep', t),
                tips: t('analytics.sleep.recommendations.sleepMore.tips', { returnObjects: true }),
                priority: avgSleepHours < 6 ? 'urgent' : 'high'
            });
        }

        if (hasSleepData && avgSleepQuality < 3.5) {
            recommendations.push({
                icon: '⭐',
                title: t('analytics.sleep.recommendations.improveQuality.title'),
                mainAdvice: t('analytics.sleep.recommendations.improveQuality.advice'),
                reasons: extractSleepReasons(issues, correlations, 'poor_quality', t),
                tips: t('analytics.sleep.recommendations.improveQuality.tips', { returnObjects: true }),
                priority: avgSleepQuality < 2.5 ? 'high' : 'medium'
            });
        }

        if (hasSleepData && (avgBedTime >= 23 || (avgBedTime <= 4 && avgBedTime > 0))) {
            const idealTime = 22;
            
            recommendations.push({
                icon: '🌙',
                title: t('analytics.sleep.recommendations.earlyBedtime.title'),
                mainAdvice: avgBedTime > 0 
                    ? t('analytics.sleep.recommendations.earlyBedtime.adviceWithTime', { 
                        ideal: idealTime, 
                        current: avgBedTime.toFixed(0) 
                      })
                    : t('analytics.sleep.recommendations.earlyBedtime.adviceNoTime'),
                reasons: t('analytics.sleep.recommendations.earlyBedtime.reasons', { returnObjects: true }),
                tips: t('analytics.sleep.recommendations.earlyBedtime.tips', { returnObjects: true }),
                priority: 'medium'
            });
        }

        if (totalActivity < 150) {
            recommendations.push({
                icon: '🏃',
                title: t('analytics.sleep.recommendations.moreActivity.title'),
                mainAdvice: t('analytics.sleep.recommendations.moreActivity.advice'),
                reasons: t('analytics.sleep.recommendations.moreActivity.reasons', { returnObjects: true }),
                tips: t('analytics.sleep.recommendations.moreActivity.tips', { returnObjects: true }),
                priority: 'medium'
            });
        }

        if (avgMood < 3) {
            recommendations.push({
                icon: '😊',
                title: t('analytics.sleep.recommendations.sleepForMood.title'),
                mainAdvice: t('analytics.sleep.recommendations.sleepForMood.advice'),
                reasons: t('analytics.sleep.recommendations.sleepForMood.reasons', { returnObjects: true }),
                tips: t('analytics.sleep.recommendations.sleepForMood.tips', { returnObjects: true }),
                priority: 'high'
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                icon: '🌟',
                title: t('analytics.sleep.recommendations.startRecording.title'),
                mainAdvice: t('analytics.sleep.recommendations.startRecording.advice'),
                reasons: [t('analytics.sleep.recommendations.startRecording.reason')],
                tips: t('analytics.sleep.recommendations.startRecording.tips', { returnObjects: true }),
                priority: 'low'
            });
        }

        const sleepScore = calculateSleepScore({
            avgSleepHours: hasSleepData ? avgSleepHours : 0,
            avgSleepQuality: hasSleepData ? avgSleepQuality : 0,
            avgBedTime: hasSleepData ? avgBedTime : 0,
            totalActivity, 
            avgMood,
            hasSleepData
        }, t);

        const summary = {
            avgHours: hasSleepData ? avgSleepHours.toFixed(1) : '—',
            avgQuality: hasSleepData ? avgSleepQuality.toFixed(1) : '—',
            totalHours: hasSleepData ? totalSleepHours.toFixed(1) : '0',
            avgBedTime: hasSleepData && avgBedTime > 0 ? avgBedTime.toFixed(0) : '—',
            avgWakeTime: hasSleepData && avgWakeTime > 0 ? avgWakeTime.toFixed(0) : '—',
            recordsCount: sleepRecords.length,
            qualityAnalysis,
            sleepScore: sleepScore.total,
            hasData: hasSleepData
        };

        return {
            summary,
            issues,
            correlations,
            patterns,
            behavioralInsights,
            behavioralRecommendations,
            recommendations: recommendations.sort((a, b) => {
                const priorityWeight = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
                return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
            }),
            lastUpdated: new Date().toISOString()
        };
    };

    // ===========================================
    // التصيير (Render)
    // ===========================================

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.sleep.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {t('analytics.common.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className={`analytics-container sleep-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{t('analytics.sleep.title')}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={t('analytics.common.refresh')}>
                    🔄
                </button>
            </div>

            {smartInsights && (
                <div className="insights-container">
                    
                    <div className="summary-cards">
                        <div className="summary-card">
                            <span className="summary-icon">⏱️</span>
                            <span className="summary-label">{t('analytics.sleep.summary.avgHours')}</span>
                            <span className="summary-value">{smartInsights.summary.avgHours} {t('analytics.sleep.summary.hoursUnit')}</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-icon">⭐</span>
                            <span className="summary-label">{t('analytics.sleep.summary.avgQuality')}</span>
                            <span className="summary-value">{smartInsights.summary.avgQuality}/5</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-icon">🌙</span>
                            <span className="summary-label">{t('analytics.sleep.summary.bedtime')}</span>
                            <span className="summary-value">{smartInsights.summary.avgBedTime !== '—' ? smartInsights.summary.avgBedTime + ':00' : '—'}</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-icon">☀️</span>
                            <span className="summary-label">{t('analytics.sleep.summary.waketime')}</span>
                            <span className="summary-value">{smartInsights.summary.avgWakeTime !== '—' ? smartInsights.summary.avgWakeTime + ':00' : '—'}</span>
                        </div>
                    </div>

                    <div className="score-card">
                        <h3>{t('analytics.sleep.score.title')}</h3>
                        <div className="score-circle" style={{
                            background: `conic-gradient(#4caf50 0% ${smartInsights.summary.sleepScore}%, #ddd ${smartInsights.summary.sleepScore}% 100%)`
                        }}>
                            <span>{smartInsights.summary.sleepScore}</span>
                        </div>
                        <p className="score-status">
                            {getScoreStatus(smartInsights.summary.sleepScore)}
                        </p>
                    </div>

                    {smartInsights.issues.length > 0 && (
                        <div className="issues-card">
                            <h3>{t('analytics.sleep.issues.title')}</h3>
                            <div className="issues-list">
                                {smartInsights.issues.map((issue, idx) => (
                                    <div key={idx} className={`issue-item severity-${issue.severity}`}>
                                        <p className="issue-message">{issue.message}</p>
                                        <p className="issue-details">{issue.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {smartInsights.correlations.length > 0 && (
                        <div className="correlations-card">
                            <h3>{t('analytics.sleep.correlations.title')}</h3>
                            <div className="correlations-list">
                                {smartInsights.correlations.map((corr, idx) => (
                                    <div key={idx} className="correlation-item">
                                        <p className="correlation-insight">{corr.insight}</p>
                                        <p className="correlation-recommendation">💡 {corr.recommendation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* التحليل السلوكي المتقدم - مع استخدام دالة الترجمة */}
                    {smartInsights.behavioralInsights && smartInsights.behavioralInsights.length > 0 && (
                        <div className="behavioral-insights-card">
                            <h3>{translateBehavioralText('🧠 تحليل سلوكي ذكي')}</h3>
                            <div className="insights-list">
                                {smartInsights.behavioralInsights.map((insight, idx) => (
                                    <div key={idx} className={`insight-item severity-${insight.severity || 'info'}`}>
                                        <div className="insight-header">
                                            <span className="insight-icon">
                                                {insight.severity === 'positive' ? '🎉' : 
                                                 insight.severity === 'high' ? '⚠️' : 
                                                 insight.severity === 'medium' ? '📊' : '💡'}
                                            </span>
                                            <span className="insight-title">
                                                {translateBehavioralText(insight.insight, insight.type, insight)}
                                            </span>
                                        </div>
                                        <p className="insight-details">
                                            {translateBehavioralText(insight.details, insight.type, insight)}
                                        </p>
                                        {insight.recommendation && (
                                            <p className="insight-recommendation">💡 {translateBehavioralText(insight.recommendation)}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {smartInsights.patterns.length > 0 && (
                        <div className="patterns-card">
                            <h3>{t('analytics.sleep.patterns.title')}</h3>
                            <div className="patterns-list">
                                {smartInsights.patterns.map((pattern, idx) => (
                                    <div key={idx} className="pattern-item">
                                        <p className="pattern-insight">{pattern.insight}</p>
                                        <p className="pattern-details">{pattern.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {smartInsights.recommendations.length > 0 && (
                        <div className="recommendations-card">
                            <h3>{t('analytics.sleep.recommendations.title')}</h3>
                            <div className="recommendations-list">
                                {smartInsights.recommendations.map((rec, idx) => (
                                    <div key={idx} className={`recommendation priority-${rec.priority}`}>
                                        <div className="rec-header">
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span className="rec-title">{rec.title}</span>
                                        </div>
                                        <p className="rec-main">{rec.mainAdvice}</p>
                                        {rec.reasons && rec.reasons.length > 0 && (
                                            <div className="rec-reasons">
                                                <strong>{t('analytics.sleep.recommendations.why')}</strong>
                                                <ul>
                                                    {rec.reasons.map((reason, i) => (
                                                        <li key={i}>{reason}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {rec.tips && rec.tips.length > 0 && (
                                            <div className="rec-tips">
                                                <strong>{t('analytics.sleep.recommendations.how')}</strong>
                                                <ul>
                                                    {rec.tips.map((tip, i) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="analytics-footer">
                        <small>{t('analytics.common.lastUpdate')}: {new Date(smartInsights.lastUpdated).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</small>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SleepAnalytics;