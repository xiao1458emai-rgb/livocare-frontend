'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { extractText, getDocumentProxy } from 'unpdf';
import axios from 'axios';
import axiosInstance from '../services/api';
import HabitAnalytics from './Analytics/HabitAnalytics';
import BarcodeScanner from '../components/Camera/BarcodeScanner';
import '../index.css';

// ==================== دوال مساعدة ====================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const calculatePoints = (habitName, isCompleted, habitType) => {
    if (!isCompleted) return 0;
    if (habitType === 'medication') return 0;
    
    const pointsMap = {
        'sleep': 15, 'نوم': 15,
        'water': 10, 'ماء': 10,
        'exercise': 20, 'رياضة': 20, 'مشي': 15, 'جري': 20,
        'reading': 10, 'قراءة': 10,
        'meditation': 15, 'تأمل': 15,
        'healthy_meal': 10, 'أكل صحي': 10
    };
    
    for (const [key, points] of Object.entries(pointsMap)) {
        if (habitName.toLowerCase().includes(key)) {
            return points;
        }
    }
    return 5;
};

const getStoredHabitType = (habitId) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`habit_type_${habitId}`);
};

const setStoredHabitType = (habitId, type) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`habit_type_${habitId}`, type);
    window.dispatchEvent(new CustomEvent('habitTypeChanged', { detail: { habitId, type } }));
};

const detectHabitType = (habitName, habitDescription = '', habitId = null) => {
    const storedType = habitId ? getStoredHabitType(habitId) : null;
    if (storedType === 'medication') return 'medication';
    if (storedType === 'habit') return 'habit';
    
    const text = (habitName + ' ' + habitDescription).toLowerCase();
    
    const strongMedicationKeywords = [
        'دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment',
        'مضاد حيوي', 'antibiotic', 'مسكن', 'painkiller', 'ibuprofen',
        'paracetamol', 'advil', 'tylenol', 'aspirin', 'metformin',
        'lisinopril', 'amlodipine', 'atorvastatin', 'simvastatin'
    ];
    
    const doseUnits = ['mg', 'ملجم', 'mcg', 'ميكروجرام', 'g', 'جرام', 'ml', 'مل'];
    
    const habitKeywords = [
        'تمرين', 'exercise', 'رياضة', 'sport', 'مشي', 'walk', 'جري', 'run',
        'يوجا', 'yoga', 'تأمل', 'meditation', 'قراءة', 'reading',
        'ماء', 'water', 'شرب', 'drink', 'نوم', 'sleep', 'استيقاظ', 'wake',
        'فطور', 'breakfast', 'غداء', 'lunch', 'عشاء', 'dinner'
    ];
    
    for (const keyword of strongMedicationKeywords) {
        if (text.includes(keyword)) return 'medication';
    }
    
    for (const unit of doseUnits) {
        if (text.includes(unit)) return 'medication';
    }
    
    for (const keyword of habitKeywords) {
        if (text.includes(keyword)) return 'habit';
    }
    
    if (habitDescription && (
        habitDescription.includes('mg') || 
        habitDescription.includes('ملجم') ||
        habitDescription.includes('مرة يومياً')
    )) {
        return 'medication';
    }
    
    if (habitDescription.includes('💊') || habitDescription.includes('🏭')) {
        return 'medication';
    }
    
    return 'habit';
};

const toggleHabitType = (habitId, currentType, habitName, showMessage, isArabic) => {
    const newType = currentType === 'medication' ? 'habit' : 'medication';
    setStoredHabitType(habitId, newType);
    
    const message = isArabic 
        ? `تم تغيير "${habitName}" إلى ${newType === 'medication' ? 'دواء' : 'عادة'}`
        : `Changed "${habitName}" to ${newType === 'medication' ? 'medication' : 'habit'}`;
    
    if (showMessage) showMessage(message, 'info');
    return newType;
};

const getHabitIcon = (habitType) => {
    switch (habitType) {
        case 'medication': return '💊';
        case 'water': return '💧';
        case 'exercise': return '🏃';
        case 'sleep': return '😴';
        case 'healthy': return '🥗';
        default: return '✅';
    }
};
// ✅ دالة بسيطة لاستخراج الأمراض من النص
const extractDiseasesFromText = (text) => {
    if (!text || !text.trim()) return [];
    
    const diseases = [];
    const diseaseKeywords = {
        'diabetes': ['سكري', 'diabetes', 'diabetic', 'type 1', 'type 2', 'سكر'],
        'hypertension': ['ضغط', 'hypertension', 'high blood pressure', 'hypertensive', 'ارتفاع ضغط'],
        'asthma': ['ربو', 'asthma', 'bronchial'],
        'heart_disease': ['قلب', 'heart', 'cardiac', 'cardiovascular', 'coronary'],
        'arthritis': ['التهاب مفاصل', 'arthritis', 'rheumatoid', 'osteoarthritis'],
        'thyroid': ['غدة درقية', 'thyroid', 'hypothyroidism', 'hyperthyroidism'],
        'anemia': ['أنيميا', 'anemia', 'فقر دم', 'hemoglobin'],
        'migraine': ['صداع نصفي', 'migraine', 'شقيقة'],
        'allergy': ['حساسية', 'allergy', 'allergic', 'hay fever'],
        'depression': ['اكتئاب', 'depression', 'depressive'],
        'anxiety': ['قلق', 'anxiety', 'anxious', 'panic disorder'],
        'obesity': ['سمنة', 'obesity', 'overweight', 'obese'],
        'kidney_disease': ['كلية', 'kidney', 'renal', 'ckd', 'kidney failure'],
        'liver_disease': ['كبد', 'liver', 'hepatic', 'cirrhosis', 'hepatitis'],
        'cancer': ['سرطان', 'cancer', 'tumor', 'malignant', 'carcinoma'],
        'copd': ['copd', 'chronic obstructive', 'انسداد رئوي'],
        'osteoporosis': ['هشاشة', 'osteoporosis', 'bone density'],
        'psoriasis': ['صدفية', 'psoriasis', 'plaque psoriasis'],
        'epilepsy': ['صرع', 'epilepsy', 'seizure', 'epileptic']
    };
    
    const textLower = text.toLowerCase();
    const foundDiseases = new Set();
    
    for (const [key, keywords] of Object.entries(diseaseKeywords)) {
        for (const keyword of keywords) {
            if (textLower.includes(keyword.toLowerCase())) {
                // الحصول على الاسم العربي للمرض
                const arabicName = diseaseKeywords[key][0] || key;
                foundDiseases.add(arabicName);
                break;
            }
        }
    }
    
    // إزالة التكرارات وتحويلها إلى مصفوفة
    return Array.from(foundDiseases);
};
// ==================== المكون الرئيسي ====================

