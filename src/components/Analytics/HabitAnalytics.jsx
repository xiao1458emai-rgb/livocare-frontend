import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// ============================================
// دوال مساعدة للتحليل
// ============================================

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

// ✅ قاعدة بيانات كاملة للأمراض والأدوية المرتبطة بها
const diseaseMedicationMap = {
    // أمراض القلب والضغط
    'hypertension': {
        ar: 'ارتفاع ضغط الدم',
        medications: ['lisinopril', 'amlodipine', 'losartan', 'valsartan', 'hydrochlorothiazide', 'metoprolol'],
        suitable: ['lisinopril', 'amlodipine', 'losartan', 'valsartan'],
        contraindicated: ['ibuprofen', 'naproxen', 'diclofenac']
    },
    'heart_failure': {
        ar: 'قصور القلب',
        medications: ['lisinopril', 'carvedilol', 'furosemide', 'spironolactone'],
        suitable: ['lisinopril', 'carvedilol', 'furosemide'],
        contraindicated: ['ibuprofen', 'celecoxib']
    },
    
    // السكري
    'diabetes': {
        ar: 'السكري',
        medications: ['metformin', 'insulin', 'glimepiride', 'sitagliptin', 'empagliflozin'],
        suitable: ['metformin', 'insulin', 'sitagliptin'],
        contraindicated: ['ibuprofen', 'prednisone']
    },
    'type_2_diabetes': {
        ar: 'السكري من النوع الثاني',
        medications: ['metformin', 'glimepiride', 'sitagliptin', 'empagliflozin'],
        suitable: ['metformin', 'sitagliptin', 'empagliflozin'],
        contraindicated: ['ibuprofen', 'steroids']
    },
    
    // الكوليسترول
    'high_cholesterol': {
        ar: 'ارتفاع الكوليسترول',
        medications: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'ezetimibe'],
        suitable: ['atorvastatin', 'simvastatin', 'rosuvastatin'],
        contraindicated: ['steroids', 'isotretinoin']
    },
    'hyperlipidemia': {
        ar: 'فرط شحميات الدم',
        medications: ['atorvastatin', 'simvastatin', 'fenofibrate'],
        suitable: ['atorvastatin', 'simvastatin'],
        contraindicated: ['steroids', 'hormonal_contraceptives']
    },
    
    // الاكتئاب والقلق
    'depression': {
        ar: 'الاكتئاب',
        medications: ['sertraline', 'fluoxetine', 'citalopram', 'escitalopram', 'venlafaxine'],
        suitable: ['sertraline', 'fluoxetine', 'citalopram'],
        contraindicated: ['tramadol', 'diazepam', 'alcohol']
    },
    'anxiety': {
        ar: 'القلق',
        medications: ['sertraline', 'escitalopram', 'buspirone', 'propranolol'],
        suitable: ['sertraline', 'escitalopram', 'buspirone'],
        contraindicated: ['caffeine', 'stimulants', 'alcohol']
    },
    
    // الربو
    'asthma': {
        ar: 'الربو',
        medications: ['albuterol', 'salmeterol', 'fluticasone', 'montelukast'],
        suitable: ['albuterol', 'fluticasone', 'montelukast'],
        contraindicated: ['ibuprofen', 'aspirin', 'beta_blockers']
    },
    'copd': {
        ar: 'مرض الانسداد الرئوي',
        medications: ['albuterol', 'tiotropium', 'fluticasone', 'theophylline'],
        suitable: ['albuterol', 'tiotropium', 'fluticasone'],
        contraindicated: ['ibuprofen', 'sedatives']
    },
    
    // الغدة الدرقية
    'hypothyroidism': {
        ar: 'قصور الغدة الدرقية',
        medications: ['levothyroxine', 'liothyronine'],
        suitable: ['levothyroxine'],
        contraindicated: ['amiodarone', 'lithium']
    },
    
    // الألم والالتهابات
    'pain': {
        ar: 'آلام',
        medications: ['ibuprofen', 'paracetamol', 'naproxen', 'tramadol'],
        suitable: ['paracetamol', 'ibuprofen'],
        contraindicated: ['tramadol_with_antidepressants']
    },
    'arthritis': {
        ar: 'التهاب المفاصل',
        medications: ['ibuprofen', 'naproxen', 'celecoxib', 'prednisone', 'methotrexate'],
        suitable: ['ibuprofen', 'naproxen', 'celecoxib'],
        contraindicated: ['aspirin', 'warfarin']
    },
    
    // ارتجاع المريء
    'gerd': {
        ar: 'الارتجاع المريئي',
        medications: ['omeprazole', 'pantoprazole', 'esomeprazole', 'ranitidine'],
        suitable: ['omeprazole', 'pantoprazole', 'esomeprazole'],
        contraindicated: ['ibuprofen', 'aspirin', 'NSAIDs']
    },
    
    // الجلطات
    'blood_clots': {
        ar: 'جلطات الدم',
        medications: ['warfarin', 'apixaban', 'rivaroxaban', 'heparin'],
        suitable: ['warfarin', 'apixaban', 'rivaroxaban'],
        contraindicated: ['ibuprofen', 'aspirin', 'NSAIDs']
    }
};

