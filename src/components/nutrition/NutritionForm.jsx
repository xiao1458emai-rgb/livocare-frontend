// src/components/nutrition/NutritionForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import axiosInstance from "../../services/api";
import BarcodeScanner from '../Camera/BarcodeScanner';
import '../../index.css';  

// ✅ إعدادات اللغة مباشرة
const getMealTypeChoices = (isArabic) => [
    { value: 'Breakfast', label: isArabic ? 'فطور' : 'Breakfast', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' },
    { value: 'Lunch', label: isArabic ? 'غداء' : 'Lunch', color: '#FF6B35', bg: 'rgba(255, 107, 53, 0.15)' },
    { value: 'Dinner', label: isArabic ? 'عشاء' : 'Dinner', color: '#2E86AB', bg: 'rgba(46, 134, 171, 0.15)' },
    { value: 'Snack', label: isArabic ? 'وجبة خفيفة' : 'Snack', color: '#A23B72', bg: 'rgba(162, 59, 114, 0.15)' },
    { value: 'Other', label: isArabic ? 'أخرى' : 'Other', color: '#6A8D73', bg: 'rgba(106, 141, 115, 0.15)' },
];

function NutritionForm({ onDataSubmitted, isAuthReady }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
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
            unit: isArabic ? 'غرام' : 'gram', 
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

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    const checkAuth = () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setMessage(isArabic ? 'الرجاء تسجيل الدخول' : 'Please login');
            setMessageType('error');
            return false;
        }
        return true;
    };

    const fetchMeals = useCallback(async () => {
        if (!isAuthReady || !isMountedRef.current) return;
        if (!checkAuth()) return;
        
        setLoadingMeals(true);
        try {
            const response = await axiosInstance.get('/meals/');
            
            if (!isMountedRef.current) return;
            
            let mealsData = [];
            if (response.data?.results) {
                mealsData = response.data.results;
            } else if (Array.isArray(response.data)) {
                mealsData = response.data;
            }
            
            console.log('🍽️ Meals loaded:', mealsData.length);
            setMeals(mealsData);
            setMessage('');
            
        } catch (error) {
            console.error('Error fetching meals:', error);
            if (isMountedRef.current) {
                setMessage(isArabic ? 'خطأ في تحميل البيانات' : 'Error loading data');
                setMessageType('error');
                setMeals([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoadingMeals(false);
            }
        }
    }, [isAuthReady, isArabic]);

    useEffect(() => {
        if (isAuthReady) {
            fetchMeals();
        }
    }, [isAuthReady, fetchMeals]);

    const handleDeleteMeal = async (mealId) => {
        if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذه الوجبة؟' : 'Are you sure you want to delete this meal?')) return;
        
        try {
            await axiosInstance.delete(`/meals/${mealId}/`);
            if (isMountedRef.current) {
                setMeals(prev => prev.filter(meal => meal.id !== mealId));
                setMessage(isArabic ? 'تم حذف الوجبة بنجاح' : 'Meal deleted successfully');
                setMessageType('success');
                setRefreshAnalytics(prev => prev + 1);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting meal:', error);
            if (isMountedRef.current) {
                setMessage(isArabic ? 'خطأ في حذف الوجبة' : 'Error deleting meal');
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
            const results = response.data?.data || response.data?.results || [];
            
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
            unit: isArabic ? 'غرام' : 'gram', 
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
                unit: isArabic ? 'غرام' : 'gram', 
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
        console.log('📦 Barcode result:', result);
        const barcode = result;

        if (!barcode) return;

        setShowScanner(false);
        setIsLoading(true);
        setMessage(isArabic ? 'جاري البحث عن المنتج...' : 'Searching for product...');
        setMessageType('info');

        try {
            const offResponse = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { timeout: 15000 });

            if (offResponse.data.status === 1) {
                const product = offResponse.data.product;
                const nutriments = product.nutriments || {};

                const productData = {
                    name: product.product_name || product.generic_name || (isArabic ? `منتج (${barcode.slice(-8)})` : `Product (${barcode.slice(-8)})`),
                    calories: nutriments['energy-kcal'] || nutriments.energy || 0,
                    protein: nutriments.proteins || 0,
                    carbs: nutriments.carbohydrates || 0,
                    fat: nutriments.fat || 0,
                    barcode: barcode,
                    unit: isArabic ? 'غرام' : 'gram'
                };

                setFoodItems(prev => [...prev, {
                    name: productData.name,
                    quantity: '100',
                    unit: isArabic ? 'غرام' : 'gram',
                    calories: productData.calories.toString(),
                    protein: productData.protein.toString(),
                    carbs: productData.carbs.toString(),
                    fat: productData.fat.toString(),
                    barcode: barcode,
                    isSearching: false,
                    searchResults: [],
                    showResults: false,
                    selectedFood: productData,
                    manualEdit: true
                }]);

                setMessage(isArabic ? `✅ تم العثور على المنتج: ${productData.name}` : `✅ Product found: ${productData.name}`);
                setMessageType('success');
            } else {
                setFoodItems(prev => [...prev, {
                    name: isArabic ? `منتج جديد (${barcode.slice(-8)})` : `New product (${barcode.slice(-8)})`,
                    quantity: '100',
                    unit: isArabic ? 'غرام' : 'gram',
                    calories: '',
                    protein: '',
                    carbs: '',
                    fat: '',
                    barcode: barcode,
                    isSearching: false,
                    searchResults: [],
                    showResults: false,
                    selectedFood: null,
                    manualEdit: true
                }]);
                setMessage(isArabic ? '⚠️ المنتج غير موجود، تمت إضافته كمنتج جديد' : '⚠️ Product not found, added as new product');
                setMessageType('info');
            }
        } catch (error) {
            console.error('❌ Error in barcode search:', error);
            setFoodItems(prev => [...prev, {
                name: isArabic ? `منتج جديد (${barcode.slice(-8)})` : `New product (${barcode.slice(-8)})`,
                quantity: '100',
                unit: isArabic ? 'غرام' : 'gram',
                calories: '',
                protein: '',
                carbs: '',
                fat: '',
                barcode: barcode,
                isSearching: false,
                searchResults: [],
                showResults: false,
                selectedFood: null,
                manualEdit: true
            }]);
            setMessage(isArabic ? '⚠️ خطأ في البحث، تمت إضافة منتج جديد' : '⚠️ Search error, added as new product');
            setMessageType('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleUpdateMeal = async (e) => {
        e.preventDefault();
        if (!isAuthReady || !editingMeal) {
            setMessage(isArabic ? 'الرجاء تسجيل الدخول' : 'Please login');
            setMessageType('error');
            return;
        }
        setIsLoading(true);
        const validItems = foodItems.filter(item => item.name && item.quantity);
        if (validItems.length === 0) {
            setMessage(isArabic ? 'أضف مكون واحد على الأقل' : 'Add at least one ingredient');
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
                setMessage(isArabic ? 'تم تحديث الوجبة بنجاح' : 'Meal updated successfully');
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
                setMessage(isArabic ? 'فشل تحديث الوجبة' : 'Failed to update meal');
                setMessageType('error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthReady) {
            setMessage(isArabic ? 'الرجاء تسجيل الدخول' : 'Please login');
            setMessageType('error');
            return;
        }
        setIsLoading(true);
        const validItems = foodItems.filter(item => item.name && item.quantity);
        if (validItems.length === 0) {
            setMessage(isArabic ? 'أضف مكون واحد على الأقل' : 'Add at least one ingredient');
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
                setMessage(isArabic ? 'تم إضافة الوجبة بنجاح' : 'Meal added successfully');
                setMessageType('success');
                setRefreshAnalytics(prev => prev + 1);
                await fetchMeals();
                clearForm();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (error) {
            console.error('Submission error:', error);
            if (isMountedRef.current) {
                setMessage(isArabic ? 'فشل حفظ الوجبة' : 'Failed to save meal');
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
            unit: isArabic ? 'غرام' : 'gram', 
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
        const meal = getMealTypeChoices(isArabic).find(m => m.value === mealType);
        return meal ? meal.color : '#6c757d';
    };

    const formatMealDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getUnitOptions = () => {
        return [
            { value: isArabic ? 'غرام' : 'gram', label: isArabic ? 'غرام' : 'gram' },
            { value: isArabic ? 'مل' : 'ml', label: isArabic ? 'مل' : 'ml' },
            { value: isArabic ? 'قطعة' : 'piece', label: isArabic ? 'قطعة' : 'piece' },
            { value: isArabic ? 'كوب' : 'cup', label: isArabic ? 'كوب' : 'cup' }
        ];
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, []);

    return (
        <div className="analytics-container">
            {showScanner && (
                <BarcodeScanner 
                    onScan={handleBarcodeScanned} 
                    onClose={() => setShowScanner(false)} 
                />
            )}
            
            {/* رأس النموذج */}
            <div className="analytics-header">
                <h2>{editingMeal ? (isArabic ? 'تعديل وجبة' : 'Edit Meal') : (isArabic ? 'إضافة وجبة' : 'Add Meal')}</h2>
                <button 
                    type="button" 
                    onClick={() => setShowScanner(true)}
                    className="refresh-btn"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
                    disabled={isLoading}
                >
                    📷
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>

            {/* ملخص التغذية السريع */}
            <div className="analytics-stats-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="analytics-stat-card">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-content">
                        <div className="stat-value">{nutritionSummary.totalCalories}</div>
                        <div className="stat-label">{isArabic ? 'سعرات' : 'Calories'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">💪</div>
                    <div className="stat-content">
                        <div className="stat-value">{nutritionSummary.totalProtein}g</div>
                        <div className="stat-label">{isArabic ? 'بروتين' : 'Protein'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">🌾</div>
                    <div className="stat-content">
                        <div className="stat-value">{nutritionSummary.totalCarbs}g</div>
                        <div className="stat-label">{isArabic ? 'كربوهيدرات' : 'Carbs'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">🫒</div>
                    <div className="stat-content">
                        <div className="stat-value">{nutritionSummary.totalFat}g</div>
                        <div className="stat-label">{isArabic ? 'دهون' : 'Fat'}</div>
                    </div>
                </div>
            </div>

            <form onSubmit={editingMeal ? handleUpdateMeal : handleSubmit}>
                {/* قسم نوع الوجبة */}
                <div className="recommendations-section">
                    <h3>{isArabic ? 'نوع الوجبة' : 'Meal Type'}</h3>
                    <div className="type-filters" style={{ marginTop: 'var(--spacing-md)' }}>
                        {getMealTypeChoices(isArabic).map(meal => (
                            <button
                                key={meal.value}
                                type="button"
                                className={`type-btn ${mealData.meal_type === meal.value ? 'active' : ''}`}
                                onClick={() => setMealData(prev => ({ ...prev, meal_type: meal.value }))}
                            >
                                {meal.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* قسم وقت الوجبة */}
                <div className="recommendations-section">
                    <h3>{isArabic ? 'وقت الوجبة' : 'Meal Time'}</h3>
                    <input
                        type="datetime-local"
                        name="meal_time"
                        value={mealData.meal_time}
                        onChange={handleMealChange}
                        className="search-input"
                        style={{ marginTop: 'var(--spacing-md)' }}
                    />
                </div>

                {/* قسم المكونات */}
                <div className="recommendations-section">
                    <h3>{isArabic ? 'المكونات' : 'Ingredients'}</h3>
                    <div className="ingredients-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                        {foodItems.map((item, index) => (
                            <div key={index} className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <div className="card-icon" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
                                        {index + 1}
                                    </div>
                                    {foodItems.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="delete-read-btn" style={{ padding: 'var(--spacing-xs) var(--spacing-md)' }}>
                                            ✕
                                        </button>
                                    )}
                                </div>
                                
                                <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label>{isArabic ? 'اسم الطعام' : 'Food Name'}</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={item.name}
                                        onChange={(e) => handleItemChange(index, e)}
                                        className="search-input"
                                        placeholder={isArabic ? 'ابحث عن طعام...' : 'Search for food...'}
                                    />
                                    {item.showResults && item.searchResults.length > 0 && (
                                        <div className="search-results" style={{ 
                                            position: 'absolute', 
                                            background: 'var(--card-bg)', 
                                            border: '1px solid var(--border-light)',
                                            borderRadius: 'var(--radius-lg)',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            zIndex: 100
                                        }}>
                                            {item.searchResults.map((food, idx) => (
                                                <div key={idx} className="recommendation-card" onClick={() => handleSelectFood(index, food)} style={{ cursor: 'pointer', margin: 0 }}>
                                                    <div className="rec-header">
                                                        <span className="rec-category">{food.name}</span>
                                                        <span className="rec-type">{food.calories} kcal</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="field-group">
                                        <label>{isArabic ? 'الكمية' : 'Quantity'}</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(index, e)}
                                            className="search-input"
                                            step="any"
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'الوحدة' : 'Unit'}</label>
                                        <select
                                            value={item.unit}
                                            onChange={(e) => {
                                                const newItems = [...foodItems];
                                                newItems[index].unit = e.target.value;
                                                setFoodItems(newItems);
                                            }}
                                            className="search-input"
                                        >
                                            {getUnitOptions().map(unit => (
                                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                    <div className="field-group">
                                        <label>{isArabic ? 'سعرات' : 'Calories'}</label>
                                        <input
                                            type="number"
                                            name="calories"
                                            value={item.calories}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="search-input"
                                            placeholder="kcal"
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'بروتين' : 'Protein'}</label>
                                        <input
                                            type="number"
                                            name="protein"
                                            value={item.protein}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="search-input"
                                            placeholder="g"
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'كربوهيدرات' : 'Carbs'}</label>
                                        <input
                                            type="number"
                                            name="carbs"
                                            value={item.carbs}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="search-input"
                                            placeholder="g"
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'دهون' : 'Fat'}</label>
                                        <input
                                            type="number"
                                            name="fat"
                                            value={item.fat}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="search-input"
                                            placeholder="g"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddItem} className="add-ingredient-btn" style={{ width: '100%', padding: 'var(--spacing-md)', background: 'var(--secondary-bg)', border: '2px dashed var(--border-light)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
                            ➕ {isArabic ? 'أضف مكون' : 'Add Ingredient'}
                        </button>
                    </div>
                </div>

                {/* قسم الملاحظات */}
                <div className="recommendations-section">
                    <h3>{isArabic ? 'ملاحظات' : 'Notes'}</h3>
                    <textarea
                        name="notes"
                        value={mealData.notes}
                        onChange={handleMealChange}
                        className="search-input"
                        style={{ minHeight: '80px', resize: 'vertical' }}
                        placeholder={isArabic ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                    />
                </div>

                {/* أزرار الإجراء */}
                <div className="analytics-header" style={{ justifyContent: 'center', gap: 'var(--spacing-md)', borderBottom: 'none' }}>
                    <button type="button" onClick={clearForm} className="type-btn">
                        {isArabic ? 'إعادة تعيين' : 'Reset'}
                    </button>
                    <button type="submit" disabled={isLoading} className="type-btn active">
                        {isLoading ? '⏳' : ''} {editingMeal ? (isArabic ? 'تحديث' : 'Update') : (isArabic ? 'حفظ' : 'Save')}
                    </button>
                </div>
            </form>

            {/* قسم الوجبات المسجلة */}
            <div className="recommendations-section" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>{isArabic ? 'الوجبات المسجلة' : 'Recorded Meals'}</h3>
                    <button onClick={fetchMeals} className="refresh-btn" disabled={loadingMeals}>
                        {loadingMeals ? '⏳' : '🔄'}
                    </button>
                </div>
                
                {loadingMeals ? (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                    </div>
                ) : meals.length === 0 ? (
                    <div className="analytics-empty">
                        <div className="empty-icon">🍽️</div>
                        <p>{isArabic ? 'لا توجد وجبات مسجلة بعد' : 'No meals recorded yet'}</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {meals.slice(0, 10).map(meal => (
                            <div key={meal.id} className="notification-card">
                                <div className="notification-header">
                                    <div className="notification-title">
                                        <span>{getMealTypeChoices(isArabic).find(m => m.value === meal.meal_type)?.label}</span>
                                    </div>
                                    <div className="notification-meta">
                                        <span className="notification-time">{formatMealDate(meal.meal_time)}</span>
                                        <div className="notification-actions">
                                            <button onClick={() => handleEditMeal(meal)} className="notification-action-btn">✏️</button>
                                            <button onClick={() => handleDeleteMeal(meal.id)} className="notification-action-btn">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="notification-content">
                                    <div className="nutrition-badges" style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                        <span className="priority-badge priority-urgent">{meal.total_calories} {isArabic ? 'سعرة' : 'cal'}</span>
                                        {meal.ingredients && meal.ingredients.length > 0 && (
                                            <>
                                                <span className="priority-badge priority-high">{meal.ingredients.reduce((sum, i) => sum + (i.protein || 0), 0)}g {isArabic ? 'بروتين' : 'protein'}</span>
                                                <span className="priority-badge priority-medium">{meal.ingredients.reduce((sum, i) => sum + (i.carbs || 0), 0)}g {isArabic ? 'كربوهيدرات' : 'carbs'}</span>
                                                <span className="priority-badge priority-low">{meal.ingredients.reduce((sum, i) => sum + (i.fat || 0), 0)}g {isArabic ? 'دهون' : 'fat'}</span>
                                            </>
                                        )}
                                    </div>
                                    {meal.ingredients && meal.ingredients.length > 0 && (
                                        <div className="ingredients-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                                            {meal.ingredients.slice(0, 4).map((ing, idx) => (
                                                <span key={idx} className="rec-type tip">
                                                    {ing.name} {ing.quantity}{ing.unit}
                                                </span>
                                            ))}
                                            {meal.ingredients.length > 4 && (
                                                <span className="rec-type">+{meal.ingredients.length - 4}</span>
                                            )}
                                        </div>
                                    )}
                                    {meal.notes && <div className="rec-advice" style={{ marginTop: 'var(--spacing-sm)' }}>{meal.notes}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* رسائل الإشعارات */}
            {message && (
                <div className={`notification-message ${messageType}`} style={{
                    position: 'fixed',
                    bottom: 'var(--spacing-lg)',
                    right: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderRadius: 'var(--radius-lg)',
                    background: messageType === 'success' ? 'var(--success)' : messageType === 'error' ? 'var(--error)' : 'var(--info)',
                    color: 'white',
                    zIndex: 1000
                }}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: 'var(--spacing-md)' }}>✕</button>
                </div>
            )}
        </div>
    );
}

export default NutritionForm;