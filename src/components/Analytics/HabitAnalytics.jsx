import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// ✅ دوال مساعدة
const getStoredHabitType = (habitId) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`habit_type_${habitId}`);
};

const detectHabitType = (habitName, habitDescription = '', habitId = null) => {
    const storedType = habitId ? getStoredHabitType(habitId) : null;
    if (storedType === 'medication') return 'medication';
    if (storedType === 'habit') return 'habit';
    
    const text = (habitName + ' ' + habitDescription).toLowerCase();
    
    const medicationKeywords = [
        'دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment',
        'مضاد حيوي', 'antibiotic', 'مسكن', 'painkiller', 'ibuprofen',
        'paracetamol', 'advil', 'tylenol', 'aspirin', 'metformin',
        'lisinopril', 'amlodipine', 'mg', 'ملجم', 'جرعة', 'dose'
    ];
    
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
    
    if (habitDescription && (habitDescription.includes('mg') || habitDescription.includes('ملجم') || habitDescription.includes('💊'))) {
        return 'medication';
    }
    
    return 'habit';
};

// ✅ قاعدة بيانات بسيطة للأمراض المرتبطة بالأدوية
const medicationDiseaseMap = {
    'metformin': ['diabetes', 'type_2_diabetes', 'prediabetes'],
    'insulin': ['diabetes', 'type_1_diabetes'],
    'lisinopril': ['hypertension', 'high_blood_pressure', 'heart_failure'],
    'amlodipine': ['hypertension', 'angina'],
    'atorvastatin': ['high_cholesterol', 'hyperlipidemia'],
    'simvastatin': ['high_cholesterol'],
    'ibuprofen': ['pain', 'inflammation', 'arthritis'],
    'paracetamol': ['pain', 'fever'],
    'aspirin': ['pain', 'fever', 'heart_disease_prevention'],
    'omeprazole': ['heartburn', 'gerd', 'acid_reflux'],
    'albuterol': ['asthma', 'copd'],
    'levothyroxine': ['hypothyroidism'],
    'sertraline': ['depression', 'anxiety'],
    'fluoxetine': ['depression', 'anxiety'],
    'citalopram': ['depression'],
    'tramadol': ['pain'],
    'morphine': ['severe_pain'],
    'warfarin': ['blood_clots', 'dvt'],
    'clopidogrel': ['blood_clots', 'stroke_prevention']
};

// ✅ تفاعلات الأدوية المعروفة (مهمة جداً)
const drugInteractions = {
    // مضادات التخثر
    'warfarin': ['ibuprofen', 'aspirin', 'paracetamol'],
    'clopidogrel': ['ibuprofen', 'omeprazole', 'esomeprazole'],
    'aspirin': ['ibuprofen', 'warfarin', 'heparin'],
    
    // أدوية السكري
    'metformin': ['furosemide', 'cimetidine', 'iodinated_contrast'],
    'insulin': ['beta_blockers', 'alcohol'],
    
    // ضغط الدم
    'lisinopril': ['potassium_supplements', 'spironolactone', 'ibuprofen'],
    'amlodipine': ['grapefruit', 'simvastatin', 'clarithromycin'],
    
    // كوليسترول
    'atorvastatin': ['grapefruit', 'clarithromycin', 'itraconazole'],
    'simvastatin': ['grapefruit', 'clarithromycin', 'cyclosporine'],
    
    // مضادات الاكتئاب
    'sertraline': ['ibuprofen', 'aspirin', 'warfarin', 'tramadol'],
    'fluoxetine': ['ibuprofen', 'aspirin', 'tramadol', 'lithium'],
    
    // مسكنات
    'ibuprofen': ['warfarin', 'aspirin', 'lisinopril', 'metformin'],
    'tramadol': ['antidepressants', 'alcohol', 'benzodiazepines']
};