// ✅ قاعدة بيانات تفاعلات الأدوية
const drugInteractions = {
    'warfarin': ['ibuprofen', 'aspirin', 'paracetamol', 'amiodarone', 'antibiotics'],
    'clopidogrel': ['ibuprofen', 'omeprazole', 'esomeprazole'],
    'aspirin': ['ibuprofen', 'warfarin', 'heparin'],
    'metformin': ['furosemide', 'cimetidine', 'iodinated_contrast'],
    'insulin': ['beta_blockers', 'alcohol', 'steroids'],
    'lisinopril': ['potassium_supplements', 'spironolactone', 'ibuprofen'],
    'amlodipine': ['grapefruit', 'simvastatin', 'clarithromycin'],
    'atorvastatin': ['grapefruit', 'clarithromycin', 'itraconazole'],
    'simvastatin': ['grapefruit', 'clarithromycin', 'cyclosporine'],
    'sertraline': ['ibuprofen', 'aspirin', 'warfarin', 'tramadol', 'lithium'],
    'fluoxetine': ['ibuprofen', 'aspirin', 'tramadol', 'lithium'],
    'ibuprofen': ['warfarin', 'aspirin', 'lisinopril', 'metformin', 'furosemide'],
    'tramadol': ['antidepressants', 'alcohol', 'benzodiazepines', 'carbamazepine'],
    'levothyroxine': ['calcium', 'iron', 'aluminum_hydroxide', 'amiodarone'],
    'omeprazole': ['clopidogrel', 'digoxin', 'methotrexate']
};

// ✅ أوقات تناول الدواء الموصى بها
const getSuggestedTime = (medicationName) => {
    const name = medicationName.toLowerCase();
    if (name.includes('metformin')) return { time: 'مع الوجبات', icon: '🍽️', reason: 'يؤخذ مع الوجبات لتقليل اضطرابات المعدة' };
    if (name.includes('statin') || name.includes('atorvastatin') || name.includes('simvastatin')) {
        return { time: 'مساءً', icon: '🌙', reason: 'يفضل تناوله مساءً لأن الكوليسترول يُنتج ليلاً' };
    }
    if (name.includes('pril')) return { time: 'صباحاً', icon: '🌅', reason: 'يفضل تناوله صباحاً لتجنب انخفاض الضغط ليلاً' };
    if (name.includes('dipine')) return { time: 'صباحاً', icon: '🌅', reason: 'يؤخذ صباحاً للحفاظ على ضغط دم منتظم' };
    if (name.includes('ibuprofen')) return { time: 'مع الوجبات', icon: '🍽️', reason: 'يؤخذ مع الطعام لتقليل تهيج المعدة' };
    if (name.includes('levothyroxine')) return { time: 'صباحاً على الريق', icon: '🌅', reason: 'يؤخذ على معدة فارغة قبل الإفطار بـ 30 دقيقة' };
    if (name.includes('sertraline') || name.includes('fluoxetine')) {
        return { time: 'صباحاً', icon: '🌅', reason: 'يفضل تناوله صباحاً لتجنب الأرق' };
    }
    return { time: 'حسب医嘱 الطبيب', icon: '📋', reason: 'اتبع تعليمات طبيبك' };
};