function HabitTracker({ isAuthReady, isArabic: propIsArabic }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = propIsArabic !== undefined ? propIsArabic : (lang === 'ar');
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    
    // حالات البيانات
    const [definitions, setDefinitions] = useState([]);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDescription, setNewHabitDescription] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [showScanner, setShowScanner] = useState(false);
    const [userPoints, setUserPoints] = useState(0);
    const [weeklyPoints, setWeeklyPoints] = useState(0);
    const [streakDays, setStreakDays] = useState(0);
    const [todayLogs, setTodayLogs] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // ✅ حالة البحث عن الأدوية
    const [drugSearchQuery, setDrugSearchQuery] = useState('');
    const [drugSearchResults, setDrugSearchResults] = useState([]);
    const [searchingDrug, setSearchingDrug] = useState(false);
    const [searchType, setSearchType] = useState('name');
    
    // ✅ حالات الأمراض المزمنة والسجلات الطبية
    const [chronicConditions, setChronicConditions] = useState([]);
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [showMedicalRecordForm, setShowMedicalRecordForm] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [processingResult, setProcessingResult] = useState(null);
    const [loadingConditions, setLoadingConditions] = useState(false);
    const [newMedicalRecord, setNewMedicalRecord] = useState({
        event_type: '',
        event_date: new Date().toISOString().split('T')[0],
        details: ''
    });
    const [activeTab, setActiveTab] = useState('habits');
    
    // ✅ حالات تحليلات العادات
    const [habitAnalyticsData, setHabitAnalyticsData] = useState(null);
    const [habitRecommendations, setHabitRecommendations] = useState([]);
    const [habitPredictions, setHabitPredictions] = useState([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    // ✅ الاستماع لتغيير نوع العادة
    useEffect(() => {
        const handleTypeChange = () => {
            setRefreshKey(prev => prev + 1);
            fetchHabitDefinitions();
            fetchHabitAnalyticsData();
        };
        window.addEventListener('habitTypeChanged', handleTypeChange);
        return () => window.removeEventListener('habitTypeChanged', handleTypeChange);
    }, []);
// ✅ تحميل التحليلات عند تغيير التبويب - فقط تحديث refreshTrigger
    useEffect(() => {
        if (activeTab === 'analytics') {
            setRefreshAnalytics(prev => prev + 1);
        }
}, [activeTab]);
    // ✅ عرض رسالة مؤقتة
    const showMessage = useCallback((msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 3000);
    }, []);

    // ✅ جلب الأمراض المزمنة
    const fetchChronicConditions = useCallback(async () => {
        if (!isAuthReady) return;
        setLoadingConditions(true);
        try {
            const response = await axiosInstance.get('/user/conditions/');
            if (response.data?.success) {
                setChronicConditions(response.data.conditions || []);
            } else if (Array.isArray(response.data)) {
                setChronicConditions(response.data);
            } else if (response.data?.results) {
                setChronicConditions(response.data.results);
            }
        } catch (error) {
            console.error('Error fetching conditions:', error);
        } finally {
            setLoadingConditions(false);
        }
    }, [isAuthReady]);

    // ✅ جلب السجلات الطبية
    const fetchMedicalRecords = useCallback(async () => {
        if (!isAuthReady) return;
        try {
            const response = await axiosInstance.get('/medical-records/');
            if (response.data?.success) {
                setMedicalRecords(response.data.records || []);
            } else if (Array.isArray(response.data)) {
                setMedicalRecords(response.data);
            } else if (response.data?.results) {
                setMedicalRecords(response.data.results);
            }
        } catch (error) {
            console.error('Error fetching medical records:', error);
        }
    }, [isAuthReady]);

    // ✅ جلب تحليلات العادات
    const fetchHabitAnalyticsData = useCallback(async () => {
        if (!isAuthReady) return;
        setLoadingAnalytics(true);
        try {
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            if (response.data?.success) {
                setHabitAnalyticsData(response.data.data);
                console.log('📊 Habit analytics loaded:', response.data.data);
            }
        } catch (error) {
            console.error('Error fetching habit analytics:', error);
        } finally {
            setLoadingAnalytics(false);
        }
    }, [isAuthReady, isArabic]);

    // ✅ جلب توصيات العادات
    const fetchHabitRecommendationsData = useCallback(async () => {
        if (!isAuthReady) return;
        try {
            const response = await axiosInstance.get('/habits/recommendations/?limit=5&lang=' + (isArabic ? 'ar' : 'en'));
            if (response.data?.success) {
                setHabitRecommendations(response.data.recommendations || []);
                console.log('💡 Habit recommendations loaded:', response.data.recommendations);
            }
        } catch (error) {
            console.error('Error fetching habit recommendations:', error);
            setHabitRecommendations([]);
        }
    }, [isAuthReady, isArabic]);

    // ✅ جلب توقعات العادات
    const fetchHabitPredictionsData = useCallback(async () => {
        if (!isAuthReady) return;
        try {
            const response = await axiosInstance.get('/habits/predictions/?days=7&lang=' + (isArabic ? 'ar' : 'en'));
            if (response.data?.success) {
                setHabitPredictions(response.data.predictions || []);
                console.log('🔮 Habit predictions loaded:', response.data.predictions);
            }
        } catch (error) {
            console.error('Error fetching habit predictions:', error);
            setHabitPredictions([]);
        }
    }, [isAuthReady, isArabic]);

    // ✅ دالة جلب تعريفات العادات
    const fetchHabitDefinitions = useCallback(async () => {
        if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        
        try {
            const [defResponse, logsResponse, todayResponse] = await Promise.all([
                axiosInstance.get('/habit-definitions/'),
                axiosInstance.get('/habit-logs/'),
                axiosInstance.get('/habit-logs/today/')
            ]);
            
            if (!isMountedRef.current) return;
            
            let definitionsData = [];
            if (defResponse.data?.results) definitionsData = defResponse.data.results;
            else if (Array.isArray(defResponse.data)) definitionsData = defResponse.data;
            
            let logsData = [];
            if (logsResponse.data?.results) logsData = logsResponse.data.results;
            else if (Array.isArray(logsResponse.data)) logsData = logsResponse.data;
            
            let todayData = [];
            if (todayResponse.data?.results) todayData = todayResponse.data.results;
            else if (Array.isArray(todayResponse.data)) todayData = todayResponse.data;
            
            console.log('📋 Habits loaded:', definitionsData.length);
            
            setDefinitions(definitionsData);
            setLogs(logsData);
            setTodayLogs(todayData);
            
        } catch (error) {
            console.error('Failed to fetch habits:', error);
            if (isMountedRef.current) {
                showMessage(isArabic ? '❌ فشل في تحميل العادات' : '❌ Failed to load habits', 'error');
                setDefinitions([]);
                setLogs([]);
                setTodayLogs([]);
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isAuthReady, isArabic, showMessage, refreshKey]);

    // ✅ رفع ملف PDF وتحليله
// ✅ رفع ملف PDF وتحليله (باستخدام unpdf في المتصفح)
const handleFileUpload = useCallback(async (e) => {
    e.preventDefault();
    
    const file = selectedFile;
    if (!file) {
        showMessage(isArabic ? '❌ الرجاء اختيار ملف' : '❌ Please select a file', 'error');
        return;
    }
    
    if (!file.type.includes('pdf')) {
        showMessage(isArabic ? '❌ يرجى رفع ملف PDF فقط' : '❌ Please upload a PDF file only', 'error');
        return;
    }
    
    if (!newMedicalRecord.event_type) {
        showMessage(isArabic ? '❌ الرجاء إدخال نوع السجل' : '❌ Please enter record type', 'error');
        return;
    }
    
    setUploadingFile(true);
    setUploadProgress(0);
    
    try {
        // ✅ 1. استخراج النص من PDF باستخدام unpdf (في المتصفح)
        const buffer = await file.arrayBuffer();
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { totalPages, text: extractedFullText } = await extractText(pdf, { mergePages: true });
        
        console.log(`📄 تم استخراج النص من ${totalPages} صفحة بنجاح`);
        console.log(`📝 النص المستخرج: ${extractedFullText.substring(0, 200)}...`);
        
        // ✅ 2. استخراج الأمراض من النص (دالة تحليل بسيطة)
        const extractedDiseases = extractDiseasesFromText(extractedFullText);
        
        // ✅ 3. إرسال البيانات إلى الخادم للحفظ فقط (بدون معالجة ثقيلة)
        const response = await axiosInstance.post('/medical-records/save-with-conditions/', {
            event_type: newMedicalRecord.event_type,
            event_date: newMedicalRecord.event_date,
            details: newMedicalRecord.details,
            extracted_diseases: extractedDiseases,
            extracted_text_preview: extractedFullText.substring(0, 500)
        });
        
        if (response.data?.success) {
            setProcessingResult(response.data);
            showMessage(isArabic ? '✅ تم رفع الملف وتحليله بنجاح' : '✅ File uploaded and analyzed successfully', 'success');
            
            await fetchMedicalRecords();
            await fetchChronicConditions();
            
            setTimeout(() => {
                setShowMedicalRecordForm(false);
                setSelectedFile(null);
                setProcessingResult(null);
                setNewMedicalRecord({ 
                    event_type: '', 
                    event_date: new Date().toISOString().split('T')[0], 
                    details: '' 
                });
            }, 3000);
        } else {
            showMessage(response.data?.error || (isArabic ? '❌ خطأ في رفع الملف' : '❌ Error uploading file'), 'error');
        }
    } catch (error) {
        console.error('Error processing PDF:', error);
        showMessage(isArabic ? '❌ خطأ في قراءة وتحليل الملف' : '❌ Error reading and analyzing file', 'error');
    } finally {
        setUploadingFile(false);
        setUploadProgress(0);
    }
}, [selectedFile, newMedicalRecord, isArabic, showMessage, fetchMedicalRecords, fetchChronicConditions]);

    // ✅ حذف مرض مزمن
    const handleDeleteCondition = useCallback(async (conditionId) => {
        if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا المرض؟' : 'Are you sure you want to delete this condition?')) return;
        
        try {
            await axiosInstance.delete(`/conditions/${conditionId}/`);
            setChronicConditions(prev => prev.filter(c => c.id !== conditionId));
            showMessage(isArabic ? '✅ تم حذف المرض بنجاح' : '✅ Condition deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting condition:', error);
            showMessage(isArabic ? '❌ خطأ في حذف المرض' : '❌ Error deleting condition', 'error');
        }
    }, [isArabic, showMessage]);

    // ✅ حذف سجل طبي
    const handleDeleteMedicalRecord = useCallback(async (recordId) => {
        if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?')) return;
        
        try {
            await axiosInstance.delete(`/medical-records/${recordId}/delete/`);
            setMedicalRecords(prev => prev.filter(r => r.id !== recordId));
            showMessage(isArabic ? '✅ تم حذف السجل بنجاح' : '✅ Record deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting record:', error);
            showMessage(isArabic ? '❌ خطأ في حذف السجل' : '❌ Error deleting record', 'error');
        }
    }, [isArabic, showMessage]);

    // ✅ البحث في FDA
    const searchDrugInFDA = useCallback(async (query, type = 'name') => {
        if (!query || query.trim() === '') {
            showMessage(isArabic ? '⚠️ الرجاء إدخال اسم الدواء أو رمز NDC' : '⚠️ Please enter drug name or NDC code', 'error');
            return;
        }
        
        setSearchingDrug(true);
        setDrugSearchResults([]);
        
        try {
            let endpoint = '', searchParam = '';
            
            if (type === 'name') {
                endpoint = 'drug/drugsfda.json';
                searchParam = `search=openfda.brand_name:"${encodeURIComponent(query)}"+or+openfda.generic_name:"${encodeURIComponent(query)}"&limit=10`;
            } else {
                endpoint = 'drug/ndc.json';
                let cleanNDC = query.replace(/-/g, '');
                if (cleanNDC.length === 10 && !cleanNDC.includes('-')) {
                    searchParam = `search=product_ndc:"${cleanNDC.slice(0,2)}-${cleanNDC.slice(2,5)}-${cleanNDC.slice(5)}"&limit=5`;
                } else {
                    searchParam = `search=product_ndc:"${cleanNDC}"&limit=5`;
                }
            }
            
            const response = await axios.get(`https://api.fda.gov/${endpoint}?${searchParam}`, { timeout: 15000 });
            
            if (response.data && response.data.results && response.data.results.length > 0) {
                const results = response.data.results.map(drug => {
                    const openfda = drug.openfda || {};
                    const products = drug.products || [];
                    return {
                        brand_name: openfda.brand_name?.[0] || '',
                        generic_name: openfda.generic_name?.[0] || '',
                        manufacturer: openfda.manufacturer_name?.[0] || products[0]?.manufacturer_name || '',
                        route: products[0]?.route || '',
                        dosage_form: products[0]?.dosage_form || '',
                        product_ndc: openfda.product_ndc?.[0] || '',
                        id: drug.id,
                        substance_name: openfda.substance_name?.[0] || ''
                    };
                }).filter(d => d.brand_name || d.generic_name);
                
                const uniqueResults = [];
                const seen = new Set();
                for (const drug of results) {
                    const key = drug.brand_name || drug.generic_name;
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        uniqueResults.push(drug);
                    }
                }
                
                setDrugSearchResults(uniqueResults.slice(0, 10));
                showMessage(isArabic ? `✅ تم العثور على ${uniqueResults.length} دواء` : `✅ Found ${uniqueResults.length} medications`, 'success');
            } else {
                setDrugSearchResults([]);
                showMessage(isArabic ? `⚠️ لم يتم العثور على دواء: ${query}` : `⚠️ No medication found: ${query}`, 'error');
            }
        } catch (error) {
            console.error('Error searching FDA:', error);
            showMessage(isArabic ? '❌ خطأ في الاتصال بقاعدة البيانات' : '❌ Error connecting to database', 'error');
        } finally {
            setSearchingDrug(false);
        }
    }, [isArabic, showMessage]);

    // ✅ اختيار دواء
    const selectDrug = useCallback((drug) => {
        setNewHabitName(drug.brand_name || drug.generic_name);
        
        const descriptionParts = [];
        if (drug.generic_name) descriptionParts.push(`💊 ${drug.generic_name}`);
        if (drug.manufacturer) descriptionParts.push(`🏭 ${drug.manufacturer}`);
        if (drug.route) descriptionParts.push(`💉 ${drug.route}`);
        if (drug.dosage_form) descriptionParts.push(`📦 ${drug.dosage_form}`);
        if (drug.product_ndc) descriptionParts.push(`🔢 ${drug.product_ndc}`);
        
        setNewHabitDescription(descriptionParts.join(' | '));
        showMessage(isArabic ? `✅ تم اختيار الدواء: ${drug.brand_name || drug.generic_name}` : `✅ Selected: ${drug.brand_name || drug.generic_name}`, 'success');
        setDrugSearchResults([]);
        setDrugSearchQuery('');
    }, [isArabic, showMessage]);

    // ✅ إضافة عادة/دواء جديد
    const handleAddDefinition = useCallback(async (e) => {
        e.preventDefault();
        
        if (!isAuthReady) {
            showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
            return;
        }

        const existingHabit = definitions.find(d => 
            d.name.toLowerCase() === newHabitName.trim().toLowerCase()
        );
        
        if (existingHabit) {
            showMessage(isArabic ? `⚠️ "${newHabitName}" موجود مسبقاً` : `⚠️ "${newHabitName}" already exists`, 'error');
            return;
        }

        if (!newHabitName.trim() || !newHabitDescription.trim()) {
            showMessage(isArabic ? '⚠️ الرجاء إدخال اسم ووصف' : '⚠️ Please enter name and description', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await axiosInstance.post('/habit-definitions/', { 
                name: newHabitName.trim(), 
                description: newHabitDescription.trim(),
                frequency: 'Daily'
            });
            
            const isDrug = newHabitDescription.includes('💊') || 
                          newHabitDescription.includes('mg') || 
                          newHabitDescription.includes('ملجم');
            
            if (isDrug && response.data?.id) {
                setStoredHabitType(response.data.id, 'medication');
            }
            
            showMessage(isArabic ? `✅ تم إضافة "${newHabitName}" بنجاح` : `✅ Successfully added "${newHabitName}"`, 'success');
            setNewHabitName('');
            setNewHabitDescription('');
            await fetchHabitDefinitions();
            await fetchHabitAnalyticsData();
            
            setRefreshAnalytics(prev => prev + 1);
            setRefreshKey(prev => prev + 1);
            
        } catch (error) {
            console.error('Failed to add:', error);
            showMessage(isArabic ? '❌ فشل في الإضافة' : '❌ Failed to add', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthReady, definitions, newHabitName, newHabitDescription, isArabic, showMessage, fetchHabitDefinitions, fetchHabitAnalyticsData]);

    // ✅ تبديل حالة إنجاز العادة/الدواء
    const handleToggleLog = useCallback(async (habitId) => {
        if (!isAuthReady) {
            showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
            return;
        }
        
        const existingLog = todayLogs.find(log => (log.habit?.id || log.habit) === habitId);
        const habit = definitions.find(d => d.id === habitId);
        const habitType = habit ? detectHabitType(habit.name, habit.description, habit.id) : 'habit';
        
        setLoading(true);

        try {
            if (existingLog && existingLog.id) {
                await axiosInstance.delete(`/habit-logs/${existingLog.id}/`);
                showMessage(isArabic ? `↩️ تم إلغاء "${habit?.name}"` : `↩️ Undid "${habit?.name}"`, 'info');
            } else {
                await axiosInstance.post('/habit-logs/complete/', { habit_id: habitId, notes: '' });
                const points = calculatePoints(habit?.name || '', true, habitType);
                if (points > 0) {
                    showMessage(isArabic ? `✅ تم إنجاز "${habit?.name}" (+${points} نقطة)` : `✅ Completed "${habit?.name}" (+${points} points)`, 'success');
                } else {
                    showMessage(isArabic ? `✅ تم إنجاز "${habit?.name}"` : `✅ Completed "${habit?.name}"`, 'success');
                }
            }
            await fetchHabitDefinitions();
            await fetchHabitAnalyticsData();
            
            setRefreshAnalytics(prev => prev + 1);
            setRefreshKey(prev => prev + 1);
            
        } catch (error) {
            console.error('Failed to update:', error);
            showMessage(isArabic ? '❌ فشل في التحديث' : '❌ Failed to update', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthReady, todayLogs, definitions, isArabic, showMessage, fetchHabitDefinitions, fetchHabitAnalyticsData]);

    // ✅ مسح الباركود
    const handleScanComplete = useCallback((result) => {
        if (result) {
            searchDrugInFDA(result, 'ndc');
            setShowScanner(false);
        }
    }, [searchDrugInFDA]);

    // ✅ تصفية البيانات
    const safeDefinitions = Array.isArray(definitions) ? definitions : [];
    
    const getItemType = (item) => {
        return detectHabitType(item.name, item.description, item.id);
    };
    
    const medications = safeDefinitions.filter(h => getItemType(h) === 'medication');
    const regularHabits = safeDefinitions.filter(h => getItemType(h) !== 'medication');
    
    const completedTodayCount = todayLogs.filter(log => {
        const habit = safeDefinitions.find(d => d.id === (log.habit?.id || log.habit));
        if (!habit) return false;
        const habitType = getItemType(habit);
        return log.is_completed && habitType !== 'medication';
    }).length;
    
    const completionPercentage = regularHabits.length > 0 
        ? Math.round((completedTodayCount / regularHabits.length) * 100) 
        : 0;

    // ✅ تحميل البيانات الأولية
    useEffect(() => {
        if (isAuthReady) {
            fetchHabitDefinitions();
            fetchChronicConditions();
            fetchMedicalRecords();
            fetchHabitAnalyticsData();
        }
    }, [isAuthReady, fetchHabitDefinitions, fetchChronicConditions, fetchMedicalRecords, fetchHabitAnalyticsData]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // ✅ تحميل التوصيات والتوقعات عند تغيير التبويب
    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchHabitRecommendationsData();
            fetchHabitPredictionsData();
        }
    }, [activeTab, fetchHabitRecommendationsData, fetchHabitPredictionsData]);

    // ✅ حساب النقاط
    useEffect(() => {
        if (logs.length === 0 || definitions.length === 0) return;
        
        const todayPoints = todayLogs.reduce((sum, log) => {
            if (log.is_completed) {
                const habit = definitions.find(d => d.id === (log.habit?.id || log.habit));
                if (habit) {
                    const habitType = detectHabitType(habit.name, habit.description, habit.id);
                    return sum + calculatePoints(habit.name, true, habitType);
                }
            }
            return sum;
        }, 0);
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weekPoints = logs.reduce((sum, log) => {
            const logDate = new Date(log.log_date);
            if (logDate >= weekAgo && log.is_completed) {
                const habit = definitions.find(d => d.id === (log.habit?.id || log.habit));
                if (habit) {
                    const habitType = detectHabitType(habit.name, habit.description, habit.id);
                    return sum + calculatePoints(habit.name, true, habitType);
                }
            }
            return sum;
        }, 0);
        
        setUserPoints(todayPoints);
        setWeeklyPoints(weekPoints);
        
        let streak = 0;
        const checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        while (true) {
            const dateStr = checkDate.toDateString();
            const hasLogOnDate = logs.some(log => {
                const logDate = new Date(log.log_date);
                logDate.setHours(0, 0, 0, 0);
                const habit = definitions.find(d => d.id === (log.habit?.id || log.habit));
                if (!habit) return false;
                const habitType = detectHabitType(habit.name, habit.description, habit.id);
                return logDate.toDateString() === dateStr && log.is_completed && habitType !== 'medication';
            });
            
            if (hasLogOnDate) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }
        
        setStreakDays(streak);
    }, [logs, definitions, todayLogs, refreshKey]);

    return (
        <div className="habit-tracker-container">
            {/* ماسح الباركود */}
            {showScanner && (
                <div className="scanner-modal" onClick={() => setShowScanner(false)}>
                    <div className="scanner-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="scanner-header">
                            <h3>📷 {isArabic ? 'مسح الباركود' : 'Scan Barcode'}</h3>
                            <button className="close-btn" onClick={() => setShowScanner(false)}>✕</button>
                        </div>
                        <BarcodeScanner onScan={handleScanComplete} onClose={() => setShowScanner(false)} />
                        <div className="scanner-footer">
                            <p>📱 {isArabic ? 'ضع رمز المنتج داخل الإطار للمسح' : 'Place the barcode inside the frame to scan'}</p>
                            <button className="cancel-btn" onClick={() => setShowScanner(false)}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* رأس الصفحة */}
            <div className="habits-header">
                <h2 className="habits-title">
                    {isArabic ? '📋 العادات والأدوية' : '📋 Habits & Medications'}
                </h2>
                <div className="habits-date">
                    📅 {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* التبويبات */}
            <div className="analytics-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('habits')}
                >
                    ✅ {isArabic ? 'العادات والأدوية' : 'Habits & Meds'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('conditions')}
                >
                    🩺 {isArabic ? 'الأمراض المزمنة' : 'Chronic Conditions'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('records')}
                >
                    📄 {isArabic ? 'السجلات الطبية' : 'Medical Records'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('analytics')}
                >
                    🤖 {isArabic ? 'تحليلات ذكية' : 'AI Analytics'}
                </button>
            </div>

            {/* ==================== تبويب العادات والأدوية ==================== */}
            {activeTab === 'habits' && (
                <>
                    {/* قسم البحث عن الأدوية */}
                    <div className="drug-search-section">
                        <div className="section-header-inline">
                            <div className="section-title-icon">
                                <span className="icon">💊</span>
                                <h3>{isArabic ? 'البحث عن دواء' : 'Search Medications'}</h3>
                            </div>
                            <p className="section-desc">
                                {isArabic ? 'ابحث عن الأدوية في قاعدة بيانات FDA' : 'Search medications in FDA database'}
                            </p>
                        </div>
                        
                        <div className="search-bar">
                            <input
                                type="text"
                                value={drugSearchQuery}
                                onChange={(e) => setDrugSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchDrugInFDA(drugSearchQuery, searchType)}
                                placeholder={isArabic ? '🔍 اسم الدواء أو رمز NDC...' : '🔍 Drug name or NDC code...'}
                                className="search-input"
                            />
                            <div className="search-actions">
                                <button onClick={() => { setSearchType('name'); searchDrugInFDA(drugSearchQuery, 'name'); }}
                                    disabled={searchingDrug || !drugSearchQuery}
                                    className={`search-btn ${searchType === 'name' ? 'active' : ''}`}>
                                    {searchingDrug && searchType === 'name' ? '⏳' : '🔍'} {isArabic ? 'اسم' : 'Name'}
                                </button>
                                <button onClick={() => { setSearchType('ndc'); searchDrugInFDA(drugSearchQuery, 'ndc'); }}
                                    disabled={searchingDrug || !drugSearchQuery}
                                    className={`search-btn ${searchType === 'ndc' ? 'active' : ''}`}>
                                    {searchingDrug && searchType === 'ndc' ? '⏳' : '#️⃣'} NDC
                                </button>
                                <button onClick={() => setShowScanner(true)} className="scan-btn">
                                    📷 {isArabic ? 'مسح باركود' : 'Scan Barcode'}
                                </button>
                            </div>
                        </div>
                        
                        {drugSearchResults.length > 0 && (
                            <div className="drug-results">
                                <div className="results-header">📋 {isArabic ? `نتائج (${drugSearchResults.length})` : `Results (${drugSearchResults.length})`}</div>
                                <div className="results-list">
                                    {drugSearchResults.map((drug, idx) => (
                                        <div key={idx} className="drug-result-item" onClick={() => selectDrug(drug)}>
                                            <div className="drug-name">
                                                <strong>{drug.brand_name || drug.generic_name}</strong>
                                                {drug.generic_name && drug.brand_name && <span className="drug-generic">({drug.generic_name})</span>}
                                            </div>
                                            <div className="drug-details">
                                                {drug.manufacturer && <span>🏭 {drug.manufacturer}</span>}
                                                {drug.route && <span>💉 {drug.route}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* نقاط المستخدم */}
                    {(userPoints > 0 || weeklyPoints > 0 || streakDays > 0) && (
                        <div className="points-section">
                            <div className="points-header">
                                <span className="points-icon">🏆</span>
                                <h3>{isArabic ? 'نقاطك' : 'Your Points'}</h3>
                            </div>
                            <div className="points-grid">
                                <div className="point-card"><div className="point-value">{userPoints}</div><div className="point-label">{isArabic ? 'نقاط اليوم' : "Today's Points"}</div></div>
                                <div className="point-card"><div className="point-value">{weeklyPoints}</div><div className="point-label">{isArabic ? 'نقاط الأسبوع' : "Week's Points"}</div></div>
                                <div className="point-card"><div className="point-value">{streakDays}</div><div className="point-label">{isArabic ? 'أيام متتالية' : 'Day Streak'}</div></div>
                            </div>
                        </div>
                    )}

                    {/* رسائل الإشعارات */}
                    {message && (
                        <div className={`notification-toast ${messageType}`}>
                            <span>{messageType === 'success' ? '✅' : messageType === 'error' ? '❌' : 'ℹ️'}</span>
                            <span>{message}</span>
                            <button onClick={() => setMessage('')}>✕</button>
                        </div>
                    )}

                    {/* تقدم العادات اليومية */}
                    {isAuthReady && regularHabits.length > 0 && (
                        <div className="progress-section">
                            <div className="progress-header">
                                <span className="progress-icon">📊</span>
                                <h3>{isArabic ? 'تقدم العادات اليومية' : 'Daily Habits Progress'}</h3>
                            </div>
                            <div className="progress-stats">
                                <div className="progress-count">{completedTodayCount}/{regularHabits.length} {isArabic ? 'تم' : 'completed'}</div>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div></div>
                                    <div className="progress-percentage">{completionPercentage}%</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* إضافة جديدة */}
                    <div className="add-habit-section">
                        <div className="section-header-inline">
                            <div className="section-title-icon">
                                <span className="icon">➕</span>
                                <h3>{isArabic ? 'إضافة جديدة' : 'Add New'}</h3>
                            </div>
                        </div>
                        <form onSubmit={handleAddDefinition} className="add-habit-form">
                            <div className="form-group">
                                <label>{isArabic ? 'الاسم' : 'Name'}</label>
                                <input type="text" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)}
                                    placeholder={isArabic ? 'اسم العادة أو الدواء...' : 'Habit or medication name...'}
                                    required disabled={!isAuthReady || loading} />
                            </div>
                            <div className="form-group">
                                <label>{isArabic ? 'الوصف' : 'Description'}</label>
                                <textarea value={newHabitDescription} onChange={(e) => setNewHabitDescription(e.target.value)}
                                    placeholder={isArabic ? 'وصف تفصيلي...' : 'Detailed description...'}
                                    required rows="3" disabled={!isAuthReady || loading} />
                            </div>
                            <button type="submit" disabled={loading || !isAuthReady} className="submit-btn">
                                {loading ? <><span className="spinner-small"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</> : <>{isArabic ? '➕ إضافة' : '➕ Add'}</>}
                            </button>
                        </form>
                    </div>

                    {/* قائمة العادات */}
                    <div className="habits-list-section">
                        <div className="section-header-inline">
                            <div className="section-title-icon"><span className="icon">✅</span><h3>{isArabic ? 'العادات' : 'Habits'}</h3></div>
                            {regularHabits.length > 0 && <div className="habits-count">📋 {regularHabits.length} {isArabic ? 'عادة' : 'habits'}</div>}
                        </div>
                        
                        {loading && isAuthReady && (<div className="loading-state"><div className="spinner"></div><p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p></div>)}
                        
                        {isAuthReady && regularHabits.length === 0 && !loading && (
                            <div className="empty-state"><div className="empty-icon">✅</div><h4>{isArabic ? 'لا توجد عادات' : 'No habits'}</h4><p>{isArabic ? 'أضف عاداتك الجديدة أعلاه' : 'Add your habits above'}</p></div>
                        )}
                        
                        {regularHabits.length > 0 && (
                            <div className="habits-grid">
                                {regularHabits.map((habit) => {
                                    const todayLog = todayLogs.find(log => (log.habit?.id || log.habit) === habit.id);
                                    const isCompleted = todayLog?.is_completed || false;
                                    const habitType = getItemType(habit);
                                    const habitIcon = getHabitIcon(habitType);
                                    const points = calculatePoints(habit.name, isCompleted, habitType);
                                    
                                    return (
                                        <div key={habit.id} className={`habit-card ${isCompleted ? 'completed' : ''}`}>
                                            <div className="habit-card-header">
                                                <div className="habit-info">
                                                    <span className="habit-icon">{habitIcon}</span>
                                                    <div>
                                                        <div className="habit-name">{habit.name}</div>
                                                        {habit.description && <div className="habit-description">{habit.description}</div>}
                                                    </div>
                                                </div>
                                                <div className="habit-actions">
                                                    <button onClick={() => toggleHabitType(habit.id, habitType, habit.name, showMessage, isArabic)}
                                                        className="type-toggle habit" title={isArabic ? 'تغيير النوع' : 'Change type'}>
                                                        🔄
                                                    </button>
                                                    {isCompleted && points > 0 && <span className="points-badge">+{points}</span>}
                                                    <button onClick={() => handleToggleLog(habit.id)} disabled={loading || !isAuthReady}
                                                        className={`complete-btn ${isCompleted ? 'undo' : ''}`}>
                                                        {isCompleted ? '↩️' : '✅'}
                                                        <span>{isCompleted ? (isArabic ? 'تراجع' : 'Undo') : (isArabic ? 'تم' : 'Complete')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* قائمة الأدوية */}
                    {medications.length > 0 && (
                        <div className="medications-section">
                            <div className="section-header-inline">
                                <div className="section-title-icon"><span className="icon">💊</span><h3>{isArabic ? 'الأدوية' : 'Medications'}</h3></div>
                                <div className="medications-count">💊 {medications.length} {isArabic ? 'دواء' : 'medications'}</div>
                            </div>
                            <div className="medications-grid">
                                {medications.map((med) => {
                                    const todayLog = todayLogs.find(log => (log.habit?.id || log.habit) === med.id);
                                    const isCompleted = todayLog?.is_completed || false;
                                    const medType = getItemType(med);
                                    
                                    return (
                                        <div key={med.id} className={`medication-card ${isCompleted ? 'completed' : ''}`}>
                                            <div className="medication-info">
                                                <span className="medication-icon">💊</span>
                                                <div>
                                                    <div className="medication-name">{med.name}</div>
                                                    {med.description && <div className="medication-description">{med.description}</div>}
                                                </div>
                                            </div>
                                            <div className="medication-actions">
                                                <button onClick={() => toggleHabitType(med.id, medType, med.name, showMessage, isArabic)}
                                                    className="type-toggle medication" title={isArabic ? 'تغيير النوع' : 'Change type'}>
                                                    🔄
                                                </button>
                                                <button onClick={() => handleToggleLog(med.id)} disabled={loading || !isAuthReady}
                                                    className={`take-btn ${isCompleted ? 'undo' : ''}`}>
                                                    {isCompleted ? '↩️' : '✅'}
                                                    <span>{isCompleted ? (isArabic ? 'تراجع' : 'Undo') : (isArabic ? 'تم' : 'Taken')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ==================== تبويب الأمراض المزمنة ==================== */}
            {activeTab === 'conditions' && (
                <div className="chronic-conditions-section">
                    <div className="section-header-inline">
                        <div className="section-title-icon">
                            <span className="icon">🩺</span>
                            <h3>{isArabic ? 'الأمراض المزمنة' : 'Chronic Conditions'}</h3>
                        </div>
                        <button 
                            onClick={() => setActiveTab('records')} 
                            className="add-record-btn"
                        >
                            📄 {isArabic ? 'إضافة سجل طبي' : 'Add Medical Record'}
                        </button>
                    </div>
                    
                    {loadingConditions ? (
                        <div className="loading-state"><div className="spinner"></div><p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p></div>
                    ) : chronicConditions.length === 0 ? (
                        <div className="empty-conditions">
                            <span className="empty-icon">💊</span>
                            <p>{isArabic ? 'لا توجد أمراض مزمنة مسجلة' : 'No chronic conditions recorded'}</p>
                            <p className="empty-hint">
                                {isArabic 
                                    ? 'يمكنك إضافة سجل طبي بصيغة PDF وسيتم استخراج الأمراض تلقائياً'
                                    : 'You can upload a medical PDF and conditions will be extracted automatically'}
                            </p>
                            <button onClick={() => setActiveTab('records')} className="empty-add-btn">
                                📄 {isArabic ? 'إضافة سجل طبي' : 'Add Medical Record'}
                            </button>
                        </div>
                    ) : (
                        <div className="conditions-list">
                            {chronicConditions.map(condition => (
                                <div key={condition.id} className="condition-card">
                                    <div className="condition-info">
                                        <span className="condition-name">{condition.name}</span>
                                        {condition.diagnosis_date && (
                                            <span className="condition-date">📅 {condition.diagnosis_date}</span>
                                        )}
                                        {condition.medications && (
                                            <span className="condition-meds">💊 {condition.medications}</span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteCondition(condition.id)}
                                        className="delete-condition-btn"
                                        title={isArabic ? 'حذف' : 'Delete'}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== تبويب السجلات الطبية ==================== */}
            {activeTab === 'records' && (
                <div className="medical-records-section">
                    <div className="section-header-inline">
                        <div className="section-title-icon">
                            <span className="icon">📄</span>
                            <h3>{isArabic ? 'السجلات الطبية' : 'Medical Records'}</h3>
                        </div>
                        <button 
                            onClick={() => setShowMedicalRecordForm(!showMedicalRecordForm)} 
                            className="add-record-btn"
                        >
                            {showMedicalRecordForm ? '✕' : '➕'} {isArabic ? 'إضافة سجل' : 'Add Record'}
                        </button>
                    </div>

                    {/* نموذج إضافة سجل طبي */}
                    {showMedicalRecordForm && (
                        <div className="medical-record-form">
                            <form onSubmit={handleFileUpload} className="record-form">
                                <div className="form-field">
                                    <label>{isArabic ? 'نوع السجل' : 'Record Type'} *</label>
                                    <input 
                                        type="text"
                                        value={newMedicalRecord.event_type}
                                        onChange={(e) => setNewMedicalRecord({...newMedicalRecord, event_type: e.target.value})}
                                        placeholder={isArabic ? 'مثال: تقرير طبي، تحليل مخبر، تشخيص...' : 'Example: Medical report, lab analysis...'}
                                        required
                                        disabled={uploadingFile}
                                    />
                                </div>
                                
                                <div className="form-field">
                                    <label>{isArabic ? 'تاريخ السجل' : 'Record Date'} *</label>
                                    <input 
                                        type="date"
                                        value={newMedicalRecord.event_date}
                                        onChange={(e) => setNewMedicalRecord({...newMedicalRecord, event_date: e.target.value})}
                                        required
                                        disabled={uploadingFile}
                                    />
                                </div>
                                
                                <div className="form-field">
                                    <label>{isArabic ? 'تفاصيل إضافية' : 'Additional Details'}</label>
                                    <textarea 
                                        value={newMedicalRecord.details}
                                        onChange={(e) => setNewMedicalRecord({...newMedicalRecord, details: e.target.value})}
                                        placeholder={isArabic ? 'أي معلومات إضافية عن هذا السجل...' : 'Any additional information...'}
                                        rows="3"
                                        disabled={uploadingFile}
                                    />
                                </div>
                                
                                <div className="form-field file-upload-field">
                                    <label>{isArabic ? 'رفع ملف PDF' : 'Upload PDF File'} *</label>
                                    <div className="file-upload-area">
                                        <input 
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            required
                                            disabled={uploadingFile}
                                        />
                                        {selectedFile && (
                                            <div className="selected-file">
                                                📄 {selectedFile.name}
                                                <button type="button" onClick={() => setSelectedFile(null)}>✕</button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="file-hint">
                                        {isArabic 
                                            ? 'سيتم تحليل الملف تلقائياً لاستخراج الأمراض المزمنة'
                                            : 'The file will be automatically analyzed to extract conditions'}
                                    </p>
                                </div>
                                
                                {uploadingFile && (
                                    <div className="upload-progress">
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                )}
                                
                                {processingResult && (
                                    <div className="processing-result">
                                        <div className="result-header">
                                            <span className="result-icon">🤖</span>
                                            <span>{isArabic ? 'نتائج التحليل' : 'Analysis Results'}</span>
                                        </div>
                                        {processingResult.extracted_conditions?.diseases?.length > 0 && (
                                            <div className="extracted-diseases">
                                                <strong>{isArabic ? 'الأمراض المستخرجة:' : 'Extracted Conditions:'}</strong>
                                                <ul>
                                                    {processingResult.extracted_conditions.diseases.map((disease, idx) => (
                                                        <li key={idx}>
                                                            {disease.name}
                                                            {disease.confidence === 'high' && <span className="confidence-high"> ✓</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {processingResult.added_conditions?.length > 0 && (
                                            <div className="added-conditions">
                                                <strong>{isArabic ? 'تمت الإضافة إلى ملفك:' : 'Added to your profile:'}</strong>
                                                <ul>
                                                    {processingResult.added_conditions.map((cond, idx) => (
                                                        <li key={idx}>✅ {cond.name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="form-actions">
                                    <button type="submit" disabled={uploadingFile || !selectedFile} className="submit-btn">
                                        {uploadingFile ? (
                                            <><span className="spinner-small"></span> {isArabic ? 'جاري الرفع والتحليل...' : 'Uploading & Analyzing...'}</>
                                        ) : (
                                            <>{isArabic ? '📤 رفع وتحليل' : '📤 Upload & Analyze'}</>
                                        )}
                                    </button>
                                    <button type="button" onClick={() => {
                                        setShowMedicalRecordForm(false);
                                        setSelectedFile(null);
                                        setProcessingResult(null);
                                    }} className="cancel-btn">
                                        {isArabic ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* قائمة السجلات الطبية */}
                    {medicalRecords.length === 0 && !showMedicalRecordForm ? (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <h4>{isArabic ? 'لا توجد سجلات طبية' : 'No Medical Records'}</h4>
                            <p>{isArabic ? 'أضف سجلك الطبي الأول بصيغة PDF' : 'Add your first medical record as PDF'}</p>
                            <button onClick={() => setShowMedicalRecordForm(true)} className="empty-add-btn">
                                📄 {isArabic ? 'إضافة سجل طبي' : 'Add Medical Record'}
                            </button>
                        </div>
                    ) : (
                        <div className="records-list">
                            {medicalRecords.map(record => (
                                <div key={record.id} className="record-card">
                                    <div className="record-header">
                                        <span className="record-type">{record.event_type}</span>
                                        <button onClick={() => handleDeleteMedicalRecord(record.id)} className="delete-record-btn">
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="record-date">📅 {record.event_date}</div>
                                    {record.details && <div className="record-details">{record.details}</div>}
                                    {record.uploaded_file && (
                                        <a href={record.uploaded_file} target="_blank" rel="noopener noreferrer" className="view-file-link">
                                            📄 {isArabic ? 'عرض الملف' : 'View File'}
                                        </a>
                                    )}
                                    {record.extracted_conditions && (() => {
                                        try {
                                            const extracted = JSON.parse(record.extracted_conditions);
                                            return extracted.diseases?.length > 0 ? (
                                                <div className="record-extracted">
                                                    <small>🤖 {isArabic ? 'الأمراض المستخرجة:' : 'Extracted conditions:'}</small>
                                                    <div className="extracted-tags">
                                                        {extracted.diseases.slice(0, 3).map((d, i) => (
                                                            <span key={i} className="extracted-tag">{d.name}</span>
                                                        ))}
                                                        {extracted.diseases.length > 3 && (
                                                            <span className="extracted-tag more">+{extracted.diseases.length - 3}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null;
                                        } catch (e) {
                                            return null;
                                        }
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* ==================== تبويب تحليلات العادات الذكية ==================== */}
            {activeTab === 'analytics' && (
                <div className="habits-analytics-section">
                    <div className="section-header-inline">
                        <div className="section-title-icon">
                            <span className="icon">🤖</span>
                            <h3>{isArabic ? 'تحليلات العادات الذكية' : 'AI Habits Analytics'}</h3>
                        </div>
                        <p className="section-desc">
                            {isArabic 
                                ? 'تحليلات متقدمة باستخدام الذكاء الاصطناعي لتحسين عاداتك وأدويتك'
                                : 'Advanced AI-powered analytics to improve your habits and medications'}
                        </p>
                    </div>

                    {/* ✅ استخدم HabitAnalytics الموجود مباشرة */}
                    <HabitAnalytics refreshTrigger={refreshAnalytics} />
                </div>
            )}
            
 

            {/* CSS */}
            <style jsx>{`
                /* الأنماط كما هي موجودة مسبقاً مع إضافة الأنماط الجديدة أدناه */
                
                /* ===== التبويبات ===== */
                .analytics-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-light, #e2e8f0);
                    padding-bottom: 0.5rem;
                }
                
                .dark-mode .analytics-tabs {
                    border-bottom-color: #334155;
                }
                
                .tab-btn {
                    background: transparent;
                    border: none;
                    padding: 0.6rem 1.25rem;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.2s;
                    color: var(--text-secondary, #64748b);
                }
                
                .dark-mode .tab-btn {
                    color: #94a3b8;
                }
                
                .tab-btn.active {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
                }
                
                .tab-btn:hover:not(.active) {
                    background: var(--hover-bg, #f1f5f9);
                }
                
                .dark-mode .tab-btn:hover:not(.active) {
                    background: #334155;
                }
                
                /* ===== الأمراض المزمنة ===== */
                .chronic-conditions-section {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .chronic-conditions-section {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .add-record-btn {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }
                
                .add-record-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
                }
                
                .conditions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .condition-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg, white);
                    border-radius: 14px;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .condition-card {
                    background: #1e293b;
                    border-color: #475569;
                }
                
                .condition-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .condition-name {
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .condition-name {
                    color: #f1f5f9;
                }
                
                .condition-date,
                .condition-meds {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                
                .delete-condition-btn,
                .delete-record-btn {
                    background: transparent;
                    border: none;
                    font-size: 1rem;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity 0.2s;
                }
                
                .delete-condition-btn:hover,
                .delete-record-btn:hover {
                    opacity: 1;
                }
                
                .empty-conditions {
                    text-align: center;
                    padding: 2rem;
                }
                
                .empty-hint {
                    font-size: 0.75rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin-top: 0.5rem;
                }
                
                .empty-add-btn {
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                }
                
                /* ===== السجلات الطبية ===== */
                .medical-records-section {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .medical-records-section {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .medical-record-form {
                    background: var(--card-bg, white);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .medical-record-form {
                    background: #1e293b;
                    border-color: #475569;
                }
                
                .record-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .file-upload-area {
                    border: 2px dashed var(--border-light, #e2e8f0);
                    border-radius: 12px;
                    padding: 1rem;
                    text-align: center;
                }
                
                .dark-mode .file-upload-area {
                    border-color: #475569;
                }
                
                .selected-file {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--secondary-bg, #f1f5f9);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                }
                
                .dark-mode .selected-file {
                    background: #0f172a;
                }
                
                .selected-file button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                
                .file-hint {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin-top: 0.5rem;
                }
                
                .upload-progress {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .upload-progress .progress-bar {
                    flex: 1;
                    height: 6px;
                    background: var(--border-light, #e2e8f0);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .upload-progress .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    transition: width 0.3s ease;
                }
                
                .processing-result {
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 12px;
                    padding: 0.75rem;
                }
                
                .result-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                
                .extracted-diseases,
                .added-conditions {
                    font-size: 0.8rem;
                    margin: 0.5rem 0;
                }
                
                .extracted-diseases ul,
                .added-conditions ul {
                    margin: 0.25rem 0 0 1.25rem;
                }
                
                .confidence-high {
                    color: #10b981;
                }
                
                .form-actions {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                }
                
                .cancel-btn {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg, #f8fafc);
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-radius: 12px;
                    cursor: pointer;
                }
                
                .records-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .record-card {
                    background: var(--card-bg, white);
                    border-radius: 14px;
                    padding: 0.75rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .record-card {
                    background: #1e293b;
                    border-color: #475569;
                }
                
                .record-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                
                .record-type {
                    font-weight: 700;
                    color: var(--primary, #6366f1);
                }
                
                .record-date {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin-bottom: 0.5rem;
                }
                
                .record-details {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                    margin-bottom: 0.5rem;
                }
                
                .view-file-link {
                    display: inline-block;
                    font-size: 0.7rem;
                    color: var(--primary, #6366f1);
                    text-decoration: none;
                    margin-bottom: 0.5rem;
                }
                
                .record-extracted {
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                }
                
                .extracted-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                    margin-top: 0.25rem;
                }
                
                .extracted-tag {
                    font-size: 0.65rem;
                    padding: 0.15rem 0.5rem;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 12px;
                }
                
                .extracted-tag.more {
                    background: rgba(100, 116, 139, 0.1);
                }

             /* ===========================================
   HabitTracker.css - الأنماط الداخلية فقط
   ✅ إدارة العادات والأدوية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.habit-tracker-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
}

.dark-mode .habit-tracker-container {
    background: #1e293b;
    border-color: #334155;
}

/* ===== رأس الصفحة ===== */
.habits-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .habits-header {
    border-bottom-color: #334155;
}

.habits-title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .habits-title {
    color: #f1f5f9;
}

.habits-date {
    padding: 0.25rem 0.75rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 9999px;
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .habits-date {
    background: #0f172a;
    color: #94a3b8;
}

/* ===== الأقسام العامة ===== */
.section-header-inline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.section-title-icon {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.section-title-icon .icon {
    font-size: 1.3rem;
}

.section-title-icon h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .section-title-icon h3 {
    color: #f1f5f9;
}

.section-desc {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== قسم البحث عن الأدوية ===== */
.drug-search-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .drug-search-section {
    background: #0f172a;
    border-color: #334155;
}

.search-bar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .search-input {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.search-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.search-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.search-btn {
    padding: 0.5rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary, #64748b);
}

.dark-mode .search-btn {
    background: #1e293b;
    border-color: #475569;
    color: #94a3b8;
}

.search-btn.active {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border-color: transparent;
}

.search-btn:hover:not(:disabled) {
    background: var(--hover-bg, #f1f5f9);
    transform: translateY(-2px);
}

.dark-mode .search-btn:hover:not(:disabled) {
    background: #334155;
}

.scan-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}

.scan-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* ===== نتائج البحث ===== */
.drug-results {
    margin-top: 1.5rem;
}

.results-header {
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--text-secondary, #64748b);
    font-size: 0.85rem;
}

.results-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
}

.drug-result-item {
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .drug-result-item {
    background: #1e293b;
    border-color: #475569;
}

.drug-result-item:hover {
    background: var(--hover-bg, #f1f5f9);
    transform: translateX(4px);
}

[dir="rtl"] .drug-result-item:hover {
    transform: translateX(-4px);
}

.drug-name {
    font-weight: 700;
    margin-bottom: 0.25rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .drug-name {
    color: #f1f5f9;
}

.drug-generic {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
    margin-left: 0.5rem;
}

[dir="rtl"] .drug-generic {
    margin-left: 0;
    margin-right: 0.5rem;
}

.drug-details {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== قسم النقاط ===== */
.points-section {
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
    border-radius: 24px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    color: white;
}

.points-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.points-icon {
    font-size: 1.5rem;
}

.points-header h3 {
    margin: 0;
    font-size: 1rem;
    color: white;
}

.points-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}

.point-card {
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(4px);
    border-radius: 14px;
    padding: 0.75rem;
    text-align: center;
}

.point-value {
    font-size: 1.8rem;
    font-weight: 800;
}

.point-label {
    font-size: 0.7rem;
    opacity: 0.9;
}

/* ===== قسم التقدم ===== */
.progress-section {
    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
    border-radius: 24px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    color: white;
}

.progress-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.progress-icon {
    font-size: 1.5rem;
}

.progress-header h3 {
    margin: 0;
    font-size: 1rem;
    color: white;
}

.progress-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.progress-count {
    font-size: 0.9rem;
    font-weight: 500;
}

.progress-bar-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.progress-bar {
    flex: 1;
    background: rgba(255, 255, 255, 0.25);
    height: 8px;
    border-radius: 10px;
    overflow: hidden;
}

.progress-fill {
    background: white;
    height: 100%;
    border-radius: 10px;
    transition: width 0.3s ease;
}

.progress-percentage {
    font-size: 1rem;
    font-weight: 700;
}

/* ===== قسم إضافة جديدة ===== */
.add-habit-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .add-habit-section {
    background: #0f172a;
    border-color: #334155;
}

.add-habit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
}

.form-group input,
.form-group textarea {
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
    transition: all 0.2s;
}

.dark-mode .form-group input,
.dark-mode .form-group textarea {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group textarea {
    resize: vertical;
    font-family: inherit;
}

.submit-btn {
    padding: 0.75rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ===== قائمة العادات والأدوية ===== */
.habits-list-section,
.medications-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .habits-list-section,
.dark-mode .medications-section {
    background: #0f172a;
    border-color: #334155;
}

.habits-count,
.medications-count {
    padding: 0.25rem 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .habits-count,
.dark-mode .medications-count {
    background: #1e293b;
    color: #94a3b8;
}

.habits-grid,
.medications-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 0.75rem;
}

/* ===== بطاقات العادات ===== */
.habit-card,
.medication-card {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.dark-mode .habit-card,
.dark-mode .medication-card {
    background: #1e293b;
    border-color: #475569;
}

.habit-card:hover,
.medication-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .habit-card:hover,
.dark-mode .medication-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.habit-card.completed,
.medication-card.completed {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.3);
}

.dark-mode .habit-card.completed,
.dark-mode .medication-card.completed {
    background: rgba(16, 185, 129, 0.1);
}

.habit-card-header {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex: 1;
}

.medication-info {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex: 1;
}

.habit-icon,
.medication-icon {
    font-size: 1.5rem;
}

.habit-name,
.medication-name {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .habit-name,
.dark-mode .medication-name {
    color: #f1f5f9;
}

.habit-description,
.medication-description {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    margin-top: 0.25rem;
    word-break: break-word;
}

/* ===== أزرار الإجراءات ===== */
.habit-actions,
.medication-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.type-toggle {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--tertiary-bg, #f1f5f9);
    border: 1px solid var(--border-light, #e2e8f0);
    font-size: 0.9rem;
}

.dark-mode .type-toggle {
    background: #0f172a;
    border-color: #475569;
}

.type-toggle.habit:hover {
    background: rgba(16, 185, 129, 0.15);
    transform: scale(1.05);
}

.type-toggle.medication:hover {
    background: rgba(59, 130, 246, 0.15);
    transform: scale(1.05);
}

.points-badge {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 700;
}

.complete-btn,
.take-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    font-weight: 600;
}

.complete-btn {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
}

.complete-btn:hover:not(:disabled) {
    background: #10b981;
    color: white;
}

.complete-btn.undo {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

.complete-btn.undo:hover:not(:disabled) {
    background: #ef4444;
    color: white;
}

.take-btn {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
}

.take-btn:hover:not(:disabled) {
    background: #3b82f6;
    color: white;
}

.take-btn.undo {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

.take-btn.undo:hover:not(:disabled) {
    background: #ef4444;
    color: white;
}

.type-toggle:disabled,
.complete-btn:disabled,
.take-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== ماسح الباركود ===== */
.scanner-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
}

.scanner-modal-content {
    background: var(--card-bg, #ffffff);
    border-radius: 24px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 1rem;
}

.dark-mode .scanner-modal-content {
    background: #1e293b;
}

.scanner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .scanner-header {
    border-bottom-color: #334155;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--text-secondary, #64748b);
}

.close-btn:hover {
    color: #ef4444;
}

.scanner-footer {
    margin-top: 1rem;
    text-align: center;
}

.cancel-btn {
    padding: 0.5rem 1.5rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 40px;
    cursor: pointer;
    font-size: 0.8rem;
}

.dark-mode .cancel-btn {
    background: #0f172a;
    border-color: #475569;
}

/* ===== إشعارات ===== */
.notification-toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: slideIn 0.3s ease;
    z-index: 1000;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

[dir="rtl"] .notification-toast {
    right: auto;
    left: 1.5rem;
}

.notification-toast.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
}

.notification-toast.error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
}

.notification-toast.info {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
}

.notification-toast button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
}

.notification-toast button:hover {
    opacity: 1;
}

/* ===== حالات خاصة ===== */
.loading-state,
.empty-state {
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

.spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
}

.analytics-wrapper {
    margin-top: 1.5rem;
}

/* ===== أنيميشن ===== */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
}

[dir="rtl"] @keyframes slideIn {
    from { opacity: 0; transform: translateX(-100%); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .habit-card-header,
[dir="rtl"] .medication-info {
    flex-direction: row-reverse;
}

[dir="rtl"] .section-header-inline {
    flex-direction: row-reverse;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .scanner-modal,
    .notification-toast {
        animation: none !important;
    }
    
    .habit-card:hover,
    .medication-card:hover,
    .drug-result-item:hover,
    .submit-btn:hover:not(:disabled),
    .scan-btn:hover,
    .search-btn:hover:not(:disabled) {
        transform: none !important;
    }
    
    .spinner,
    .spinner-small {
        animation: none;
    }
}
                }
            `}</style>
        </div>
    );
}

export default HabitTracker;