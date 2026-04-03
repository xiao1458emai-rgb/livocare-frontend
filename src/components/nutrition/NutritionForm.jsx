// src/components/nutrition/NutritionForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import axiosInstance from "../../services/api";  // ✅ أضف هذا السطر
import NutritionAnalytics from '../Analytics/NutritionAnalytics';
import BarcodeScanner from '../Camera/BarcodeScanner';
import '../../index.css';

// ... باقي الكود كما هو ...
// إعداد أنواع الوجبات مع دعم الترجمة
const getMealTypeChoices = (t) => [
    { value: 'Breakfast', label: `🍳 ${t('nutrition.breakfast')}`, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' },
    { value: 'Lunch', label: `🍲 ${t('nutrition.lunch')}`, color: '#FF6B35', bg: 'rgba(255, 107, 53, 0.15)' },
    { value: 'Dinner', label: `🍽️ ${t('nutrition.dinner')}`, color: '#2E86AB', bg: 'rgba(46, 134, 171, 0.15)' },
    { value: 'Snack', label: `🍎 ${t('nutrition.snack')}`, color: '#A23B72', bg: 'rgba(162, 59, 114, 0.15)' },
    { value: 'Other', label: `📝 ${t('nutrition.other')}`, color: '#6A8D73', bg: 'rgba(106, 141, 115, 0.15)' },
];

function NutritionForm({ onDataSubmitted, isAuthReady }) {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    
    const [showScanner, setShowScanner] = useState(false);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [meals, setMeals] = useState([]);
    const [loadingMeals, setLoadingMeals] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    
    const [mealData, setMealData] = useState({
        meal_type: 'Breakfast',
        meal_time: new Date().toISOString().slice(0, 16),
        notes: ''
    });

    const [foodItems, setFoodItems] = useState([
        { 
            name: '', 
            quantity: '100', 
            unit: 'غرام', 
            calories: '',  
            protein: '',   
            carbs: '',     
            fat: '',       
            isSearching: false,
            searchResults: [],
            showResults: false,
            selectedFood: null,
            manualEdit: false,
            barcode: null
        }
    ]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [searchTimeout, setSearchTimeout] = useState(null);

    const checkAuth = () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setMessage(t('nutrition.loginRequired'));
            setMessageType('error');
            return false;
        }
        return true;
    };

    // ✅ fetchMeals مع useCallback لمنع إعادة الإنشاء
    const fetchMeals = useCallback(async () => {
        if (!isAuthReady || !isMountedRef.current) return;
        if (!checkAuth()) return;
        
        setLoadingMeals(true);
        try {
            const response = await axiosInstance.get('/meals/');
            if (isMountedRef.current) {
                setMeals(Array.isArray(response.data) ? response.data : []);
                setMessage('');
            }
        } catch (error) {
            console.error('Error fetching meals:', error);
            if (isMountedRef.current) {
                setMessage(t('nutrition.errorLoading'));
                setMessageType('error');
                setMeals([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoadingMeals(false);
            }
        }
    }, [isAuthReady, t]);

    // ✅ جلب الوجبات عند تحميل المكون
    useEffect(() => {
        if (isAuthReady) {
            fetchMeals();
        }
    }, [isAuthReady, fetchMeals]);

    const handleDeleteMeal = async (mealId) => {
        if (!window.confirm(t('nutrition.deleteConfirm'))) return;
        
        try {
            await axiosInstance.delete(`/meals/${mealId}/`);
            if (isMountedRef.current) {
                setMeals(prev => prev.filter(meal => meal.id !== mealId));
                setMessage(t('nutrition.mealDeleted'));
                setMessageType('success');
                setRefreshAnalytics(prev => prev + 1);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting meal:', error);
            if (isMountedRef.current) {
                setMessage(t('nutrition.deleteError'));
                setMessageType('error');
            }
        }
    };

    const searchFood = async (query, index) => {
        if (!query || query.length < 2 || isFetchingRef.current) return;

        const newItems = [...foodItems];
        newItems[index].isSearching = true;
        newItems[index].showResults = true;
        setFoodItems(newItems);
        
        isFetchingRef.current = true;

        try {
            const response = await axiosInstance.get(`/food/search/?query=${encodeURIComponent(query)}`);
            const results = response.data.data || response.data.results || [];
            
            if (isMountedRef.current) {
                const updatedItems = [...foodItems];
                updatedItems[index].searchResults = results;
                updatedItems[index].isSearching = false;
                setFoodItems(updatedItems);
            }
        } catch (error) {
            console.error('Search error:', error);
            if (isMountedRef.current) {
                const updatedItems = [...foodItems];
                updatedItems[index].searchResults = [];
                updatedItems[index].isSearching = false;
                setFoodItems(updatedItems);
            }
        } finally {
            isFetchingRef.current = false;
        }
    };

    const calculateNutrition = (food, quantity) => {
        const qty = parseFloat(quantity) || 100;
        const ratio = qty / 100;
        return {
            calories: Math.round((food.calories || 0) * ratio),
            protein: Math.round(((food.protein || 0) * ratio) * 10) / 10,
            carbs: Math.round(((food.carbs || 0) * ratio) * 10) / 10,
            fat: Math.round(((food.fat || 0) * ratio) * 10) / 10
        };
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const newItems = [...foodItems];
        newItems[index][name] = value;
        
        if (name === 'name' && value.length >= 2) {
            if (searchTimeout) clearTimeout(searchTimeout);
            const timeout = setTimeout(() => searchFood(value, index), 500);
            setSearchTimeout(timeout);
        } else if (name === 'name' && value.length === 0) {
            newItems[index].searchResults = [];
            newItems[index].showResults = false;
            newItems[index].selectedFood = null;
        }
        
        if (name === 'protein' || name === 'carbs' || name === 'fat' || name === 'calories') {
            newItems[index].manualEdit = true;
        }
        
        setFoodItems(newItems);
    };

    const handleSelectFood = (index, food) => {
        const quantity = foodItems[index].quantity || '100';
        const calculated = calculateNutrition(food, quantity);
        
        const newItems = [...foodItems];
        newItems[index] = {
            ...newItems[index],
            name: food.name,
            calories: calculated.calories,
            protein: calculated.protein,
            carbs: calculated.carbs,
            fat: calculated.fat,
            searchResults: [],
            showResults: false,
            selectedFood: food,
            manualEdit: false,
            barcode: food.barcode || null
        };
        setFoodItems(newItems);
    };

    const handleQuantityChange = (index, e) => {
        const quantity = e.target.value;
        const newItems = [...foodItems];
        newItems[index].quantity = quantity;
        
        if (newItems[index].selectedFood && quantity && !newItems[index].manualEdit) {
            const calculated = calculateNutrition(newItems[index].selectedFood, quantity);
            newItems[index].calories = calculated.calories;
            newItems[index].protein = calculated.protein;
            newItems[index].carbs = calculated.carbs;
            newItems[index].fat = calculated.fat;
        }
        setFoodItems(newItems);
    };

    const handleAddItem = () => {
        setFoodItems(prev => [...prev, { 
            name: '', 
            quantity: '100', 
            unit: 'غرام', 
            calories: '', 
            protein: '', 
            carbs: '', 
            fat: '',
            isSearching: false,
            searchResults: [],
            showResults: false,
            selectedFood: null,
            manualEdit: false,
            barcode: null
        }]);
    };

    const handleRemoveItem = (index) => {
        setFoodItems(prev => prev.filter((_, i) => i !== index));
    };

    const nutritionSummary = React.useMemo(() => {
        return foodItems.reduce((acc, item) => ({
            totalCalories: acc.totalCalories + (parseFloat(item.calories) || 0),
            totalProtein: acc.totalProtein + (parseFloat(item.protein) || 0),
            totalCarbs: acc.totalCarbs + (parseFloat(item.carbs) || 0),
            totalFat: acc.totalFat + (parseFloat(item.fat) || 0)
        }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    }, [foodItems]);

    const handleMealChange = (e) => {
        const { name, value } = e.target;
        setMealData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditMeal = (meal) => {
        setEditingMeal(meal);
        setMealData({
            meal_type: meal.meal_type,
            meal_time: meal.meal_time.slice(0, 16),
            notes: meal.notes || ''
        });
        
        if (meal.ingredients && meal.ingredients.length > 0) {
            setFoodItems(meal.ingredients.map(item => ({
                name: item.name,
                quantity: item.quantity.toString(),
                unit: item.unit,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                isSearching: false,
                searchResults: [],
                showResults: false,
                selectedFood: item,
                manualEdit: true,
                barcode: item.barcode || null
            })));
        } else {
            setFoodItems([{ 
                name: '', 
                quantity: '100', 
                unit: 'غرام', 
                calories: '', 
                protein: '', 
                carbs: '', 
                fat: '',
                isSearching: false,
                searchResults: [],
                showResults: false,
                selectedFood: null,
                manualEdit: false,
                barcode: null
            }]);
        }
        setShowEditForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


const handleBarcodeScanned = async (result) => {
    console.log('📦 Barcode result received:', result);
    console.log('📦 Type of result:', typeof result);
    console.log('📦 Has name property:', result && result.hasOwnProperty('name'));
    
    // ✅ الحالة 1: النتيجة تحتوي على بيانات المنتج الكاملة
    if (result && typeof result === 'object') {
        // ✅ إذا كان الكائن يحتوي على name و calories
        if (result.name && (result.calories !== undefined || result.protein !== undefined)) {
            console.log('✅ Using product data directly from camera service');
            
            const productData = {
                name: result.name,
                calories: result.calories || 0,
                protein: result.protein || 0,
                carbs: result.carbs || 0,
                fat: result.fat || 0,
                barcode: result.barcode || result.data || '',
                unit: result.unit || 'غرام'
            };
            
            // إضافة المنتج كعنصر جديد في foodItems
            setFoodItems(prev => [...prev, {
                name: productData.name,
                quantity: '100',
                unit: productData.unit,
                calories: productData.calories.toString(),
                protein: productData.protein.toString(),
                carbs: productData.carbs.toString(),
                fat: productData.fat.toString(),
                barcode: productData.barcode,
                isSearching: false,
                searchResults: [],
                showResults: false,
                selectedFood: productData,
                manualEdit: true
            }]);
            
            setMessage(`✅ تم إضافة المنتج: ${productData.name}`);
            setMessageType('success');
            setIsLoading(false);
            setShowScanner(false);
            setTimeout(() => setMessage(''), 5000);
            return;
        }
        
        // ✅ إذا كان الكائن يحتوي على data فقط (باركود)
        if (result.data) {
            var barcodeText = result.data;
        } else if (result.text) {
            var barcodeText = result.text;
        } else {
            var barcodeText = '';
        }
    } else if (typeof result === 'string') {
        var barcodeText = result;
    } else {
        var barcodeText = '';
    }
    
    if (!barcodeText) {
        console.error('❌ No barcode text found');
        setMessage('⚠️ لم يتم التعرف على الباركود');
        setMessageType('error');
        setIsLoading(false);
        setShowScanner(false);
        return;
    }
    
    console.log('🔍 Searching for barcode:', barcodeText);
    setIsLoading(true);
    setMessage('');
    
    try {
        // البحث في Open Food Facts (بدون User-Agent)
        const offResponse = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcodeText}.json`, {
            timeout: 10000
        });
        
        console.log('📡 Open Food Facts response:', offResponse.data);
        
        if (offResponse.data.status === 1) {
            const product = offResponse.data.product;
            const nutriments = product.nutriments || {};
            
            const productData = {
                name: product.product_name || product.generic_name || `منتج (${barcodeText.slice(-8)})`,
                calories: nutriments['energy-kcal'] || nutriments.energy || 0,
                protein: nutriments.proteins || 0,
                carbs: nutriments.carbohydrates || 0,
                fat: nutriments.fat || 0,
                barcode: barcodeText,
                brand: product.brands,
                unit: product.quantity?.includes('g') ? 'غرام' : (product.quantity?.includes('ml') ? 'مل' : 'غرام')
            };
            
            setFoodItems(prev => [...prev, {
                name: productData.name,
                quantity: '100',
                unit: productData.unit || 'غرام',
                calories: productData.calories.toString(),
                protein: productData.protein.toString(),
                carbs: productData.carbs.toString(),
                fat: productData.fat.toString(),
                barcode: barcodeText,
                brand: productData.brand,
                isSearching: false,
                searchResults: [],
                showResults: false,
                selectedFood: productData,
                manualEdit: true
            }]);
            
            setMessage(`✅ تم العثور على المنتج: ${productData.name}`);
            setMessageType('success');
        } else {
            // المنتج غير موجود في قاعدة البيانات
            setFoodItems(prev => [...prev, {
                name: `منتج جديد (${barcodeText.slice(-8)})`,
                quantity: '100',
                unit: 'غرام',
                calories: '',
                protein: '',
                carbs: '',
                fat: '',
                barcode: barcodeText,
                isSearching: false,
                searchResults: [],
                showResults: false,
                selectedFood: null,
                manualEdit: true
            }]);
            setMessage(`⚠️ المنتج (${barcodeText}) غير موجود، الرجاء إدخال البيانات يدوياً`);
            setMessageType('info');
        }
    } catch (error) {
        console.error('❌ Error in barcode search:', error);
        setFoodItems(prev => [...prev, {
            name: `منتج جديد (${barcodeText.slice(-8)})`,
            quantity: '100',
            unit: 'غرام',
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            barcode: barcodeText,
            isSearching: false,
            searchResults: [],
            showResults: false,
            selectedFood: null,
            manualEdit: true
        }]);
        setMessage('⚠️ حدث خطأ في البحث عن المنتج');
        setMessageType('error');
    } finally {
        setIsLoading(false);
        setTimeout(() => setMessage(''), 5000);
        setShowScanner(false);
    }
};

    const handleUpdateMeal = async (e) => {
        e.preventDefault();
        if (!isAuthReady || !editingMeal) {
            setMessage(t('nutrition.loginRequired'));
            setMessageType('error');
            return;
        }
        setIsLoading(true);
        const validItems = foodItems.filter(item => item.name && item.quantity);
        if (validItems.length === 0) {
            setMessage(t('nutrition.atLeastOneIngredient'));
            setMessageType('error');
            setIsLoading(false);
            return;
        }
        const ingredients = validItems.map(item => ({
            name: item.name,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit,
            calories: parseFloat(item.calories) || 0,
            protein: parseFloat(item.protein) || 0,
            carbs: parseFloat(item.carbs) || 0,
            fat: parseFloat(item.fat) || 0,
            barcode: item.barcode || null
        }));
        try {
            await axiosInstance.put(`/meals/${editingMeal.id}/`, {
                meal_type: mealData.meal_type,
                meal_time: mealData.meal_time,
                notes: mealData.notes,
                ingredients
            });
            if (isMountedRef.current) {
                setMessage(t('nutrition.mealUpdated'));
                setMessageType('success');
                setRefreshAnalytics(prev => prev + 1);
                setShowEditForm(false);
                setEditingMeal(null);
                clearForm();
                await fetchMeals();
            }
        } catch (error) {
            console.error('Update error:', error);
            if (isMountedRef.current) {
                setMessage(t('nutrition.updateFailed'));
                setMessageType('error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthReady) {
            setMessage(t('nutrition.loginRequired'));
            setMessageType('error');
            return;
        }
        setIsLoading(true);
        const validItems = foodItems.filter(item => item.name && item.quantity);
        if (validItems.length === 0) {
            setMessage(t('nutrition.atLeastOneIngredient'));
            setMessageType('error');
            setIsLoading(false);
            return;
        }
        const ingredients = validItems.map(item => ({
            name: item.name,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit,
            calories: parseFloat(item.calories) || 0,
            protein: parseFloat(item.protein) || 0,
            carbs: parseFloat(item.carbs) || 0,
            fat: parseFloat(item.fat) || 0,
            barcode: item.barcode || null
        }));
        try {
            await axiosInstance.post('/meals/', {
                meal_type: mealData.meal_type,
                meal_time: mealData.meal_time,
                notes: mealData.notes,
                ingredients
            });
            if (isMountedRef.current) {
                setMessage(t('nutrition.mealAdded'));
                setMessageType('success');
                setRefreshAnalytics(prev => prev + 1);
                await fetchMeals();
                clearForm();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (error) {
            console.error('Submission error:', error);
            if (isMountedRef.current) {
                setMessage(t('nutrition.failedToSave'));
                setMessageType('error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const clearForm = () => {
        setMealData({ 
            meal_type: 'Breakfast',
            meal_time: new Date().toISOString().slice(0, 16),
            notes: ''
        });
        setFoodItems([{ 
            name: '', 
            quantity: '100', 
            unit: 'غرام', 
            calories: '', 
            protein: '', 
            carbs: '', 
            fat: '',
            isSearching: false,
            searchResults: [],
            showResults: false,
            selectedFood: null,
            manualEdit: false,
            barcode: null
        }]);
    };

    const getMealTypeColor = (mealType) => {
        const meal = getMealTypeChoices(t).find(m => m.value === mealType);
        return meal ? meal.color : '#6c757d';
    };

    const formatMealDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getUnitOptions = () => {
        return [
            { value: 'غرام', label: i18n.language === 'ar' ? 'غرام' : 'gram' },
            { value: 'مل', label: i18n.language === 'ar' ? 'مل' : 'ml' },
            { value: 'قطعة', label: i18n.language === 'ar' ? 'قطعة' : 'piece' },
            { value: 'كوب', label: i18n.language === 'ar' ? 'كوب' : 'cup' }
        ];
    };

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, []);

    return (
        <div className={`nutrition-form-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* ✅ ماسح الباركود */}
            {showScanner && (
                <BarcodeScanner 
                    onScan={handleBarcodeScanned} 
                    onClose={() => setShowScanner(false)} 
                    darkMode={darkMode} 
                />
            )}
            
            <div className="form-content">
                {/* رأس النموذج المحسن */}
                <div className="enhanced-header">
                    <div className="header-pattern"></div>
                    <div className="header-content-wrapper">
                        <div className="header-icon-container">
                            <div className="icon-glow"></div>
                            <span className="header-icon">🥗</span>
                        </div>
                        <div className="header-text">
                            <h1 className="header-title">{t('nutrition.addMeal')}</h1>
                            <p className="header-subtitle">{t('nutrition.trackNutrition')}</p>
                        </div>
                        <div className="header-badge">
                            <span className="badge-icon">📊</span>
                            <span className="badge-text">{t('nutrition.dailyIntake')}</span>
                        </div>
                    </div>
                </div>

                {/* ✅ زر مسح الباركود */}
                <div className="barcode-button-container">
                    <button 
                        type="button" 
                        onClick={() => setShowScanner(true)}
                        className="barcode-scanner-btn"
                        disabled={isLoading}
                    >
                        <span className="btn-icon">📷</span>
                        <span className="btn-text">مسح باركود المنتج</span>
                    </button>
                </div>

                {/* ملخص التغذية السريع */}
                <div className="enhanced-summary-card">
                    <div className="summary-gradient"></div>
                    <div className="summary-content">
                        <div className="summary-title">
                            <span className="summary-icon">📊</span>
                            <h4>{t('nutrition.mealSummary')}</h4>
                        </div>
                        <div className="summary-stats-grid">
                            <div className="stat-item">
                                <div className="stat-icon">🔥</div>
                                <div className="stat-info">
                                    <span className="stat-value">{nutritionSummary.totalCalories}</span>
                                    <span className="stat-label">{t('nutrition.calories')}</span>
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-icon">💪</div>
                                <div className="stat-info">
                                    <span className="stat-value">{nutritionSummary.totalProtein}g</span>
                                    <span className="stat-label">{t('nutrition.protein')}</span>
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-icon">🌾</div>
                                <div className="stat-info">
                                    <span className="stat-value">{nutritionSummary.totalCarbs}g</span>
                                    <span className="stat-label">{t('nutrition.carbs')}</span>
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-icon">🫒</div>
                                <div className="stat-info">
                                    <span className="stat-value">{nutritionSummary.totalFat}g</span>
                                    <span className="stat-label">{t('nutrition.fat')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={editingMeal ? handleUpdateMeal : handleSubmit}>
                    {/* قسم نوع الوجبة */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-number">1</div>
                            <h3 className="section-title">{t('nutrition.mealType')}</h3>
                            <div className="section-line"></div>
                        </div>
                        <div className="meal-type-grid">
                            {getMealTypeChoices(t).map(meal => (
                                <button
                                    key={meal.value}
                                    type="button"
                                    className={`meal-type-chip ${mealData.meal_type === meal.value ? 'active' : ''}`}
                                    style={{
                                        '--chip-color': meal.color,
                                        '--chip-bg': meal.bg,
                                        background: mealData.meal_type === meal.value ? meal.color : meal.bg,
                                        color: mealData.meal_type === meal.value ? 'white' : meal.color
                                    }}
                                    onClick={() => setMealData(prev => ({ ...prev, meal_type: meal.value }))}
                                >
                                    {meal.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* قسم وقت الوجبة */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-number">2</div>
                            <h3 className="section-title">{t('nutrition.mealTime')}</h3>
                            <div className="section-line"></div>
                        </div>
                        <input
                            type="datetime-local"
                            name="meal_time"
                            value={mealData.meal_time}
                            onChange={handleMealChange}
                            className="time-input"
                        />
                    </div>

                    {/* قسم المكونات */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-number">3</div>
                            <h3 className="section-title">{t('nutrition.ingredients')}</h3>
                            <div className="section-line"></div>
                        </div>
                        <div className="ingredients-container">
                            {foodItems.map((item, index) => (
                                <div key={index} className="ingredient-card">
                                    <div className="card-header">
                                        <div className="item-number-wrapper">
                                            <span className="item-number">{index + 1}</span>
                                        </div>
                                        {foodItems.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="remove-btn">
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <div className="ingredient-fields">
                                        <div className="field-group">
                                            <div className="field-label">
                                                <span>🥗</span>
                                                <span>{t('nutrition.foodName')}</span>
                                            </div>
                                            <input
                                                type="text"
                                                name="name"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(index, e)}
                                                className="ingredient-input"
                                                placeholder={t('nutrition.foodNamePlaceholder')}
                                            />
                                            {item.showResults && item.searchResults.length > 0 && (
                                                <div className="search-results">
                                                    {item.searchResults.map((food, idx) => (
                                                        <div key={idx} className="result-item" onClick={() => handleSelectFood(index, food)}>
                                                            <span className="food-name">{food.name}</span>
                                                            <div className="result-nutrients">
                                                                <span className="nutrient calories">{food.calories} kcal</span>
                                                                <span className="nutrient protein">{food.protein}g</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {item.isSearching && <div className="searching-indicator">جاري البحث...</div>}
                                        </div>
                                        <div className="field-row">
                                            <div className="field-group">
                                                <div className="field-label">
                                                    <span>⚖️</span>
                                                    <span>{t('nutrition.quantity')}</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(index, e)}
                                                    className="quantity-input"
                                                    step="any"
                                                />
                                            </div>
                                            <div className="field-group">
                                                <div className="field-label">
                                                    <span>📏</span>
                                                    <span>{t('nutrition.unit')}</span>
                                                </div>
                                                <select
                                                    value={item.unit}
                                                    onChange={(e) => {
                                                        const newItems = [...foodItems];
                                                        newItems[index].unit = e.target.value;
                                                        setFoodItems(newItems);
                                                    }}
                                                    className="unit-select"
                                                >
                                                    {getUnitOptions().map(unit => (
                                                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="nutrition-fields-row">
                                            <div className="field-group">
                                                <div className="field-label">🔥 {t('nutrition.calories')}</div>
                                                <input
                                                    type="number"
                                                    name="calories"
                                                    value={item.calories}
                                                    onChange={(e) => handleItemChange(index, e)}
                                                    className="nutrition-input"
                                                    placeholder="kcal"
                                                />
                                            </div>
                                            <div className="field-group">
                                                <div className="field-label">💪 {t('nutrition.protein')}</div>
                                                <input
                                                    type="number"
                                                    name="protein"
                                                    value={item.protein}
                                                    onChange={(e) => handleItemChange(index, e)}
                                                    className="nutrition-input"
                                                    placeholder="g"
                                                />
                                            </div>
                                            <div className="field-group">
                                                <div className="field-label">🌾 {t('nutrition.carbs')}</div>
                                                <input
                                                    type="number"
                                                    name="carbs"
                                                    value={item.carbs}
                                                    onChange={(e) => handleItemChange(index, e)}
                                                    className="nutrition-input"
                                                    placeholder="g"
                                                />
                                            </div>
                                            <div className="field-group">
                                                <div className="field-label">🫒 {t('nutrition.fat')}</div>
                                                <input
                                                    type="number"
                                                    name="fat"
                                                    value={item.fat}
                                                    onChange={(e) => handleItemChange(index, e)}
                                                    className="nutrition-input"
                                                    placeholder="g"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddItem} className="add-ingredient-btn">
                                <span>➕</span>
                                <span>{t('nutrition.addIngredient')}</span>
                            </button>
                        </div>
                    </div>

                    {/* قسم الملاحظات */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-number">4</div>
                            <h3 className="section-title">{t('nutrition.notes')}</h3>
                            <div className="section-line"></div>
                        </div>
                        <textarea
                            name="notes"
                            value={mealData.notes}
                            onChange={handleMealChange}
                            className="notes-textarea"
                            placeholder={t('nutrition.notesPlaceholder')}
                        />
                    </div>

                    {/* أزرار الإجراء */}
                    <div className="form-actions-enhanced">
                        <button type="button" onClick={clearForm} className="action-btn secondary">
                            <span>🔄</span>
                            <span>{t('common.reset')}</span>
                        </button>
                        <button type="submit" disabled={isLoading} className="action-btn primary">
                            {isLoading ? (
                                <><span className="loading-spinner-small"></span><span>{t('common.saving')}</span></>
                            ) : (
                                <><span>💾</span><span>{editingMeal ? t('common.update') : t('common.save')}</span></>
                            )}
                        </button>
                    </div>
                </form>

                {/* قسم الوجبات المسجلة */}
                <div className="enhanced-history-section">
                    <div className="history-header">
                        <div className="header-left">
                            <span className="history-icon">📋</span>
                            <h3>{t('nutrition.recentMeals')}</h3>
                        </div>
                        <div className="header-right">
                            <span className="meals-count">{meals.length} {t('nutrition.meals')}</span>
                            <button onClick={fetchMeals} className="refresh-history-btn" disabled={loadingMeals}>
                                {loadingMeals ? '⏳' : '🔄'}
                            </button>
                        </div>
                    </div>
                    
                    {loadingMeals ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>{t('common.loading')}</p>
                        </div>
                    ) : meals.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-illustration">🍽️</div>
                            <p>{t('nutrition.noMealsYet')}</p>
                        </div>
                    ) : (
                        <div className="meals-timeline">
                            {meals.slice(0, 10).map(meal => (
                                <div key={meal.id} className="timeline-item">
                                    <div className="timeline-marker" style={{ background: getMealTypeColor(meal.meal_type) }}>
                                        {getMealTypeChoices(t).find(m => m.value === meal.meal_type)?.label.split(' ')[0]}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="content-header">
                                            <span className="meal-type">{getMealTypeChoices(t).find(m => m.value === meal.meal_type)?.label}</span>
                                            <div className="meal-actions">
                                                <button onClick={() => handleEditMeal(meal)} className="icon-btn edit" title={t('common.edit')}>✏️</button>
                                                <button onClick={() => handleDeleteMeal(meal.id)} className="icon-btn delete" title={t('common.delete')}>🗑️</button>
                                            </div>
                                        </div>
                                        <div className="meal-time">{formatMealDate(meal.meal_time)}</div>
                                        <div className="nutrition-badges">
                                            <div className="badge calories">
                                                <span className="badge-value">{meal.total_calories}</span>
                                                <span className="badge-label">{t('nutrition.calories')}</span>
                                            </div>
                                            {meal.ingredients && meal.ingredients.length > 0 && (
                                                <>
                                                    <div className="badge protein">
                                                        <span className="badge-value">{meal.ingredients.reduce((sum, i) => sum + (i.protein || 0), 0)}g</span>
                                                        <span className="badge-label">{t('nutrition.protein')}</span>
                                                    </div>
                                                    <div className="badge carbs">
                                                        <span className="badge-value">{meal.ingredients.reduce((sum, i) => sum + (i.carbs || 0), 0)}g</span>
                                                        <span className="badge-label">{t('nutrition.carbs')}</span>
                                                    </div>
                                                    <div className="badge fat">
                                                        <span className="badge-value">{meal.ingredients.reduce((sum, i) => sum + (i.fat || 0), 0)}g</span>
                                                        <span className="badge-label">{t('nutrition.fat')}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {meal.ingredients && meal.ingredients.length > 0 && (
                                            <div className="ingredients-list">
                                                <ul>
                                                    {meal.ingredients.slice(0, 4).map((ing, idx) => (
                                                        <li key={idx}>🍽️ {ing.name} {ing.quantity}{ing.unit}</li>
                                                    ))}
                                                    {meal.ingredients.length > 4 && (
                                                        <li className="more-tag">+{meal.ingredients.length - 4}</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        {meal.notes && <div className="notes">📝 {meal.notes}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* رسائل الإشعارات */}
            {message && (
                <div className={`notification-message ${messageType}`}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="close-message">✕</button>
                </div>
            )}

            <style jsx>{`

                .camera-btn {
                    width: 48px; height: 48px; border: none; border-radius: 50%; background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(5px); color: white; font-size: 1.5rem; cursor: pointer;
                    transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;
                }
                .camera-btn:hover:not(:disabled) { background: rgba(255,255,255,0.3); transform: scale(1.05); }
                .camera-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .nutrition-form-container { max-width: 1200px; margin: 0 auto; padding: 24px; }
                .enhanced-header { position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 24px; overflow: hidden; margin-bottom: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                .header-pattern { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
                .header-content-wrapper { position: relative; display: flex; align-items: center; gap: 24px; padding: 32px; backdrop-filter: blur(10px); }
                .header-icon-container { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
                .icon-glow { position: absolute; width: 100%; height: 100%; background: rgba(255,255,255,0.3); border-radius: 50%; animation: pulse 2s infinite; }
                .header-icon { position: relative; font-size: 3.5rem; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2)); }
                .header-text { flex: 1; }
                .header-title { color: white; font-size: 2rem; font-weight: 700; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header-subtitle { color: rgba(255,255,255,0.9); font-size: 1rem; margin: 0; }
                .header-badge { background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); padding: 12px 24px; border-radius: 50px; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.3); }
                .badge-icon { font-size: 1.2rem; }
                .badge-text { color: white; font-weight: 600; }
                .enhanced-summary-card { background: var(--card-bg); border-radius: 20px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden; border: 1px solid var(--border-light); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                .summary-gradient { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #667eea, #764ba2, #f093fb); }
                .summary-content { position: relative; }
                .summary-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
                .summary-icon { font-size: 1.5rem; }
                .summary-title h4 { margin: 0; color: var(--text-primary); font-size: 1.2rem; }
                .summary-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
                .stat-item { background: var(--secondary-bg); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 12px; transition: all 0.3s ease; }
                .stat-item:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                .stat-icon { width: 48px; height: 48px; background: var(--card-bg); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
                .stat-info { flex: 1; }
                .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
                .stat-label { font-size: 0.85rem; color: var(--text-tertiary); }
                .form-section { background: var(--card-bg); border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid var(--border-light); }
                .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
                .section-number { width: 36px; height: 36px; background: var(--primary-color); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
                .section-title { margin: 0; color: var(--text-primary); font-size: 1.2rem; }
                .section-line { flex: 1; height: 2px; background: linear-gradient(90deg, var(--primary-color), transparent); }
                .form-row { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
                .form-label { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; }
                .meal-type-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
                .meal-type-chip { all: unset; padding: 12px 8px; border-radius: 50px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.3s ease; font-size: 0.9rem; border: 2px solid transparent; }
                .meal-type-chip.active { background: var(--chip-color) !important; color: white; transform: scale(1.05); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
                .meal-type-chip:not(.active) { background: var(--chip-bg); color: var(--chip-color); }
                .time-input { width: 100%; padding: 14px 16px; background: var(--secondary-bg); border: 2px solid var(--border-light); border-radius: 12px; color: var(--text-primary); font-size: 1rem; }
                .ingredients-container { display: flex; flex-direction: column; gap: 16px; }
                .ingredient-card { background: var(--secondary-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--border-light); transition: all 0.3s ease; }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .item-number-wrapper { width: 32px; height: 32px; background: var(--primary-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
                .item-number { color: white; font-weight: 600; font-size: 0.9rem; }
                .remove-btn { width: 36px; height: 36px; border: none; border-radius: 8px; background: var(--error-bg); color: var(--error-color); cursor: pointer; transition: all 0.3s ease; }
                .remove-btn:hover { background: var(--error-color); color: white; }
                .ingredient-fields { display: flex; flex-direction: column; gap: 16px; }
                .field-group { position: relative; }
                .field-label { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--text-secondary); font-size: 0.9rem; }
                .ingredient-input { width: 100%; padding: 12px 16px; background: var(--card-bg); border: 2px solid var(--border-light); border-radius: 10px; color: var(--text-primary); font-size: 1rem; }
                .search-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-light); border-radius: 10px; margin-top: 4px; max-height: 300px; overflow-y: auto; z-index: 100; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                .result-item { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s ease; }
                .result-item:hover { background: var(--secondary-bg); }
                .food-name { font-weight: 500; color: var(--text-primary); }
                .result-nutrients { display: flex; gap: 8px; }
                .nutrient { font-size: 0.85rem; padding: 4px 8px; border-radius: 20px; }
                .nutrient.calories { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .nutrient.protein { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .quantity-input, .unit-select { width: 100%; padding: 12px 16px; background: var(--card-bg); border: 2px solid var(--border-light); border-radius: 10px; color: var(--text-primary); font-size: 1rem; }
                .nutrition-fields-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
                .nutrition-input { width: 100%; padding: 8px 10px; background: var(--card-bg); border: 2px solid var(--border-light); border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; }
                .add-ingredient-btn { width: 100%; padding: 16px; background: var(--secondary-bg); border: 2px dashed var(--border-light); border-radius: 12px; color: var(--text-secondary); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.3s ease; }
                .notes-textarea { width: 100%; padding: 16px; background: var(--secondary-bg); border: 2px solid var(--border-light); border-radius: 12px; color: var(--text-primary); font-size: 1rem; resize: vertical; min-height: 100px; }
                .form-actions-enhanced { display: flex; gap: 16px; margin-top: 32px; }
                .action-btn { flex: 1; padding: 16px; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.3s ease; }
                .action-btn.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                .action-btn.secondary { background: var(--secondary-bg); color: var(--text-primary); border: 1px solid var(--border-light); }
                .enhanced-history-section { background: var(--card-bg); border-radius: 24px; padding: 32px; margin: 32px 0; border: 1px solid var(--border-light); }
                .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .header-left { display: flex; align-items: center; gap: 12px; }
                .history-icon { font-size: 1.8rem; }
                .header-left h3 { margin: 0; color: var(--text-primary); }
                .header-right { display: flex; align-items: center; gap: 16px; }
                .meals-count { padding: 6px 12px; background: var(--secondary-bg); border-radius: 20px; color: var(--text-secondary); }
                .refresh-history-btn { width: 40px; height: 40px; border: none; border-radius: 10px; background: var(--secondary-bg); color: var(--text-primary); cursor: pointer; transition: all 0.3s ease; }
                .meals-timeline { position: relative; }
                .meals-timeline::before { content: ''; position: absolute; left: 24px; top: 0; bottom: 0; width: 2px; background: var(--border-light); }
                .timeline-item { position: relative; padding-left: 60px; margin-bottom: 24px; }
                .timeline-marker { position: absolute; left: 12px; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .timeline-content { background: var(--secondary-bg); border-radius: 16px; padding: 20px; }
                .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .meal-type { font-weight: 700; font-size: 1.1rem; }
                .meal-actions { display: flex; gap: 8px; }
                .icon-btn { width: 32px; height: 32px; border: none; border-radius: 6px; background: var(--card-bg); cursor: pointer; transition: all 0.2s ease; }
                .icon-btn.edit:hover { background: var(--primary-color); color: white; }
                .icon-btn.delete:hover { background: var(--error-color); color: white; }
                .meal-time { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px; }
                .nutrition-badges { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
                .nutrition-badges .badge { flex: 1; min-width: 60px; padding: 6px 4px; background: var(--card-bg); border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .badge-value { font-size: 0.9rem; font-weight: 700; }
                .badge.calories .badge-value { color: #ef4444; }
                .badge.protein .badge-value { color: #22c55e; }
                .badge.carbs .badge-value { color: #f59e0b; }
                .badge.fat .badge-value { color: #3b82f6; }
                .badge-label { font-size: 0.6rem; color: var(--text-tertiary); }
                .ingredients-list { border-top: 1px solid var(--border-light); padding-top: 12px; }
                .ingredients-list ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
                .ingredients-list li { display: flex; align-items: center; gap: 4px; background: var(--card-bg); padding: 4px 8px; border-radius: 20px; font-size: 0.75rem; }
                .more-tag { background: var(--card-bg); padding: 4px 8px; border-radius: 20px; font-size: 0.75rem; color: var(--text-secondary); }
                .notification-message { position: fixed; bottom: 24px; right: 24px; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; animation: slideIn 0.3s ease; z-index: 1000; }
                .notification-message.success { background: #10b981; color: white; }
                .notification-message.error { background: #ef4444; color: white; }
                .notification-message.info { background: #3b82f6; color: white; }
                .close-message { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
                .loading-state { text-align: center; padding: 48px; color: var(--text-secondary); }
                .loading-spinner { width: 40px; height: 40px; border: 3px solid var(--border-light); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
                .empty-state { text-align: center; padding: 48px; background: var(--secondary-bg); border-radius: 16px; }
                .empty-illustration { font-size: 4rem; margin-bottom: 16px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.2); opacity: 0.5; } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @media (max-width: 768px) { .header-content-wrapper { flex-direction: column; text-align: center; } .form-row { grid-template-columns: 1fr; } .meal-type-grid { grid-template-columns: repeat(3, 1fr); } .summary-stats-grid { grid-template-columns: repeat(2, 1fr); } .field-row { grid-template-columns: 1fr; } .nutrition-fields-row { grid-template-columns: repeat(2, 1fr); } .form-actions-enhanced { flex-direction: column; } .timeline-item { padding-left: 50px; } .timeline-marker { left: 5px; width: 35px; height: 35px; } }
            `}</style>
        </div>
    );
}

export default NutritionForm;