// ✅ أوقات تناول الدواء الموصى بها
const getSuggestedTime = (medicationName) => {
    const name = medicationName.toLowerCase();
    if (name.includes('metformin') || name.includes('diabetes')) {
        return { time: 'مع الوجبات', icon: '🍽️', reason: 'يؤخذ مع الوجبات لتقليل اضطرابات المعدة' };
    }
    if (name.includes('statin') || name.includes('atorvastatin') || name.includes('simvastatin')) {
        return { time: 'مساءً', icon: '🌙', reason: 'يفضل تناوله مساءً لأن الكوليسترول يُنتج ليلاً' };
    }
    if (name.includes('lisinopril') || name.includes('pril')) {
        return { time: 'صباحاً', icon: '🌅', reason: 'يفضل تناوله صباحاً لتجنب انخفاض الضغط ليلاً' };
    }
    if (name.includes('amlodipine') || name.includes('dipine')) {
        return { time: 'صباحاً', icon: '🌅', reason: 'يؤخذ صباحاً للحفاظ على ضغط دم منتظم' };
    }
    if (name.includes('ibuprofen') || name.includes('advil')) {
        return { time: 'مع الوجبات', icon: '🍽️', reason: 'يؤخذ مع الطعام لتقليل تهيج المعدة' };
    }
    if (name.includes('levothyroxine')) {
        return { time: 'صباحاً على الريق', icon: '🌅', reason: 'يؤخذ على معدة فارغة قبل الإفطار بـ 30 دقيقة' };
    }
    if (name.includes('sertraline') || name.includes('fluoxetine')) {
        return { time: 'صباحاً', icon: '🌅', reason: 'يفضل تناوله صباحاً لتجنب الأرق' };
    }
    if (name.includes('citalopram') || name.includes('escitalopram')) {
        return { time: 'صباحاً أو مساءً', icon: '🔄', reason: 'يمكن تناوله صباحاً أو مساءً' };
    }
    return { time: 'حسب医嘱 الطبيب', icon: '📋', reason: 'اتبع تعليمات طبيبك' };
};

// ✅ قاعدة بيانات للآثار الجانبية الشائعة
const getCommonSideEffects = (medicationName) => {
    const name = medicationName.toLowerCase();
    if (name.includes('metformin')) {
        return ['غثيان', 'إسهال', 'انتفاخ', 'طعم معدني في الفم'];
    }
    if (name.includes('statin') || name.includes('atorvastatin') || name.includes('simvastatin')) {
        return ['آلام عضلية', 'ضعف عام', 'اضطرابات هضمية', 'ارتفاع إنزيمات الكبد'];
    }
    if (name.includes('lisinopril') || name.includes('pril')) {
        return ['سعال جاف', 'دوخة', 'صداع', 'انخفاض ضغط الدم'];
    }
    if (name.includes('amlodipine') || name.includes('dipine')) {
        return ['تورم الأطراف', 'صداع', 'دوخة', 'احمرار الوجه'];
    }
    if (name.includes('ibuprofen')) {
        return ['تهيج المعدة', 'حرقة', 'دوخة', 'احتباس السوائل'];
    }
    if (name.includes('sertraline') || name.includes('fluoxetine')) {
        return ['غثيان', 'أرق', 'جفاف الفم', 'زيادة الوزن', 'اضطرابات جنسية'];
    }
    return null;
};

