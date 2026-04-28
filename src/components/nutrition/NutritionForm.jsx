// src/components/nutrition/NutritionForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import axiosInstance from "../../services/api";
import BarcodeScanner from '../Camera/BarcodeScanner';
import '../../index.css';  

// ✅ خيارات أنواع الوجبات
const getMealTypeChoices = (isArabic) => [
    { value: 'Breakfast', label: isArabic ? '🍳 فطور' : '🍳 Breakfast', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    { value: 'Lunch', label: isArabic ? '🍲 غداء' : '🍲 Lunch', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { value: 'Dinner', label: isArabic ? '🍽️ عشاء' : '🍽️ Dinner', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    { value: 'Snack', label: isArabic ? '🍎 وجبة خفيفة' : '🍎 Snack', color: '#ec489a', bg: 'rgba(236, 72, 153, 0.15)' },
    { value: 'Other', label: isArabic ? '📝 أخرى' : '📝 Other', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
];

// ✅ خيارات الوحدات
const getUnitOptions = (isArabic) => [
    { value: 'gram', label: isArabic ? 'غرام' : 'gram', symbol: 'g' },
    { value: 'ml', label: isArabic ? 'ملليلتر' : 'milliliter', symbol: 'ml' },
    { value: 'piece', label: isArabic ? 'قطعة' : 'piece', symbol: isArabic ? 'قطعة' : 'pc' },
    { value: 'cup', label: isArabic ? 'كوب' : 'cup', symbol: isArabic ? 'كوب' : 'cup' },
    { value: 'tablespoon', label: isArabic ? 'ملعقة كبيرة' : 'tablespoon', symbol: isArabic ? 'ملعقة' : 'tbsp' },
    { value: 'teaspoon', label: isArabic ? 'ملعقة صغيرة' : 'teaspoon', symbol: isArabic ? 'ملعقة صغيرة' : 'tsp' },
];

function NutritionForm({ onDataSubmitted, isAuthReady }) {
    // ✅ إعدادات اللغة
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
    const [isMobile, setIsMobile] = useState(false);
    
    const [mealData, setMealData] = useState({
        meal_type: 'Breakfast',
        meal_time: new Date().toISOString().slice(0, 16),
        notes: ''
    });

    const [foodItems, setFoodItems] = useState([
        { 
            name: '', 
            quantity: '100', 
            unit: 'gram', 
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

    // ✅ كشف حجم الشاشة
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ✅ التحقق من المصادقة
    const checkAuth = () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
            return false;
        }
        return true;
    };

    // ✅ عرض رسالة
    const showMessage = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 4000);
    };

    // ✅ جلب الوجبات
    const fetchMeals = useCallback(async () => {
        if (!isAuthReady || !isMountedRef.current) return;
        if (!checkAuth()) return;
        
        setLoadingMeals(true);
        try {
            const response = await axiosInstance.get('/meals/?limit=50');
            
            if (!isMountedRef.current) return;
            
            let mealsData = [];
            if (response.data?.results) {
                mealsData = response.data.results;
            } else if (Array.isArray(response.data)) {
                mealsData = response.data;
            }
            
            console.log('🍽️ Meals loaded:', mealsData.length);
            setMeals(mealsData);
            
        } catch (error) {
            console.error('Error fetching meals:', error);
            if (isMountedRef.current) {
                showMessage(isArabic ? '❌ خطأ في تحميل البيانات' : '❌ Error loading data', 'error');
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

    // ✅ حذف وجبة
    const handleDeleteMeal = async (mealId) => {
        if (!window.confirm(isArabic ? '⚠️ هل أنت متأكد من حذف هذه الوجبة؟' : '⚠️ Are you sure you want to delete this meal?')) return;
        
        try {
            await axiosInstance.delete(`/meals/${mealId}/`);
            if (isMountedRef.current) {
                setMeals(prev => prev.filter(meal => meal.id !== mealId));
                showMessage(isArabic ? '✅ تم حذف الوجبة بنجاح' : '✅ Meal deleted successfully', 'success');
                setRefreshAnalytics(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error deleting meal:', error);
            showMessage(isArabic ? '❌ خطأ في حذف الوجبة' : '❌ Error deleting meal', 'error');
        }
    };

    // ✅ البحث عن طعام
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

    // ✅ حساب القيم الغذائية
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

    // ✅ معالجة تغيير الحقل
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

    // ✅ اختيار طعام من نتائج البحث
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

    // ✅ تغيير الكمية
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

    // ✅ إضافة عنصر
    const handleAddItem = () => {
        setFoodItems(prev => [...prev, { 
            name: '', 
            quantity: '100', 
            unit: 'gram', 
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

    // ✅ إزالة عنصر
    const handleRemoveItem = (index) => {
        if (foodItems.length === 1) {
            showMessage(isArabic ? '⚠️ يجب وجود مكون واحد على الأقل' : '⚠️ At least one ingredient is required', 'error');
            return;
        }
        setFoodItems(prev => prev.filter((_, i) => i !== index));
    };

    // ✅ ملخص التغذية
    const nutritionSummary = React.useMemo(() => {
        return foodItems.reduce((acc, item) => ({
            totalCalories: acc.totalCalories + (parseFloat(item.calories) || 0),
            totalProtein: acc.totalProtein + (parseFloat(item.protein) || 0),
            totalCarbs: acc.totalCarbs + (parseFloat(item.carbs) || 0),
            totalFat: acc.totalFat + (parseFloat(item.fat) || 0)
        }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    }, [foodItems]);

    // ✅ معالجة تغيير الوجبة
    const handleMealChange = (e) => {
        const { name, value } = e.target;
        setMealData(prev => ({ ...prev, [name]: value }));
    };

    // ✅ تحرير وجبة
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
                unit: item.unit || 'gram',
                calories: item.calories?.toString() || '',
                protein: item.protein?.toString() || '',
                carbs: item.carbs?.toString() || '',
                fat: item.fat?.toString() || '',
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
                unit: 'gram', 
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

    // ✅ معالجة مسح الباركود
    const handleBarcodeScanned = async (result) => {
        console.log('📦 Barcode result:', result);
        const barcode = result;

        if (!barcode) return;

        setShowScanner(false);
        setIsLoading(true);
        showMessage(isArabic ? '🔍 جاري البحث عن المنتج...' : '🔍 Searching for product...', 'info');

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
                    unit: 'gram'
                };

                setFoodItems(prev => [...prev, {
                    name: productData.name,
                    quantity: '100',
                    unit: 'gram',
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

                showMessage(isArabic ? `✅ تم العثور على المنتج: ${productData.name}` : `✅ Product found: ${productData.name}`, 'success');
            } else {
                setFoodItems(prev => [...prev, {
                    name: isArabic ? `🍽️ منتج جديد (${barcode.slice(-8)})` : `🍽️ New product (${barcode.slice(-8)})`,
                    quantity: '100',
                    unit: 'gram',
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
                showMessage(isArabic ? '⚠️ المنتج غير موجود، تمت إضافته كمنتج جديد' : '⚠️ Product not found, added as new product', 'info');
            }
        } catch (error) {
            console.error('❌ Error in barcode search:', error);
            setFoodItems(prev => [...prev, {
                name: isArabic ? `🍽️ منتج جديد (${barcode.slice(-8)})` : `🍽️ New product (${barcode.slice(-8)})`,
                quantity: '100',
                unit: 'gram',
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
            showMessage(isArabic ? '⚠️ خطأ في البحث، تمت إضافة منتج جديد' : '⚠️ Search error, added as new product', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ تحديث الوجبة
 const handleUpdateMeal = async (e) => {
    e.preventDefault();
    if (!isAuthReady || !editingMeal) {
        showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
        return;
    }
    
    setIsLoading(true);
    const validItems = foodItems.filter(item => item.name && item.quantity);
    
    if (validItems.length === 0) {
        showMessage(isArabic ? '⚠️ أضف مكون واحد على الأقل' : '⚠️ Add at least one ingredient', 'error');
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
    
    // ✅ احسب الإجماليات
    const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
    const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    
    try {
        await axiosInstance.put(`/meals/${editingMeal.id}/`, {
            meal_type: mealData.meal_type,
            meal_time: mealData.meal_time,
            notes: mealData.notes,
            ingredients,
            total_calories: totalCalories,   // ✅ أضف هذا
            total_protein: totalProtein,     // ✅ أضف هذا
            total_carbs: totalCarbs,         // ✅ أضف هذا
            total_fat: totalFat              // ✅ أضف هذا
        });
        
        if (isMountedRef.current) {
            showMessage(isArabic ? '✅ تم تحديث الوجبة بنجاح' : '✅ Meal updated successfully', 'success');
            setRefreshAnalytics(prev => prev + 1);
            setShowEditForm(false);
            setEditingMeal(null);
            clearForm();
            await fetchMeals();
        }
    } catch (error) {
        console.error('Update error:', error);
        showMessage(isArabic ? '❌ فشل تحديث الوجبة' : '❌ Failed to update meal', 'error');
    } finally {
        setIsLoading(false);
    }
};

// ✅ أضف total_calories المحسوبة إلى الطلب
const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthReady) {
        showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
        return;
    }
    
    setIsLoading(true);
    const validItems = foodItems.filter(item => item.name && item.quantity);
    
    if (validItems.length === 0) {
        showMessage(isArabic ? '⚠️ أضف مكون واحد على الأقل' : '⚠️ Add at least one ingredient', 'error');
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
    
    // ✅ احسب الإجماليات
    const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
    const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    
    try {
        await axiosInstance.post('/meals/', {
            meal_type: mealData.meal_type,
            meal_time: mealData.meal_time,
            notes: mealData.notes,
            ingredients,
            total_calories: totalCalories,   // ✅ أضف هذا
            total_protein: totalProtein,     // ✅ أضف هذا
            total_carbs: totalCarbs,         // ✅ أضف هذا
            total_fat: totalFat              // ✅ أضف هذا
        });
        
        if (isMountedRef.current) {
            showMessage(isArabic ? '✅ تم إضافة الوجبة بنجاح' : '✅ Meal added successfully', 'success');
            setRefreshAnalytics(prev => prev + 1);
            await fetchMeals();
            clearForm();
            if (onDataSubmitted) onDataSubmitted();
        }
    } catch (error) {
        console.error('Submission error:', error);
        showMessage(isArabic ? '❌ فشل حفظ الوجبة' : '❌ Failed to save meal', 'error');
    } finally {
        setIsLoading(false);
    }
};

    // ✅ مسح النموذج
    const clearForm = () => {
        setMealData({ 
            meal_type: 'Breakfast',
            meal_time: new Date().toISOString().slice(0, 16),
            notes: ''
        });
        setFoodItems([{ 
            name: '', 
            quantity: '100', 
            unit: 'gram', 
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

    // ✅ تنسيق تاريخ الوجبة
    const formatMealDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, []);

    return (
        <div className="nutrition-form-container">
            {/* ✅ ماسح الباركود */}
            {showScanner && (
                <div className="scanner-modal" onClick={() => setShowScanner(false)}>
                    <div className="scanner-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="scanner-header">
                            <h3>📷 {isArabic ? 'مسح الباركود' : 'Scan Barcode'}</h3>
                            <button className="close-btn" onClick={() => setShowScanner(false)}>✕</button>
                        </div>
                        <BarcodeScanner 
                            onScan={handleBarcodeScanned} 
                            onClose={() => setShowScanner(false)} 
                        />
                        <div className="scanner-footer">
                            <p>📱 {isArabic ? 'ضع رمز المنتج داخل الإطار للمسح' : 'Place the barcode inside the frame to scan'}</p>
                            <button className="cancel-btn" onClick={() => setShowScanner(false)}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ✅ رأس النموذج */}
            <div className="form-header">
                <h2>
                    <span className="header-icon">🍽️</span>
                    {editingMeal ? (isArabic ? 'تعديل وجبة' : 'Edit Meal') : (isArabic ? 'إضافة وجبة' : 'Add Meal')}
                </h2>
                <div className="header-actions">
                    <button 
                        type="button" 
                        onClick={() => setShowScanner(true)}
                        className="scan-btn"
                        disabled={isLoading}
                        title={isArabic ? 'مسح باركود' : 'Scan Barcode'}
                    >
                        📷 {!isMobile && (isArabic ? 'مسح باركود' : 'Scan Barcode')}
                    </button>
                    {showEditForm && (
                        <button 
                            type="button" 
                            onClick={() => {
                                setShowEditForm(false);
                                setEditingMeal(null);
                                clearForm();
                            }}
                            className="cancel-edit-btn"
                        >
                            ✖ {isArabic ? 'إلغاء التعديل' : 'Cancel Edit'}
                        </button>
                    )}
                </div>
            </div>

            {/* ✅ ملخص التغذية السريع */}
            <div className="nutrition-summary">
                <div className="summary-card calories">
                    <span className="summary-icon">🔥</span>
                    <div className="summary-info">
                        <div className="summary-value">{nutritionSummary.totalCalories}</div>
                        <div className="summary-label">{isArabic ? 'سعرات' : 'Calories'}</div>
                    </div>
                </div>
                <div className="summary-card protein">
                    <span className="summary-icon">💪</span>
                    <div className="summary-info">
                        <div className="summary-value">{nutritionSummary.totalProtein}g</div>
                        <div className="summary-label">{isArabic ? 'بروتين' : 'Protein'}</div>
                    </div>
                </div>
                <div className="summary-card carbs">
                    <span className="summary-icon">🌾</span>
                    <div className="summary-info">
                        <div className="summary-value">{nutritionSummary.totalCarbs}g</div>
                        <div className="summary-label">{isArabic ? 'كربوهيدرات' : 'Carbs'}</div>
                    </div>
                </div>
                <div className="summary-card fats">
                    <span className="summary-icon">🥑</span>
                    <div className="summary-info">
                        <div className="summary-value">{nutritionSummary.totalFat}g</div>
                        <div className="summary-label">{isArabic ? 'دهون' : 'Fats'}</div>
                    </div>
                </div>
            </div>

            <form onSubmit={editingMeal ? handleUpdateMeal : handleSubmit} className="nutrition-form">
                {/* ✅ نوع الوجبة */}
                <div className="form-section">
                    <label className="section-label">
                        <span className="label-icon">🍽️</span>
                        {isArabic ? 'نوع الوجبة' : 'Meal Type'}
                    </label>
                    <div className="meal-type-buttons">
                        {getMealTypeChoices(isArabic).map(meal => (
                            <button
                                key={meal.value}
                                type="button"
                                className={`meal-type-btn ${mealData.meal_type === meal.value ? 'active' : ''}`}
                                onClick={() => setMealData(prev => ({ ...prev, meal_type: meal.value }))}
                                style={{
                                    background: mealData.meal_type === meal.value ? meal.color : 'var(--secondary-bg)',
                                    color: mealData.meal_type === meal.value ? 'white' : meal.color,
                                    borderColor: meal.color
                                }}
                            >
                                {meal.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ✅ وقت الوجبة */}
                <div className="form-section">
                    <label className="section-label">
                        <span className="label-icon">⏰</span>
                        {isArabic ? 'وقت الوجبة' : 'Meal Time'}
                    </label>
                    <input
                        type="datetime-local"
                        name="meal_time"
                        value={mealData.meal_time}
                        onChange={handleMealChange}
                        className="form-input"
                    />
                </div>

                {/* ✅ المكونات */}
                <div className="form-section">
                    <label className="section-label">
                        <span className="label-icon">🥘</span>
                        {isArabic ? 'المكونات' : 'Ingredients'}
                    </label>
                    <div className="ingredients-list">
                        {foodItems.map((item, index) => (
                            <div key={index} className="ingredient-card">
                                <div className="ingredient-header">
                                    <span className="ingredient-number">{index + 1}</span>
                                    {foodItems.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveItem(index)} 
                                            className="remove-ingredient-btn"
                                            title={isArabic ? 'حذف' : 'Remove'}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                
                                {/* اسم الطعام مع البحث */}
                                <div className="ingredient-field">
                                    <label>{isArabic ? 'اسم الطعام' : 'Food Name'}</label>
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            name="name"
                                            value={item.name}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="form-input"
                                            placeholder={isArabic ? 'أدخل اسم الطعام...' : 'Enter food name...'}
                                        />
                                        {item.isSearching && (
                                            <div className="searching-indicator">
                                                <div className="spinner-small"></div>
                                                <span>{isArabic ? 'جاري البحث...' : 'Searching...'}</span>
                                            </div>
                                        )}
                                        {item.showResults && item.searchResults.length > 0 && (
                                            <div className="search-results">
                                                {item.searchResults.map((food, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="search-result-item"
                                                        onClick={() => handleSelectFood(index, food)}
                                                    >
                                                        <div className="result-name">{food.name}</div>
                                                        <div className="result-calories">🔥 {food.calories} kcal</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* الكمية والوحدة */}
                                <div className="ingredient-row">
                                    <div className="ingredient-field half">
                                        <label>{isArabic ? 'الكمية' : 'Quantity'}</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(index, e)}
                                            className="form-input"
                                            step="any"
                                            min="0"
                                        />
                                    </div>
                                    <div className="ingredient-field half">
                                        <label>{isArabic ? 'الوحدة' : 'Unit'}</label>
                                        <select
                                            value={item.unit}
                                            onChange={(e) => {
                                                const newItems = [...foodItems];
                                                newItems[index].unit = e.target.value;
                                                setFoodItems(newItems);
                                            }}
                                            className="form-select"
                                        >
                                            {getUnitOptions(isArabic).map(unit => (
                                                <option key={unit.value} value={unit.value}>
                                                    {unit.label} ({unit.symbol})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* القيم الغذائية */}
                                <div className="nutrition-grid">
                                    <div className="nutrition-field">
                                        <label>🔥 {isArabic ? 'سعرات' : 'Calories'}</label>
                                        <input
                                            type="number"
                                            name="calories"
                                            value={item.calories}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="form-input"
                                            placeholder="kcal"
                                            step="any"
                                        />
                                    </div>
                                    <div className="nutrition-field">
                                        <label>💪 {isArabic ? 'بروتين' : 'Protein'}</label>
                                        <input
                                            type="number"
                                            name="protein"
                                            value={item.protein}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="form-input"
                                            placeholder="g"
                                            step="any"
                                        />
                                    </div>
                                    <div className="nutrition-field">
                                        <label>🌾 {isArabic ? 'كربوهيدرات' : 'Carbs'}</label>
                                        <input
                                            type="number"
                                            name="carbs"
                                            value={item.carbs}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="form-input"
                                            placeholder="g"
                                            step="any"
                                        />
                                    </div>
                                    <div className="nutrition-field">
                                        <label>🥑 {isArabic ? 'دهون' : 'Fats'}</label>
                                        <input
                                            type="number"
                                            name="fat"
                                            value={item.fat}
                                            onChange={(e) => handleItemChange(index, e)}
                                            className="form-input"
                                            placeholder="g"
                                            step="any"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button type="button" onClick={handleAddItem} className="add-ingredient-btn">
                        ➕ {isArabic ? 'أضف مكون' : 'Add Ingredient'}
                    </button>
                </div>

                {/* ✅ ملاحظات */}
                <div className="form-section">
                    <label className="section-label">
                        <span className="label-icon">📝</span>
                        {isArabic ? 'ملاحظات' : 'Notes'}
                        <span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span>
                    </label>
                    <textarea
                        name="notes"
                        value={mealData.notes}
                        onChange={handleMealChange}
                        className="form-textarea"
                        rows="3"
                        placeholder={isArabic ? 'أي ملاحظات إضافية عن الوجبة...' : 'Any additional notes about the meal...'}
                    />
                </div>

                {/* ✅ أزرار الإجراء */}
                <div className="form-actions">
                    <button type="button" onClick={clearForm} className="reset-btn">
                        🔄 {isArabic ? 'مسح' : 'Reset'}
                    </button>
                    <button type="submit" disabled={isLoading} className="submit-btn">
                        {isLoading ? (
                            <><span className="btn-spinner"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</>
                        ) : (
                            <>{editingMeal ? (isArabic ? '💾 تحديث' : '💾 Update') : (isArabic ? '💾 حفظ' : '💾 Save')}</>
                        )}
                    </button>
                </div>
            </form>

            {/* ✅ الوجبات المسجلة */}
            <div className="meals-history">
                <div className="history-header">
                    <h3>
                        <span className="header-icon">📋</span>
                        {isArabic ? 'الوجبات المسجلة' : 'Recorded Meals'}
                    </h3>
                    <button onClick={fetchMeals} className="refresh-history-btn" disabled={loadingMeals}>
                        {loadingMeals ? '⏳' : '🔄'}
                    </button>
                </div>
                
                {loadingMeals ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                    </div>
                ) : meals.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🍽️</div>
                        <p>{isArabic ? 'لا توجد وجبات مسجلة بعد' : 'No meals recorded yet'}</p>
                        <p className="empty-hint">{isArabic ? 'أضف وجبتك الأولى من النموذج أعلاه' : 'Add your first meal from the form above'}</p>
                    </div>
                ) : (
                    <div className="meals-list">
                        {meals.slice(0, 10).map(meal => {
                            const mealType = getMealTypeChoices(isArabic).find(m => m.value === meal.meal_type);
                            const totalProtein = meal.ingredients?.reduce((sum, i) => sum + (i.protein || 0), 0) || 0;
                            const totalCarbs = meal.ingredients?.reduce((sum, i) => sum + (i.carbs || 0), 0) || 0;
                            const totalFat = meal.ingredients?.reduce((sum, i) => sum + (i.fat || 0), 0) || 0;
                            
                            return (
                                <div key={meal.id} className="meal-history-item">
                                    <div className="meal-item-header">
                                        <div className="meal-type-badge" style={{ background: mealType?.bg, color: mealType?.color }}>
                                            {mealType?.label}
                                        </div>
                                        <div className="meal-item-actions">
                                            <button onClick={() => handleEditMeal(meal)} className="edit-meal-btn" title={isArabic ? 'تعديل' : 'Edit'}>
                                                ✏️
                                            </button>
                                            <button onClick={() => handleDeleteMeal(meal.id)} className="delete-meal-btn" title={isArabic ? 'حذف' : 'Delete'}>
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="meal-item-date">{formatMealDate(meal.meal_time)}</div>
                                    
                                    <div className="meal-item-nutrition">
                                        <span className="nutrition-badge calories">🔥 {meal.total_calories} {isArabic ? 'سعرة' : 'cal'}</span>
                                        {totalProtein > 0 && <span className="nutrition-badge protein">💪 {totalProtein}g</span>}
                                        {totalCarbs > 0 && <span className="nutrition-badge carbs">🌾 {totalCarbs}g</span>}
                                        {totalFat > 0 && <span className="nutrition-badge fats">🥑 {totalFat}g</span>}
                                    </div>
                                    
                                    {meal.ingredients && meal.ingredients.length > 0 && (
                                        <div className="meal-item-ingredients">
                                            {meal.ingredients.slice(0, 3).map((ing, idx) => (
                                                <span key={idx} className="ingredient-tag">
                                                    {ing.name} ({ing.quantity}{ing.unit || 'g'})
                                                </span>
                                            ))}
                                            {meal.ingredients.length > 3 && (
                                                <span className="ingredient-more">+{meal.ingredients.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                    
                                    {meal.notes && (
                                        <div className="meal-item-notes">💬 {meal.notes}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ✅ رسائل الإشعارات */}
            {message && (
                <div className={`notification-toast ${messageType}`}>
                    <span className="toast-icon">
                        {messageType === 'success' && '✅'}
                        {messageType === 'error' && '❌'}
                        {messageType === 'info' && 'ℹ️'}
                    </span>
                    <span className="toast-message">{message}</span>
                    <button className="toast-close" onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                .nutrition-form-container {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                /* ===== رأس النموذج ===== */
                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                }

                .form-header h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }

                .header-icon {
                    font-size: 1.5rem;
                }

                .header-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .scan-btn {
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .scan-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .cancel-edit-btn {
                    padding: 0.5rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 10px;
                    color: #ef4444;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .cancel-edit-btn:hover {
                    background: #ef4444;
                    color: white;
                }

                /* ===== ملخص التغذية ===== */
                .nutrition-summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .summary-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border: 1px solid var(--border-light);
                }

                .summary-card.calories .summary-value { color: #f59e0b; }
                .summary-card.protein .summary-value { color: #10b981; }
                .summary-card.carbs .summary-value { color: #3b82f6; }
                .summary-card.fats .summary-value { color: #ef4444; }

                .summary-icon {
                    font-size: 1.5rem;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--hover-bg);
                    border-radius: 12px;
                }

                .summary-info {
                    flex: 1;
                }

                .summary-value {
                    font-size: 1.3rem;
                    font-weight: bold;
                    line-height: 1.2;
                }

                .summary-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                /* ===== النموذج ===== */
                .nutrition-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .form-section {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                }

                .section-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                }

                .label-icon {
                    font-size: 1rem;
                }

                .optional {
                    font-weight: normal;
                    color: var(--text-tertiary);
                    font-size: 0.7rem;
                }

                .meal-type-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .meal-type-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 0.85rem;
                    border: 1px solid;
                }

                .meal-type-btn.active {
                    transform: scale(1.02);
                }

                .form-input,
                .form-select,
                .form-textarea {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .form-input:focus,
                .form-select:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .form-textarea {
                    resize: vertical;
                    font-family: inherit;
                }

                /* ===== المكونات ===== */
                .ingredients-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .ingredient-card {
                    background: var(--card-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                }

                .ingredient-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .ingredient-number {
                    width: 30px;
                    height: 30px;
                    background: var(--primary);
                    color: white;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }

                .remove-ingredient-btn {
                    background: none;
                    border: none;
                    font-size: 1.1rem;
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity var(--transition-fast);
                }

                .remove-ingredient-btn:hover {
                    opacity: 1;
                }

                .ingredient-field {
                    margin-bottom: 1rem;
                }

                .ingredient-field label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }

                .ingredient-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .ingredient-field.half {
                    margin-bottom: 0;
                }

                .nutrition-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                }

                .nutrition-field label {
                    display: block;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }

                .search-container {
                    position: relative;
                }

                .search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--card-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 100;
                    box-shadow: var(--shadow-lg);
                }

                .search-result-item {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    transition: background var(--transition-fast);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .search-result-item:hover {
                    background: var(--hover-bg);
                }

                .result-name {
                    color: var(--text-primary);
                }

                .result-calories {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .searching-indicator {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                [dir="rtl"] .searching-indicator {
                    right: auto;
                    left: 12px;
                }

                .add-ingredient-btn {
                    width: 100%;
                    padding: 0.75rem;
                    background: var(--secondary-bg);
                    border: 2px dashed var(--border-light);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .add-ingredient-btn:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }

                /* ===== أزرار الإجراء ===== */
                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .reset-btn {
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    font-weight: 500;
                }

                .reset-btn:hover {
                    background: var(--hover-bg);
                }

                .submit-btn {
                    flex: 2;
                    padding: 0.75rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                /* ===== الوجبات المسجلة ===== */
                .meals-history {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-light);
                }

                .history-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .history-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1rem;
                }

                .refresh-history-btn {
                    background: none;
                    border: none;
                    font-size: 1.1rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 8px;
                    transition: all var(--transition-fast);
                }

                .refresh-history-btn:hover:not(:disabled) {
                    background: var(--hover-bg);
                    transform: rotate(180deg);
                }

                .meals-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    max-height: 500px;
                    overflow-y: auto;
                }

                .meal-history-item {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                }

                .meal-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .meal-type-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .meal-item-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .edit-meal-btn,
                .delete-meal-btn {
                    background: none;
                    border: none;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 6px;
                    transition: all var(--transition-fast);
                }

                .edit-meal-btn:hover {
                    background: rgba(59, 130, 246, 0.1);
                }

                .delete-meal-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .meal-item-date {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }

                .meal-item-nutrition {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .nutrition-badge {
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                }

                .nutrition-badge.calories {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }

                .nutrition-badge.protein {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }

                .nutrition-badge.carbs {
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
                }

                .nutrition-badge.fats {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }

                .meal-item-ingredients {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .ingredient-tag {
                    background: var(--tertiary-bg);
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .ingredient-more {
                    background: var(--tertiary-bg);
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .meal-item-notes {
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-light);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
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
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 1rem;
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 0.5rem;
                    opacity: 0.5;
                }

                .empty-hint {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-top: 0.5rem;
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
                    animation: fadeIn 0.3s ease;
                }

                .scanner-modal-content {
                    background: var(--card-bg);
                    border-radius: 24px;
                    width: 90%;
                    max-width: 500px;
                    padding: 1rem;
                }

                .scanner-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-light);
                }

                .scanner-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                }

                .scanner-footer {
                    margin-top: 1rem;
                    text-align: center;
                }

                .scanner-footer p {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .cancel-btn {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    cursor: pointer;
                }

                /* ===== إشعار ===== */
                .notification-toast {
                    position: fixed;
                    bottom: 1.5rem;
                    right: 1.5rem;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                    box-shadow: var(--shadow-lg);
                }

                [dir="rtl"] .notification-toast {
                    right: auto;
                    left: 1.5rem;
                }

                .notification-toast.success {
                    background: #10b981;
                    color: white;
                }

                .notification-toast.error {
                    background: #ef4444;
                    color: white;
                }

                .notification-toast.info {
                    background: #3b82f6;
                    color: white;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                [dir="rtl"] @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                /* ===== استجابة الشاشات ===== */
                @media (max-width: 1024px) {
                    .nutrition-summary {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .nutrition-form-container {
                        padding: 1rem;
                    }

                    .form-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-actions {
                        width: 100%;
                    }

                    .scan-btn,
                    .cancel-edit-btn {
                        flex: 1;
                        justify-content: center;
                    }

                    .nutrition-summary {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }

                    .summary-card {
                        padding: 0.75rem;
                    }

                    .summary-icon {
                        width: 35px;
                        height: 35px;
                        font-size: 1.2rem;
                    }

                    .summary-value {
                        font-size: 1.1rem;
                    }

                    .ingredient-row {
                        grid-template-columns: 1fr;
                        gap: 0.75rem;
                    }

                    .nutrition-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .meal-type-buttons {
                        justify-content: center;
                    }

                    .meal-type-btn {
                        flex: 1;
                        text-align: center;
                    }

                    .meals-list {
                        max-height: 400px;
                    }

                    .notification-toast {
                        left: 1rem;
                        right: 1rem;
                        bottom: 1rem;
                    }

                    [dir="rtl"] .notification-toast {
                        left: 1rem;
                        right: 1rem;
                    }
                }

                @media (max-width: 480px) {
                    .nutrition-summary {
                        grid-template-columns: 1fr;
                    }

                    .meal-item-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }

                    .meal-item-actions {
                        width: 100%;
                        justify-content: flex-end;
                    }
                }

                /* ===== RTL دعم ===== */
                [dir="rtl"] .summary-card {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .ingredient-header {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .meal-item-header {
                    flex-direction: row-reverse;
                }

                @media (max-width: 480px) {
                    [dir="rtl"] .meal-item-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    [dir="rtl"] .meal-item-actions {
                        justify-content: flex-start;
                    }
                }

                /* ===== دعم الحركة المخفضة ===== */
                @media (prefers-reduced-motion: reduce) {
                    .spinner,
                    .spinner-small,
                    .btn-spinner {
                        animation: none;
                    }

                    .scanner-modal,
                    .notification-toast {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default NutritionForm;