// ✅ الآثار الجانبية الشائعة
const getCommonSideEffects = (medicationName) => {
    const name = medicationName.toLowerCase();
    if (name.includes('metformin')) return ['غثيان', 'إسهال', 'انتفاخ', 'طعم معدني'];
    if (name.includes('statin')) return ['آلام عضلية', 'ضعف عام', 'اضطرابات هضمية'];
    if (name.includes('pril')) return ['سعال جاف', 'دوخة', 'صداع', 'انخفاض الضغط'];
    if (name.includes('dipine')) return ['تورم الأطراف', 'صداع', 'دوخة', 'احمرار الوجه'];
    if (name.includes('ibuprofen')) return ['تهيج المعدة', 'حرقة', 'دوخة', 'احتباس السوائل'];
    if (name.includes('sertraline')) return ['غثيان', 'أرق', 'جفاف الفم', 'زيادة الوزن'];
    return null;
};

// ✅ تحليل مدى مناسبة الدواء للحالة
const analyzeMedicationSuitability = (medicationName, userConditions) => {
    const lowerName = medicationName.toLowerCase();
    const suitability = {
        suitable: [],
        contraindicated: [],
        neutral: []
    };
    
    for (const condition of userConditions) {
        const conditionKey = condition.toLowerCase().replace(/\s/g, '_');
        const diseaseInfo = diseaseMedicationMap[conditionKey];
        
        if (diseaseInfo) {
            // التحقق من الأدوية المناسبة
            for (const suitableMed of diseaseInfo.suitable) {
                if (lowerName.includes(suitableMed)) {
                    suitability.suitable.push({
                        condition: diseaseInfo.ar,
                        reason: `${medicationName} يستخدم عادة لعلاج ${diseaseInfo.ar}`,
                        severity: 'good'
                    });
                }
            }
            
            // التحقق من الأدوية الممنوعة
            if (diseaseInfo.contraindicated) {
                for (const contraMed of diseaseInfo.contraindicated) {
                    if (lowerName.includes(contraMed)) {
                        suitability.contraindicated.push({
                            condition: diseaseInfo.ar,
                            reason: `${medicationName} قد يكون غير مناسب لمرضى ${diseaseInfo.ar}`,
                            severity: 'danger'
                        });
                    }
                }
            }
        }
    }
    
    // إزالة التكرارات
    suitability.suitable = [...new Map(suitability.suitable.map(item => [item.condition, item])).values()];
    suitability.contraindicated = [...new Map(suitability.contraindicated.map(item => [item.condition, item])).values()];
    
    return suitability;
};