// ✅ دالة لجلب معلومات الدواء من FDA API
const fetchDrugInfoFromFDA = async (drugName) => {
    try {
        const response = await axiosInstance.get(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"+or+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`);
        if (response.data?.results?.[0]) {
            const drug = response.data.results[0];
            const openfda = drug.openfda || {};
            return {
                brandName: openfda.brand_name?.[0] || drugName,
                genericName: openfda.generic_name?.[0] || '',
                manufacturer: openfda.manufacturer_name?.[0] || '',
                indication: drug.indications_and_usage?.[0]?.replace(/<[^>]*>/g, '') || 'غير متوفر',
                warnings: drug.warnings?.[0]?.replace(/<[^>]*>/g, '') || 'غير متوفر',
                dosage: drug.dosage_and_administration?.[0]?.replace(/<[^>]*>/g, '') || 'غير متوفر'
            };
        }
        return null;
    } catch (error) {
        console.log('FDA API not available for:', drugName);
        return null;
    }
};

// ✅ تحليل متقدم باستخدام Groq API (اختياري)
const analyzeWithGroq = async (medications, isArabic) => {
    try {
        const medicationNames = medications.map(m => m.name).join(', ');
        const response = await axiosInstance.post('/sentiment/chat/', {
            message: `Analyze these medications: ${medicationNames}. List potential interactions, suggested times, possible diseases, and precautions. ${isArabic ? 'رد بالعربية' : 'Reply in English'}`
        }, { timeout: 10000 });
        
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log('Groq API not available, using local analysis');
        return null;
    }
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
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [analyzingAI, setAnalyzingAI] = useState(false);
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

    useEffect(() => {
        const handleTypeChange = () => fetchData();
        window.addEventListener('habitTypeChanged', handleTypeChange);
        return () => window.removeEventListener('habitTypeChanged', handleTypeChange);
    }, []);

    const extractData = (response) => {
        if (response?.results) return response.results;
        if (Array.isArray(response)) return response;
        return [];
    };

    // ✅ تحليل متقدم للأدوية
    const analyzeMedicationsDeep = async (medicationsList) => {
        if (medicationsList.length === 0) return null;
        
        const analyzedMeds = [];
        let combinedRisks = [];
        let interactions = [];
        
        // تحليل كل دواء على حدة
        for (const med of medicationsList) {
            const medicationInfo = {
                ...med,
                fdaInfo: null,
                suggestedTime: getSuggestedTime(med.name),
                commonSideEffects: getCommonSideEffects(med.name),
                possibleDiseases: [],
                interactions: []
            };
            
            // استنتاج الأمراض المحتملة
            const lowerName = med.name.toLowerCase();
            for (const [medKeyword, diseases] of Object.entries(medicationDiseaseMap)) {
                if (lowerName.includes(medKeyword)) {
                    medicationInfo.possibleDiseases.push(...diseases);
                }
            }
            medicationInfo.possibleDiseases = [...new Set(medicationInfo.possibleDiseases)];
            
            // جلب معلومات من FDA إذا كان الدواء مهماً
            try {
                const fdaInfo = await fetchDrugInfoFromFDA(med.name);
                if (fdaInfo) medicationInfo.fdaInfo = fdaInfo;
            } catch (e) {}
            
            analyzedMeds.push(medicationInfo);
        }
        
        // تحليل التفاعلات بين الأدوية
        for (let i = 0; i < analyzedMeds.length; i++) {
            for (let j = i + 1; j < analyzedMeds.length; j++) {
                const med1 = analyzedMeds[i];
                const med2 = analyzedMeds[j];
                const lower1 = med1.name.toLowerCase();
                const lower2 = med2.name.toLowerCase();
                
                for (const [drug, interactsWith] of Object.entries(drugInteractions)) {
                    if (lower1.includes(drug) && interactsWith.some(x => lower2.includes(x))) {
                        interactions.push({
                            medication1: med1.name,
                            medication2: med2.name,
                            severity: 'high',
                            description: isArabic 
                                ? `تفاعل محتمل بين ${med1.name} و ${med2.name}`
                                : `Potential interaction between ${med1.name} and ${med2.name}`,
                            recommendation: isArabic 
                                ? 'يُنصح باستشارة الطبيب قبل تناول هذين الدواءين معاً'
                                : 'Consult your doctor before taking these medications together'
                        });
                    }
                    if (lower2.includes(drug) && interactsWith.some(x => lower1.includes(x))) {
                        interactions.push({
                            medication1: med2.name,
                            medication2: med1.name,
                            severity: 'high',
                            description: isArabic 
                                ? `تفاعل محتمل بين ${med2.name} و ${med1.name}`
                                : `Potential interaction between ${med2.name} and ${med1.name}`,
                            recommendation: isArabic 
                                ? 'يُنصح باستشارة الطبيب قبل تناول هذين الدواءين معاً'
                                : 'Consult your doctor before taking these medications together'
                        });
                    }
                }
            }
        }
        
        // إزالة التفاعلات المكررة
        interactions = interactions.filter((inter, idx, self) => 
            idx === self.findIndex(i => i.medication1 === inter.medication1 && i.medication2 === inter.medication2)
        );
        
        // استنتاج الأمراض المحتملة بناءً على مجموعة الأدوية
        const allDiseases = analyzedMeds.flatMap(m => m.possibleDiseases);
        const diseaseFrequency = {};
        allDiseases.forEach(d => { diseaseFrequency[d] = (diseaseFrequency[d] || 0) + 1; });
        
        const likelyConditions = Object.entries(diseaseFrequency)
            .filter(([_, count]) => count >= 1)
            .map(([disease]) => {
                const diseaseNames = {
                    'diabetes': isArabic ? 'السكري' : 'Diabetes',
                    'type_2_diabetes': isArabic ? 'السكري من النوع الثاني' : 'Type 2 Diabetes',
                    'prediabetes': isArabic ? 'مقدمات السكري' : 'Prediabetes',
                    'hypertension': isArabic ? 'ارتفاع ضغط الدم' : 'Hypertension',
                    'high_blood_pressure': isArabic ? 'ارتفاع ضغط الدم' : 'High Blood Pressure',
                    'heart_failure': isArabic ? 'قصور القلب' : 'Heart Failure',
                    'angina': isArabic ? 'الذبحة الصدرية' : 'Angina',
                    'high_cholesterol': isArabic ? 'ارتفاع الكوليسترول' : 'High Cholesterol',
                    'hyperlipidemia': isArabic ? 'فرط شحميات الدم' : 'Hyperlipidemia',
                    'pain': isArabic ? 'آلام' : 'Pain',
                    'inflammation': isArabic ? 'التهابات' : 'Inflammation',
                    'arthritis': isArabic ? 'التهاب المفاصل' : 'Arthritis',
                    'fever': isArabic ? 'حمى' : 'Fever',
                    'asthma': isArabic ? 'الربو' : 'Asthma',
                    'copd': isArabic ? 'مرض الانسداد الرئوي' : 'COPD',
                    'hypothyroidism': isArabic ? 'قصور الغدة الدرقية' : 'Hypothyroidism',
                    'depression': isArabic ? 'الاكتئاب' : 'Depression',
                    'anxiety': isArabic ? 'القلق' : 'Anxiety',
                    'heart_disease_prevention': isArabic ? 'الوقاية من أمراض القلب' : 'Heart Disease Prevention',
                    'gerd': isArabic ? 'الارتجاع المريئي' : 'GERD',
                    'blood_clots': isArabic ? 'جلطات الدم' : 'Blood Clots',
                    'dvt': isArabic ? 'تجلط الأوردة العميقة' : 'DVT'
                };
                return diseaseNames[disease] || disease;
            });
        
        return {
            medications: analyzedMeds,
            interactions,
            likelyConditions: [...new Set(likelyConditions)],
            aiAnalysis: null
        };
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
            
            // ✅ تحليل متقدم للأدوية
            if (analysis.medications.list.length > 0) {
                const deepAnalysis = await analyzeMedicationsDeep(analysis.medications.list);
                analysis.medications.deepAnalysis = deepAnalysis;
                
                // ✅ محاولة تحليل AI متقدم (اختياري)
                setAnalyzingAI(true);
                const groqAnalysis = await analyzeWithGroq(analysis.medications.list, isArabic);
                if (groqAnalysis) {
                    analysis.medications.aiAnalysis = groqAnalysis;
                }
                setAnalyzingAI(false);
            }
            
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
        const medications = [];
        const regularHabits = [];
        
        habits.forEach(habit => {
            const type = detectHabitType(habit.name, habit.description, habit.id);
            console.log(`📊 Habit: ${habit.name} -> Type: ${type}`);
            
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
        
        const habitStats = {
            total: regularHabits.length,
            completed: regularHabits.reduce((sum, h) => sum + h.completed, 0),
            totalLogs: regularHabits.reduce((sum, h) => sum + h.total, 0),
            completionRate: 0
        };
        habitStats.completionRate = habitStats.totalLogs > 0 
            ? Math.round((habitStats.completed / habitStats.totalLogs) * 100) 
            : 0;
        
        const allItems = [...medications, ...regularHabits];
        const strongestHabit = allItems.reduce((best, current) => 
            current.rate > best.rate ? current : best, { rate: 0, name: '' });
        
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
                complianceMessage,
                deepAnalysis: null,
                aiAnalysis: null
            },
            habits: {
                list: regularHabits,
                count: regularHabits.length,
                stats: habitStats,
                completionRate: habitStats.completionRate
            },
            recommendations,
            quickTips,
            strongestHabit: strongestHabit.name,
            strongestHabitRate: strongestHabit.rate,
            lastUpdated: new Date().toISOString()
        };
    };

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

    const deepAnalysis = data.medications.deepAnalysis;

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>📊 {isArabic ? 'تحليل العادات والأدوية' : 'Habits & Medications Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

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

            {/* ✅ قسم تحليل الأدوية المتقدم */}
            {data.medications.count > 0 && deepAnalysis && (
                <>
                    {/* الأمراض المحتملة */}
                    {deepAnalysis.likelyConditions.length > 0 && (
                        <div className="diseases-card">
                            <div className="diseases-header">
                                <span className="diseases-icon">🩺</span>
                                <h3>{isArabic ? 'الأمراض المحتملة بناءً على أدويتك' : 'Potential Conditions Based on Your Medications'}</h3>
                            </div>
                            <div className="diseases-list">
                                {deepAnalysis.likelyConditions.map((condition, idx) => (
                                    <div key={idx} className="disease-item">
                                        <span className="disease-marker">✅</span>
                                        <span>{condition}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="diseases-note">
                                ⚠️ {isArabic ? 'هذا تحليل استرشادي وليس تشخيصاً طبياً. استشر طبيبك للتشخيص الدقيق.' : 'This is for guidance only, not a medical diagnosis. Consult your doctor.'}
                            </div>
                        </div>
                    )}

                    {/* تفاعلات الأدوية */}
                    {deepAnalysis.interactions.length > 0 && (
                        <div className="interactions-card">
                            <div className="interactions-header">
                                <span className="interactions-icon">⚠️</span>
                                <h3>{isArabic ? 'تفاعلات دوائية محتملة' : 'Potential Drug Interactions'}</h3>
                            </div>
                            <div className="interactions-list">
                                {deepAnalysis.interactions.map((inter, idx) => (
                                    <div key={idx} className="interaction-item severity-high">
                                        <div className="interaction-title">
                                            🔴 {inter.medication1} ↔️ {inter.medication2}
                                        </div>
                                        <p className="interaction-desc">{inter.description}</p>
                                        <p className="interaction-recommendation">💡 {inter.recommendation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* تفاصيل الأدوية */}
                    <div className="medications-details">
                        <h3>{isArabic ? 'تفاصيل الأدوية' : 'Medication Details'}</h3>
                        <div className="medications-details-list">
                            {deepAnalysis.medications.map((med, idx) => (
                                <div key={idx} className="medication-detail-card">
                                    <div className="med-detail-header">
                                        <span className="med-detail-icon">💊</span>
                                        <span className="med-detail-name">{med.name}</span>
                                        <span className={`med-detail-rate ${med.rate >= 70 ? 'high' : med.rate >= 40 ? 'medium' : 'low'}`}>
                                            {med.rate}%
                                        </span>
                                    </div>
                                    
                                    <div className="med-detail-body">
                                        {/* وقت التناول الموصى به */}
                                        {med.suggestedTime && (
                                            <div className="med-detail-item">
                                                <span className="detail-icon">⏰</span>
                                                <span className="detail-label">{isArabic ? 'الوقت المثالي' : 'Suggested Time'}:</span>
                                                <span className="detail-value">{med.suggestedTime.time} {med.suggestedTime.icon}</span>
                                                <span className="detail-reason">{med.suggestedTime.reason}</span>
                                            </div>
                                        )}
                                        
                                        {/* الآثار الجانبية */}
                                        {med.commonSideEffects && med.commonSideEffects.length > 0 && (
                                            <div className="med-detail-item">
                                                <span className="detail-icon">⚠️</span>
                                                <span className="detail-label">{isArabic ? 'الآثار الجانبية' : 'Side Effects'}:</span>
                                                <span className="detail-value">{med.commonSideEffects.join(', ')}</span>
                                            </div>
                                        )}
                                        
                                        {/* الأمراض المرتبطة */}
                                        {med.possibleDiseases.length > 0 && (
                                            <div className="med-detail-item">
                                                <span className="detail-icon">🩺</span>
                                                <span className="detail-label">{isArabic ? 'يستخدم لعلاج' : 'Treats'}:</span>
                                                <span className="detail-value">
                                                    {med.possibleDiseases.map(d => {
                                                        const names = {
                                                            'diabetes': isArabic ? 'السكري' : 'Diabetes',
                                                            'hypertension': isArabic ? 'ارتفاع الضغط' : 'Hypertension',
                                                            'high_cholesterol': isArabic ? 'ارتفاع الكوليسترول' : 'High Cholesterol',
                                                            'pain': isArabic ? 'آلام' : 'Pain',
                                                            'depression': isArabic ? 'الاكتئاب' : 'Depression',
                                                            'anxiety': isArabic ? 'القلق' : 'Anxiety',
                                                            'asthma': isArabic ? 'الربو' : 'Asthma'
                                                        };
                                                        return names[d] || d;
                                                    }).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

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
                                                    <span className="habit-name">{habit.name}</span>
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
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; border: 1px solid var(--border-light, #eef2f6); }
                .dark-mode .analytics-container { background: #1e293b; border-color: #334155; }
                .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-light, #eef2f6); }
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: none; width: 38px; height: 38px; border-radius: 12px; cursor: pointer; }
                .dark-mode .refresh-btn { background: #334155; }
                .refresh-btn:hover { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; transform: rotate(180deg); }
                .analytics-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
                .analytics-stat-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .analytics-stat-card { background: #0f172a; border-color: #334155; }
                .stat-icon { font-size: 1.8rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; color: white; }
                .stat-value { font-size: 1.4rem; font-weight: 800; }
                .stat-label { font-size: 0.65rem; color: var(--text-secondary, #64748b); }
                .diseases-card, .interactions-card { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; color: white; }
                .diseases-header, .interactions-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
                .diseases-icon, .interactions-icon { font-size: 1.5rem; }
                .diseases-header h3, .interactions-header h3 { margin: 0; font-size: 0.9rem; }
                .diseases-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
                .disease-item { display: flex; align-items: center; gap: 0.25rem; background: rgba(255,255,255,0.1); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; }
                .diseases-note { font-size: 0.65rem; opacity: 0.7; margin-top: 0.5rem; }
                .interaction-item { background: rgba(239,68,68,0.15); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 3px solid #ef4444; }
                .interaction-title { font-weight: 700; font-size: 0.8rem; margin-bottom: 0.25rem; }
                .interaction-desc { font-size: 0.7rem; margin: 0.25rem 0; opacity: 0.9; }
                .interaction-recommendation { font-size: 0.65rem; margin: 0.25rem 0 0; color: #fbbf24; }
                .medications-details { margin-bottom: 1.5rem; }
                .medications-details h3 { font-size: 0.9rem; margin-bottom: 1rem; }
                .medications-details-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .medication-detail-card { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .medication-detail-card { background: #0f172a; border-color: #334155; }
                .med-detail-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-light, #e2e8f0); }
                .med-detail-icon { font-size: 1.2rem; }
                .med-detail-name { font-weight: 700; flex: 1; }
                .med-detail-rate { padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
                .med-detail-rate.high { background: rgba(16,185,129,0.15); color: #10b981; }
                .med-detail-rate.medium { background: rgba(245,158,11,0.15); color: #f59e0b; }
                .med-detail-rate.low { background: rgba(239,68,68,0.15); color: #ef4444; }
                .med-detail-item { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; }
                .detail-icon { font-size: 0.8rem; }
                .detail-label { font-weight: 600; color: var(--text-secondary, #64748b); min-width: 80px; }
                .detail-value { font-weight: 500; }
                .detail-reason { font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); width: 100%; margin-top: 0.25rem; margin-left: 1.5rem; }
                .analytics-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.25rem; background: var(--secondary-bg, #f8fafc); border-radius: 50px; border: 1px solid var(--border-light, #e2e8f0); }
                .analytics-tabs button { flex: 1; padding: 0.5rem 1rem; background: transparent; border: none; border-radius: 40px; cursor: pointer; font-weight: 600; color: var(--text-secondary, #64748b); }
                .analytics-tabs button.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
                .insight-card { display: flex; gap: 1rem; background: linear-gradient(135deg, #10b98120, #05966920); border-radius: 16px; padding: 1rem; margin-bottom: 1rem; border: 1px solid #10b98140; }
                .habit-card { background: var(--card-bg, #ffffff); border-radius: 14px; padding: 0.75rem; margin-bottom: 0.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .habit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
                .habit-name { font-weight: 600; }
                .habit-rate { padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
                .habit-rate.high { background: rgba(16,185,129,0.15); color: #10b981; }
                .habit-rate.medium { background: rgba(245,158,11,0.15); color: #f59e0b; }
                .habit-rate.low { background: rgba(239,68,68,0.15); color: #ef4444; }
                .habit-stats { display: flex; gap: 1rem; font-size: 0.65rem; color: var(--text-secondary, #64748b); margin-bottom: 0.5rem; }
                .progress-bar { height: 4px; background: var(--border-light, #e2e8f0); border-radius: 4px; overflow: hidden; }
                .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); }
                .recommendation-card { background: var(--card-bg, #ffffff); border-radius: 14px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 3px solid #f59e0b; }
                .tips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 1rem 0; }
                .tip-item { text-align: center; padding: 0.75rem; background: var(--secondary-bg, #f8fafc); border-radius: 14px; }
                .analytics-footer { text-align: center; padding-top: 1rem; border-top: 1px solid var(--border-light, #e2e8f0); font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                @media (max-width: 768px) { .analytics-stats-grid { grid-template-columns: repeat(2, 1fr); } .tips-grid { grid-template-columns: 1fr; } .med-detail-item { flex-direction: column; gap: 0.25rem; } .detail-label { min-width: auto; } }
            `}</style>
        </div>
    );
};

export default HabitAnalytics;