// ✅ جلب معلومات الدواء من FDA
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
                description: drug.description?.[0]?.replace(/<[^>]*>/g, '') || ''
            };
        }
        return null;
    } catch (error) {
        console.log('FDA API not available for:', drugName);
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
    const [userConditions, setUserConditions] = useState([]);
    const [loadingConditions, setLoadingConditions] = useState(true);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // ✅ جلب الأمراض المزمنة للمستخدم
    const fetchUserConditions = useCallback(async () => {
        try {
            const response = await axiosInstance.get('/user/conditions/');
            if (response.data?.success && response.data.conditions) {
                setUserConditions(response.data.conditions);
                console.log('🩺 User conditions loaded:', response.data.conditions);
            }
        } catch (error) {
            console.error('Error fetching user conditions:', error);
            setUserConditions([]);
        } finally {
            setLoadingConditions(false);
        }
    }, []);

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
        const handleTypeChange = () => {
            fetchData();
            fetchUserConditions();
        };
        window.addEventListener('habitTypeChanged', handleTypeChange);
        return () => window.removeEventListener('habitTypeChanged', handleTypeChange);
    }, []);

    const extractData = (response) => {
        if (response?.results) return response.results;
        if (Array.isArray(response)) return response;
        return [];
    };

    // ✅ تحليل متقدم للأدوية مع مراعاة الأمراض المزمنة
    const analyzeMedicationsDeep = async (medicationsList, conditions) => {
        if (medicationsList.length === 0) return null;
        
        const analyzedMeds = [];
        let interactions = [];
        
        // تحليل كل دواء على حدة
        for (const med of medicationsList) {
            const medicationInfo = {
                ...med,
                fdaInfo: null,
                suggestedTime: getSuggestedTime(med.name),
                commonSideEffects: getCommonSideEffects(med.name),
                suitability: analyzeMedicationSuitability(med.name, conditions),
                generalUses: []
            };
            
            // تحديد الاستخدامات العامة للدواء
            const lowerName = med.name.toLowerCase();
            for (const [diseaseKey, diseaseInfo] of Object.entries(diseaseMedicationMap)) {
                if (diseaseInfo.medications.some(m => lowerName.includes(m))) {
                    medicationInfo.generalUses.push({
                        name: diseaseInfo.ar,
                        key: diseaseKey
                    });
                }
            }
            medicationInfo.generalUses = [...new Map(medicationInfo.generalUses.map(item => [item.name, item])).values()];
            
            // جلب معلومات من FDA
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
        
        return {
            medications: analyzedMeds,
            interactions,
            interactionsCount: interactions.length
        };
    };

c// في HabitAnalytics.jsx - قم بتعديل تعريف المكون


    const fetchData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            // ✅ استخدام البيانات من props أولاً
            let habits = habitsData || [];
            let logs = logsData || [];
            let conditions = userConditionsData || [];
            
            // إذا لم تكن هناك بيانات في props، حاول جلبها من API
            if (habits.length === 0) {
                const response = await axiosInstance.get('/habit-definitions/');
                habits = extractData(response.data);
            }
            
            if (logs.length === 0) {
                const response = await axiosInstance.get('/habit-logs/');
                logs = extractData(response.data);
            }
            
            if (conditions.length === 0) {
                const response = await axiosInstance.get('/user/conditions/');
                if (response.data?.success) {
                    conditions = response.data.conditions || [];
                }
            }
            
            if (!isMountedRef.current) return;
            
            if (habits.length === 0) {
                setData(null);
                setError(isArabic ? 'لا توجد عادات مسجلة' : 'No habits recorded');
                setLoading(false);
                return;
            }
            
            // ✅ تحليل العادات والأدوية محلياً
            const analysis = analyzeHabits(habits, logs);
            
            // ✅ تحليل متقدم للأدوية مع مراعاة الأمراض المزمنة
            if (analysis.medications.list.length > 0 && conditions.length > 0) {
                const deepAnalysis = await analyzeMedicationsDeep(analysis.medications.list, conditions.map(c => c.name));
                analysis.medications.deepAnalysis = deepAnalysis;
            } else if (analysis.medications.list.length > 0) {
                const deepAnalysis = await analyzeMedicationsDeep(analysis.medications.list, []);
                analysis.medications.deepAnalysis = deepAnalysis;
            }
            
            analysis.userConditions = conditions;
            
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
    }, [isArabic, habitsData, logsData, userConditionsData]);

  

    useEffect(() => {
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [fetchData, refreshTrigger]);

    const analyzeHabits = (habits, logs) => {
        const medications = [];
        const regularHabits = [];
        
        habits.forEach(habit => {
            const type = detectHabitType(habit.name, habit.description, habit.id);
            
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
                deepAnalysis: null
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
            userConditions: userConditions,
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
    const hasConditions = data.userConditions && data.userConditions.length > 0;

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>📊 {isArabic ? 'تحليل العادات والأدوية' : 'Habits & Medications Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* ✅ عرض الأمراض المزمنة للمستخدم */}
            {hasConditions && (
                <div className="conditions-card">
                    <div className="conditions-header">
                        <span className="conditions-icon">🩺</span>
                        <h3>{isArabic ? 'الأمراض المزمنة المسجلة' : 'Your Chronic Conditions'}</h3>
                    </div>
                    <div className="conditions-list">
                        {data.userConditions.map((condition, idx) => (
                            <div key={idx} className="condition-item">
                                <span className="condition-marker">✅</span>
                                <span className="condition-name">{condition.name}</span>
                                {condition.diagnosis_date && (
                                    <span className="condition-date">
                                        {isArabic ? 'تاريخ التشخيص' : 'Diagnosed'}: {new Date(condition.diagnosis_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="conditions-note">
                        💡 {isArabic 
                            ? 'تحليل الأدوية التالي يعتمد على هذه الحالات لمساعدتك في فهم مدى مناسبتها'
                            : 'The following medication analysis is based on these conditions to help you understand their suitability'}
                    </div>
                </div>
            )}

            {!hasConditions && (
                <div className="no-conditions-card">
                    <div className="no-conditions-header">
                        <span className="info-icon">ℹ️</span>
                        <span>{isArabic ? 'لم تقم بتسجيل أي أمراض مزمنة' : 'No chronic conditions recorded'}</span>
                    </div>
                    <p className="no-conditions-text">
                        {isArabic 
                            ? 'لتحليل دقيق لمناسبة الأدوية لحالتك، يرجى تسجيل أمراضك المزمنة في قسم الملف الشخصي'
                            : 'For accurate medication suitability analysis, please record your chronic conditions in your profile'}
                    </p>
                </div>
            )}

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

            {/* ✅ قسم تحليل الأدوية المتقدم مع مناسبة الحالة */}
            {data.medications.count > 0 && deepAnalysis && (
                <>
                    {/* تفاعلات الأدوية */}
                    {deepAnalysis.interactions.length > 0 && (
                        <div className="interactions-card">
                            <div className="interactions-header">
                                <span className="interactions-icon">⚠️</span>
                                <h3>{isArabic ? 'تفاعلات دوائية محتملة' : 'Potential Drug Interactions'}</h3>
                            </div>
                            <div className="interactions-list">
                                {deepAnalysis.interactions.slice(0, 5).map((inter, idx) => (
                                    <div key={idx} className="interaction-item">
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

                    {/* تفاصيل الأدوية مع تحليل المناسبة */}
                    <div className="medications-details">
                        <h3>{isArabic ? 'تفاصيل الأدوية وتحليل المناسبة' : 'Medication Details & Suitability Analysis'}</h3>
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
                                        {/* تحليل مناسبة الدواء للحالة */}
                                        {hasConditions && (
                                            <div className="suitability-section">
                                                <div className="suitability-title">
                                                    {isArabic ? '🔍 تحليل مناسبة الدواء لحالتك' : '🔍 Medication Suitability Analysis'}
                                                </div>
                                                
                                                {/* الأدوية المناسبة */}
                                                {med.suitability.suitable.length > 0 && (
                                                    <div className="suitability-item good">
                                                        <span className="suitability-icon">✅</span>
                                                        <div className="suitability-content">
                                                            <strong>{isArabic ? 'مناسب للحالة' : 'Suitable for condition'}:</strong>
                                                            {med.suitability.suitable.map((s, i) => (
                                                                <div key={i} className="suitability-detail">
                                                                    • {s.condition}: {s.reason}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* الأدوية غير المناسبة */}
                                                {med.suitability.contraindicated.length > 0 && (
                                                    <div className="suitability-item danger">
                                                        <span className="suitability-icon">⚠️</span>
                                                        <div className="suitability-content">
                                                            <strong>{isArabic ? 'قد لا يكون مناسباً' : 'May not be suitable'}:</strong>
                                                            {med.suitability.contraindicated.map((c, i) => (
                                                                <div key={i} className="suitability-detail">
                                                                    • {c.condition}: {c.reason}
                                                                </div>
                                                            ))}
                                                            <div className="suitability-warning">
                                                                🚨 {isArabic 
                                                                    ? 'يُنصح باستشارة طبيبك قبل الاستمرار في تناول هذا الدواء'
                                                                    : 'Consult your doctor before continuing this medication'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* الاستخدامات العامة للدواء */}
                                        {med.generalUses.length > 0 && (
                                            <div className="med-detail-item">
                                                <span className="detail-icon">📋</span>
                                                <span className="detail-label">{isArabic ? 'الاستخدامات العامة' : 'General Uses'}:</span>
                                                <span className="detail-value">{med.generalUses.map(u => u.name).join(', ')}</span>
                                            </div>
                                        )}
                                        
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
                                        
                                        {/* معلومات من FDA */}
                                        {med.fdaInfo && med.fdaInfo.indication !== 'غير متوفر' && (
                                            <details className="fda-details">
                                                <summary className="fda-summary">
                                                    <span className="detail-icon">🏥</span>
                                                    {isArabic ? 'معلومات إضافية من FDA' : 'Additional FDA Information'}
                                                </summary>
                                                <div className="fda-content">
                                                    <p><strong>{isArabic ? 'الاستخدام' : 'Indication'}:</strong> {med.fdaInfo.indication}</p>
                                                    {med.fdaInfo.warnings !== 'غير متوفر' && (
                                                        <p><strong>{isArabic ? 'تحذيرات' : 'Warnings'}:</strong> {med.fdaInfo.warnings}</p>
                                                    )}
                                                </div>
                                            </details>
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
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: none; width: 38px; height: 38px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
                .dark-mode .refresh-btn { background: #334155; color: #94a3b8; }
                .refresh-btn:hover { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; transform: rotate(180deg); }
                
                /* الأمراض المزمنة */
                .conditions-card { background: linear-gradient(135deg, #10b98120, #05966920); border-radius: 20px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; border: 1px solid #10b98140; }
                .conditions-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
                .conditions-icon { font-size: 1.3rem; }
                .conditions-header h3 { margin: 0; font-size: 0.9rem; color: #10b981; }
                .conditions-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
                .condition-item { display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.1); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; }
                .condition-marker { color: #10b981; }
                .condition-date { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); margin-left: 0.5rem; }
                .conditions-note { font-size: 0.7rem; color: var(--text-secondary, #64748b); padding-top: 0.5rem; border-top: 1px solid rgba(16,185,129,0.2); }
                
                .no-conditions-card { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 1rem; margin-bottom: 1.5rem; border: 1px solid var(--border-light, #e2e8f0); text-align: center; }
                .dark-mode .no-conditions-card { background: #0f172a; border-color: #334155; }
                .no-conditions-header { display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
                .no-conditions-text { font-size: 0.7rem; color: var(--text-tertiary, #94a3b8); margin: 0; }
                
                .analytics-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
                .analytics-stat-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--border-light, #e2e8f0); transition: all 0.2s; }
                .dark-mode .analytics-stat-card { background: #0f172a; border-color: #334155; }
                .stat-icon { font-size: 1.8rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; color: white; }
                .stat-value { font-size: 1.4rem; font-weight: 800; }
                .stat-label { font-size: 0.65rem; color: var(--text-secondary, #64748b); }
                
                /* تفاعلات الأدوية */
                .interactions-card { background: linear-gradient(135deg, #ef444420, #dc262620); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; color: #ef4444; }
                .interactions-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
                .interactions-header h3 { margin: 0; font-size: 0.9rem; color: #ef4444; }
                .interaction-item { background: rgba(239,68,68,0.1); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 3px solid #ef4444; }
                .interaction-title { font-weight: 700; font-size: 0.8rem; margin-bottom: 0.25rem; }
                .interaction-desc { font-size: 0.7rem; margin: 0.25rem 0; opacity: 0.9; }
                .interaction-recommendation { font-size: 0.65rem; margin: 0.25rem 0 0; color: #fbbf24; }
                
                /* تفاصيل الأدوية */
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
                
                /* تحليل المناسبة */
                .suitability-section { margin-bottom: 0.75rem; background: rgba(0,0,0,0.03); border-radius: 12px; padding: 0.5rem; }
                .dark-mode .suitability-section { background: rgba(255,255,255,0.03); }
                .suitability-title { font-size: 0.7rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--primary, #6366f1); }
                .suitability-item { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.7rem; }
                .suitability-item.good { color: #10b981; }
                .suitability-item.danger { color: #ef4444; }
                .suitability-icon { font-size: 1rem; }
                .suitability-content { flex: 1; }
                .suitability-detail { margin-top: 0.25rem; margin-left: 0.5rem; }
                .suitability-warning { margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(239,68,68,0.1); border-radius: 8px; font-size: 0.65rem; }
                
                .med-detail-item { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; }
                .detail-icon { font-size: 0.8rem; }
                .detail-label { font-weight: 600; color: var(--text-secondary, #64748b); min-width: 80px; }
                .detail-value { font-weight: 500; }
                .detail-reason { font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); width: 100%; margin-top: 0.25rem; margin-left: 1.5rem; }
                
                .fda-details { margin-top: 0.5rem; cursor: pointer; }
                .fda-summary { font-size: 0.7rem; color: var(--primary, #6366f1); }
                .fda-content { margin-top: 0.5rem; padding: 0.5rem; background: rgba(99,102,241,0.05); border-radius: 8px; font-size: 0.65rem; }
                
                .analytics-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.25rem; background: var(--secondary-bg, #f8fafc); border-radius: 50px; border: 1px solid var(--border-light, #e2e8f0); }
                .analytics-tabs button { flex: 1; padding: 0.5rem 1rem; background: transparent; border: none; border-radius: 40px; cursor: pointer; font-weight: 600; color: var(--text-secondary, #64748b); transition: all 0.2s; }
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
                
                .analytics-footer { text-align: center; padding-top: 1rem; border-top: 1px solid var(--border-light, #e2e8f0); font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                
                @media (max-width: 768px) { 
                    .analytics-stats-grid { grid-template-columns: repeat(2, 1fr); } 
                    .med-detail-item { flex-direction: column; gap: 0.25rem; } 
                    .detail-label { min-width: auto; }
                    .conditions-list { flex-direction: column; }
                }
            `}</style>
        </div>
    );
};

export default HabitAnalytics;