// src/components/nutrition/NutritionForm.jsx - النسخة المعدلة والمرتبة
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
    // ✅ ==================== 1. حالات اللغة ====================
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // ✅ ==================== 2. المراجع (Refs) ====================
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const searchTimeoutRef = useRef(null);
    
    // ✅ ==================== 3. حالات العرض العامة ====================
    const [showScanner, setShowScanner] = useState(false);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [meals, setMeals] = useState([]);
    const [loadingMeals, setLoadingMeals] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // ✅ ==================== 4. حالات النموذج ====================
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
    
    // ✅ ==================== 5. دوال مساعدة ====================
    const showMessage = useCallback((msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 4000);
    }, []);
    
    const checkAuth = useCallback(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
            return false;
        }
        return true;
    }, [isArabic, showMessage]);
    
// ✅ دالة مسح النموذج - نسخة مصححة
const clearForm = useCallback(() => {
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
}, []);
    
    // ✅ ==================== 6. دوال جلب البيانات ====================
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
    }, [isAuthReady, isArabic, checkAuth, showMessage]);
    
    // ✅ ==================== 7. دوال البحث عن الطعام ====================
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
    const calculateNutrition = useCallback((food, quantity) => {
        const qty = parseFloat(quantity) || 100;
        const ratio = qty / 100;
        return {
            calories: Math.round((food.calories || 0) * ratio),
            protein: Math.round(((food.protein || 0) * ratio) * 10) / 10,
            carbs: Math.round(((food.carbs || 0) * ratio) * 10) / 10,
            fat: Math.round(((food.fat || 0) * ratio) * 10) / 10
        };
    }, []);
    
    // ✅ ==================== 8. دوال معالجة المكونات ====================
    const handleItemChange = useCallback((index, e) => {
        const { name, value } = e.target;
        const newItems = [...foodItems];
        newItems[index][name] = value;
        
        if (name === 'name' && value.length >= 2) {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            const timeout = setTimeout(() => searchFood(value, index), 500);
            searchTimeoutRef.current = timeout;
        } else if (name === 'name' && value.length === 0) {
            newItems[index].searchResults = [];
            newItems[index].showResults = false;
            newItems[index].selectedFood = null;
        }
        
        if (name === 'protein' || name === 'carbs' || name === 'fat' || name === 'calories') {
            newItems[index].manualEdit = true;
        }
        
        setFoodItems(newItems);
    }, [foodItems, searchFood]);
    
    const handleSelectFood = useCallback((index, food) => {
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
    }, [foodItems, calculateNutrition]);
    
    const handleQuantityChange = useCallback((index, e) => {
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
    }, [foodItems, calculateNutrition]);
    
    const handleAddItem = useCallback(() => {
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
    }, []);
    
    const handleRemoveItem = useCallback((index) => {
        if (foodItems.length === 1) {
            showMessage(isArabic ? '⚠️ يجب وجود مكون واحد على الأقل' : '⚠️ At least one ingredient is required', 'error');
            return;
        }
        setFoodItems(prev => prev.filter((_, i) => i !== index));
    }, [foodItems.length, isArabic, showMessage]);
    
    // ✅ ملخص التغذية
    const nutritionSummary = React.useMemo(() => {
        return foodItems.reduce((acc, item) => ({
            totalCalories: acc.totalCalories + (parseFloat(item.calories) || 0),
            totalProtein: acc.totalProtein + (parseFloat(item.protein) || 0),
            totalCarbs: acc.totalCarbs + (parseFloat(item.carbs) || 0),
            totalFat: acc.totalFat + (parseFloat(item.fat) || 0)
        }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    }, [foodItems]);
    
 const handleSubmit = useCallback(async (e) => {
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
    
    // ✅ تأكد من أن ingredients بالشكل الصحيح
    const ingredients = validItems.map(item => ({
        name: String(item.name).trim(),
        quantity: Number(parseFloat(item.quantity)) || 100,
        unit: item.unit || 'g',
        calories: Number(parseFloat(item.calories)) || 0,
        protein: Number(parseFloat(item.protein)) || 0,
        carbs: Number(parseFloat(item.carbs)) || 0,
        fat: Number(parseFloat(item.fat)) || 0
    }));
    
    const totalCalories = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
    const totalProtein = ingredients.reduce((sum, ing) => sum + ing.protein, 0);
    const totalCarbs = ingredients.reduce((sum, ing) => sum + ing.carbs, 0);
    const totalFat = ingredients.reduce((sum, ing) => sum + ing.fat, 0);
    
    const submitData = {
        meal_type: mealData.meal_type,
        meal_time: mealData.meal_time,
        notes: mealData.notes || '',
        ingredients: ingredients,  // ✅ مصفوفة من الكائنات
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat
    };
    
    // ✅ طباعة البيانات للتصحيح
    console.log('📤 Sending meal data:', JSON.stringify(submitData, null, 2));
    
    try {
        const response = await axiosInstance.post('/meals/', submitData);
        console.log('✅ Response:', response.data);
        showMessage(isArabic ? '✅ تم إضافة الوجبة بنجاح' : '✅ Meal added successfully', 'success');
        await fetchMeals();
        clearForm();
        if (onDataSubmitted) onDataSubmitted();
    } catch (error) {
        console.error('❌ Submission error:', error);
        console.error('❌ Response data:', error.response?.data);
        console.error('❌ Response status:', error.response?.status);
        
        // عرض تفاصيل الخطأ
        let errorMsg = isArabic ? '❌ فشل حفظ الوجبة' : '❌ Failed to save meal';
        if (error.response?.data) {
            const errData = error.response.data;
            if (typeof errData === 'object') {
                const firstError = Object.values(errData)[0];
                if (firstError) {
                    errorMsg += `: ${Array.isArray(firstError) ? firstError[0] : firstError}`;
                }
            }
        }
        showMessage(errorMsg, 'error');
    } finally {
        setIsLoading(false);
    }
}, [isAuthReady, isArabic, foodItems, mealData, fetchMeals, clearForm, onDataSubmitted, showMessage]);
    // ✅ دالة تحديث الوجبة - نسخة مصححة
const handleUpdateMeal = useCallback(async (e) => {
    e.preventDefault();
    
    // التحقق من وجود وجبة جاري تعديلها
    if (!editingMeal) {
        showMessage(isArabic ? '⚠️ لا توجد وجبة جاري تعديلها' : '⚠️ No meal is being edited', 'error');
        return;
    }
    
    if (!isAuthReady) {
        showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
        return;
    }
    
    setIsLoading(true);
    
    // التحقق من وجود مكونات صالحة
    const validItems = foodItems.filter(item => item.name && item.name.trim() !== '');
    
    if (validItems.length === 0) {
        showMessage(isArabic ? '⚠️ أضف مكون واحد على الأقل' : '⚠️ Add at least one ingredient', 'error');
        setIsLoading(false);
        return;
    }
    
    // تجهيز المكونات
    const ingredients = validItems.map(item => ({
        name: item.name.trim(),
        quantity: parseFloat(item.quantity) || 100,
        unit: item.unit || 'g',
        calories: parseFloat(item.calories) || 0,
        protein: parseFloat(item.protein) || 0,
        carbs: parseFloat(item.carbs) || 0,
        fat: parseFloat(item.fat) || 0,
        barcode: item.barcode || null
    }));
    
    // حساب الإجماليات
    const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
    const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
    const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    
    // تجهيز بيانات التحديث
    const updateData = {
        meal_type: mealData.meal_type,
        meal_time: mealData.meal_time,
        notes: mealData.notes || '',
        ingredients: ingredients,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat
    };
    
    console.log('📤 Updating meal:', editingMeal.id, updateData);
    
    try {
        // إرسال طلب التحديث
        const response = await axiosInstance.put(`/meals/${editingMeal.id}/`, updateData);
        
        console.log('✅ Update response:', response.data);
        showMessage(isArabic ? '✅ تم تحديث الوجبة بنجاح' : '✅ Meal updated successfully', 'success');
        
        // إعادة تعيين النموذج وإخفاء نموذج التعديل
        setShowEditForm(false);
        setEditingMeal(null);
        clearForm();
        
        // تحديث قائمة الوجبات
        await fetchMeals();
        setRefreshAnalytics(prev => prev + 1);
        
        // إعلام المكون الأب بتحديث البيانات
        if (onDataSubmitted) onDataSubmitted();
        
    } catch (error) {
        console.error('❌ Update error:', error);
        console.error('❌ Response data:', error.response?.data);
        
        let errorMsg = isArabic ? '❌ فشل تحديث الوجبة' : '❌ Failed to update meal';
        if (error.response?.data) {
            const errData = error.response.data;
            if (typeof errData === 'object') {
                const firstError = Object.values(errData)[0];
                if (firstError) {
                    errorMsg += `: ${Array.isArray(firstError) ? firstError[0] : firstError}`;
                }
            }
        }
        showMessage(errorMsg, 'error');
    } finally {
        setIsLoading(false);
    }
}, [editingMeal, isAuthReady, isArabic, foodItems, mealData, fetchMeals, clearForm, onDataSubmitted, showMessage]);
    // ✅ ==================== 10. دوال أخرى ====================
    const handleMealChange = useCallback((e) => {
        const { name, value } = e.target;
        setMealData(prev => ({ ...prev, [name]: value }));
    }, []);
    
    const handleDeleteMeal = useCallback(async (mealId) => {
        if (!window.confirm(isArabic ? '⚠️ هل أنت متأكد من حذف هذه الوجبة؟' : '⚠️ Are you sure you want to delete this meal?')) return;
        
        try {
            await axiosInstance.delete(`/meals/${mealId}/`);
            setMeals(prev => prev.filter(meal => meal.id !== mealId));
            showMessage(isArabic ? '✅ تم حذف الوجبة بنجاح' : '✅ Meal deleted successfully', 'success');
            setRefreshAnalytics(prev => prev + 1);
        } catch (error) {
            console.error('Error deleting meal:', error);
            showMessage(isArabic ? '❌ خطأ في حذف الوجبة' : '❌ Error deleting meal', 'error');
        }
    }, [isArabic, showMessage]);
    
    // ✅ دالة تعديل الوجبة - نسخة مصححة
const handleEditMeal = useCallback((meal) => {
    console.log('✏️ Editing meal:', meal);
    
    // تعيين الوجبة التي يتم تعديلها
    setEditingMeal(meal);
    
    // تعبئة بيانات الوجبة في النموذج
    setMealData({
        meal_type: meal.meal_type || 'Breakfast',
        meal_time: meal.meal_time ? meal.meal_time.slice(0, 16) : new Date().toISOString().slice(0, 16),
        notes: meal.notes || ''
    });
    
    // تعبئة المكونات
    if (meal.ingredients && meal.ingredients.length > 0) {
        const items = meal.ingredients.map(item => ({
            name: item.name || '',
            quantity: item.quantity?.toString() || '100',
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
        }));
        setFoodItems(items);
    } else {
        // إذا لم توجد مكونات، استخدم مكوناً افتراضياً واحداً
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
    
    // إظهار نموذج التعديل والتمرير للأعلى
    setShowEditForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}, []);
    
    // ✅ معالجة الباركود
    const handleBarcodeScanned = useCallback(async (result) => {
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
                addNewProductFromBarcode(barcode, isArabic);
            }
        } catch (error) {
            console.error('❌ Error in barcode search:', error);
            addNewProductFromBarcode(barcode, isArabic);
        } finally {
            setIsLoading(false);
        }
    }, [isArabic, showMessage]);
    
    const addNewProductFromBarcode = useCallback((barcode, isArabic) => {
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
    }, []);
    
    const formatMealDate = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
    }, [isArabic]);
    
    // ✅ ==================== 11. التأثيرات (Effects) ====================
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);
    
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);
    
    useEffect(() => {
        if (isAuthReady) {
            fetchMeals();
        }
    }, [isAuthReady, fetchMeals]);
    
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);
    
    // ✅ ==================== 12. التصيير (Render) ====================
    return (
        <div className="nutrition-form-container">
            {/* ماسح الباركود */}
            {showScanner && (
                <div className="scanner-modal" onClick={() => setShowScanner(false)}>
                    <div className="scanner-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="scanner-header">
                            <h3>📷 {isArabic ? 'مسح الباركود' : 'Scan Barcode'}</h3>
                            <button className="close-btn" onClick={() => setShowScanner(false)}>✕</button>
                        </div>
                        <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setShowScanner(false)} />
                        <div className="scanner-footer">
                            <p>📱 {isArabic ? 'ضع رمز المنتج داخل الإطار للمسح' : 'Place the barcode inside the frame to scan'}</p>
                            <button className="cancel-btn" onClick={() => setShowScanner(false)}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* رأس النموذج */}
            <div className="form-header">
                <h2>
                    <span className="header-icon">🍽️</span>
                    {editingMeal ? (isArabic ? 'تعديل وجبة' : 'Edit Meal') : (isArabic ? 'إضافة وجبة' : 'Add Meal')}
                </h2>
                <div className="header-actions">
                    <button type="button" onClick={() => setShowScanner(true)} className="scan-btn" disabled={isLoading}>
                        📷 {!isMobile && (isArabic ? 'مسح باركود' : 'Scan Barcode')}
                    </button>
                    {showEditForm && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                setShowEditForm(false); 
                                setEditingMeal(null); 
                                clearForm(); 
                                showMessage(isArabic ? 'تم إلغاء التعديل' : 'Edit cancelled', 'info');
                            }} 
                            className="cancel-edit-btn"
                        >
                            ✖ {isArabic ? 'إلغاء التعديل' : 'Cancel Edit'}
                        </button>
                    )}
                </div>
            </div>

            {/* ملخص التغذية */}
            <div className="nutrition-summary">
                <div className="summary-card calories"><span className="summary-icon">🔥</span><div className="summary-info"><div className="summary-value">{nutritionSummary.totalCalories}</div><div className="summary-label">{isArabic ? 'سعرات' : 'Calories'}</div></div></div>
                <div className="summary-card protein"><span className="summary-icon">💪</span><div className="summary-info"><div className="summary-value">{nutritionSummary.totalProtein}g</div><div className="summary-label">{isArabic ? 'بروتين' : 'Protein'}</div></div></div>
                <div className="summary-card carbs"><span className="summary-icon">🌾</span><div className="summary-info"><div className="summary-value">{nutritionSummary.totalCarbs}g</div><div className="summary-label">{isArabic ? 'كربوهيدرات' : 'Carbs'}</div></div></div>
                <div className="summary-card fats"><span className="summary-icon">🥑</span><div className="summary-info"><div className="summary-value">{nutritionSummary.totalFat}g</div><div className="summary-label">{isArabic ? 'دهون' : 'Fats'}</div></div></div>
            </div>

            <form onSubmit={editingMeal ? handleUpdateMeal : handleSubmit} className="nutrition-form">
                {/* نوع الوجبة */}
                <div className="form-section">
                    <label className="section-label"><span className="label-icon">🍽️</span>{isArabic ? 'نوع الوجبة' : 'Meal Type'}</label>
                    <div className="meal-type-buttons">
                        {getMealTypeChoices(isArabic).map(meal => (
                            <button key={meal.value} type="button" className={`meal-type-btn ${mealData.meal_type === meal.value ? 'active' : ''}`} onClick={() => setMealData(prev => ({ ...prev, meal_type: meal.value }))} style={{ background: mealData.meal_type === meal.value ? meal.color : 'var(--secondary-bg)', color: mealData.meal_type === meal.value ? 'white' : meal.color, borderColor: meal.color }}>{meal.label}</button>
                        ))}
                    </div>
                </div>

                {/* وقت الوجبة */}
                <div className="form-section">
                    <label className="section-label"><span className="label-icon">⏰</span>{isArabic ? 'وقت الوجبة' : 'Meal Time'}</label>
                    <input type="datetime-local" name="meal_time" value={mealData.meal_time} onChange={handleMealChange} className="form-input" />
                </div>

                {/* المكونات */}
                <div className="form-section">
                    <label className="section-label"><span className="label-icon">🥘</span>{isArabic ? 'المكونات' : 'Ingredients'}</label>
                    <div className="ingredients-list">
                        {foodItems.map((item, index) => (
                            <div key={index} className="ingredient-card">
                                <div className="ingredient-header"><span className="ingredient-number">{index + 1}</span>{foodItems.length > 1 && <button type="button" onClick={() => handleRemoveItem(index)} className="remove-ingredient-btn" title={isArabic ? 'حذف' : 'Remove'}>🗑️</button>}</div>
                                <div className="ingredient-field"><label>{isArabic ? 'اسم الطعام' : 'Food Name'}</label>
                                    <div className="search-container">
                                        <input type="text" name="name" value={item.name} onChange={(e) => handleItemChange(index, e)} className="form-input" placeholder={isArabic ? 'أدخل اسم الطعام...' : 'Enter food name...'} />
                                        {item.isSearching && <div className="searching-indicator"><div className="spinner-small"></div><span>{isArabic ? 'جاري البحث...' : 'Searching...'}</span></div>}
                                        {item.showResults && item.searchResults.length > 0 && (
                                            <div className="search-results">{item.searchResults.map((food, idx) => (<div key={idx} className="search-result-item" onClick={() => handleSelectFood(index, food)}><div className="result-name">{food.name}</div><div className="result-calories">🔥 {food.calories} kcal</div></div>))}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="ingredient-row"><div className="ingredient-field half"><label>{isArabic ? 'الكمية' : 'Quantity'}</label><input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(index, e)} className="form-input" step="any" min="0" /></div><div className="ingredient-field half"><label>{isArabic ? 'الوحدة' : 'Unit'}</label><select value={item.unit} onChange={(e) => { const newItems = [...foodItems]; newItems[index].unit = e.target.value; setFoodItems(newItems); }} className="form-select">{getUnitOptions(isArabic).map(unit => (<option key={unit.value} value={unit.value}>{unit.label} ({unit.symbol})</option>))}</select></div></div>
                                <div className="nutrition-grid"><div className="nutrition-field"><label>🔥 {isArabic ? 'سعرات' : 'Calories'}</label><input type="number" name="calories" value={item.calories} onChange={(e) => handleItemChange(index, e)} className="form-input" placeholder="kcal" step="any" /></div><div className="nutrition-field"><label>💪 {isArabic ? 'بروتين' : 'Protein'}</label><input type="number" name="protein" value={item.protein} onChange={(e) => handleItemChange(index, e)} className="form-input" placeholder="g" step="any" /></div><div className="nutrition-field"><label>🌾 {isArabic ? 'كربوهيدرات' : 'Carbs'}</label><input type="number" name="carbs" value={item.carbs} onChange={(e) => handleItemChange(index, e)} className="form-input" placeholder="g" step="any" /></div><div className="nutrition-field"><label>🥑 {isArabic ? 'دهون' : 'Fats'}</label><input type="number" name="fat" value={item.fat} onChange={(e) => handleItemChange(index, e)} className="form-input" placeholder="g" step="any" /></div></div>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddItem} className="add-ingredient-btn">➕ {isArabic ? 'أضف مكون' : 'Add Ingredient'}</button>
                </div>

                {/* ملاحظات */}
                <div className="form-section">
                    <label className="section-label"><span className="label-icon">📝</span>{isArabic ? 'ملاحظات' : 'Notes'}<span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span></label>
                    <textarea name="notes" value={mealData.notes} onChange={handleMealChange} className="form-textarea" rows="3" placeholder={isArabic ? 'أي ملاحظات إضافية عن الوجبة...' : 'Any additional notes about the meal...'} />
                </div>

                {/* أزرار الإجراء */}
                <div className="form-actions">
                    <button type="button" onClick={clearForm} className="reset-btn">🔄 {isArabic ? 'مسح' : 'Reset'}</button>
                    <button type="submit" disabled={isLoading} className="submit-btn">{isLoading ? (<><span className="btn-spinner"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</>) : (<>{editingMeal ? (isArabic ? '💾 تحديث' : '💾 Update') : (isArabic ? '💾 حفظ' : '💾 Save')}</>)}</button>
                </div>
            </form>

            {/* الوجبات المسجلة */}
            <div className="meals-history">
                <div className="history-header"><h3><span className="header-icon">📋</span>{isArabic ? 'الوجبات المسجلة' : 'Recorded Meals'}</h3><button onClick={fetchMeals} className="refresh-history-btn" disabled={loadingMeals}>{loadingMeals ? '⏳' : '🔄'}</button></div>
                {loadingMeals ? (<div className="loading-state"><div className="spinner"></div><p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p></div>) : meals.length === 0 ? (<div className="empty-state"><div className="empty-icon">🍽️</div><p>{isArabic ? 'لا توجد وجبات مسجلة بعد' : 'No meals recorded yet'}</p><p className="empty-hint">{isArabic ? 'أضف وجبتك الأولى من النموذج أعلاه' : 'Add your first meal from the form above'}</p></div>) : (
                    <div className="meals-list">
                        {meals.slice(0, 10).map(meal => {
                            const mealType = getMealTypeChoices(isArabic).find(m => m.value === meal.meal_type);
                            return (
                                <div key={meal.id} className="meal-history-item">
                                    <div className="meal-item-header"><div className="meal-type-badge" style={{ background: mealType?.bg, color: mealType?.color }}>{mealType?.label}</div><div className="meal-item-actions"><button onClick={() => handleEditMeal(meal)} className="edit-meal-btn" title={isArabic ? 'تعديل' : 'Edit'}>✏️</button><button onClick={() => handleDeleteMeal(meal.id)} className="delete-meal-btn" title={isArabic ? 'حذف' : 'Delete'}>🗑️</button></div></div>
                                    <div className="meal-item-date">{formatMealDate(meal.meal_time)}</div>
                                    <div className="meal-item-nutrition"><span className="nutrition-badge calories">🔥 {meal.total_calories || 0} {isArabic ? 'سعرة' : 'cal'}</span></div>
                                    {meal.ingredients && meal.ingredients.length > 0 && (<div className="meal-item-ingredients">{meal.ingredients.slice(0, 3).map((ing, idx) => (<span key={idx} className="ingredient-tag">{ing.name} ({ing.quantity}{ing.unit || 'g'})</span>))}{meal.ingredients.length > 3 && <span className="ingredient-more">+{meal.ingredients.length - 3}</span>}</div>)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* رسالة الإشعار */}
            {message && (
                <div className={`notification-toast ${messageType}`}>
                    <span className="toast-icon">{messageType === 'success' && '✅'}{messageType === 'error' && '❌'}{messageType === 'info' && 'ℹ️'}</span>
                    <span className="toast-message">{message}</span>
                    <button className="toast-close" onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
 /* ===========================================
   NutritionForm.css - الأنماط الداخلية فقط
   ✅ نموذج التغذية - ألوان طعام مميزة
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.nutrition-form-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
    transition: all 0.2s ease;
}

.nutrition-form-container.dark-mode {
    background: #1e293b;
    border-color: #334155;
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
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .form-header {
    border-bottom-color: #334155;
}

.form-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .form-header h2 {
    background: linear-gradient(135deg, #f87171, #fbbf24);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
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
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
}

.scan-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.cancel-edit-btn {
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 500;
}

.cancel-edit-btn:hover {
    background: #ef4444;
    color: white;
    border-color: transparent;
}

/* ===== ملخص التغذية ===== */
.nutrition-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.summary-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .summary-card {
    background: #0f172a;
    border-color: #334155;
}

.summary-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.dark-mode .summary-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.summary-card.calories .summary-value { color: #f59e0b; }
.summary-card.protein .summary-value { color: #10b981; }
.summary-card.carbs .summary-value { color: #3b82f6; }
.summary-card.fats .summary-value { color: #ef4444; }

.summary-icon {
    font-size: 1.5rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--hover-bg, #f1f5f9);
    border-radius: 16px;
}

.dark-mode .summary-icon {
    background: #1e293b;
}

.summary-info {
    flex: 1;
}

.summary-value {
    font-size: 1.4rem;
    font-weight: 800;
    line-height: 1.2;
}

.summary-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== النموذج ===== */
.nutrition-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .form-section {
    background: #0f172a;
    border-color: #334155;
}

.section-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .section-label {
    color: #f1f5f9;
}

.label-icon {
    font-size: 1rem;
}

.optional {
    font-weight: normal;
    color: var(--text-tertiary, #94a3b8);
    font-size: 0.7rem;
}

/* ===== أزرار نوع الوجبة ===== */
.meal-type-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.meal-type-btn {
    padding: 0.5rem 1rem;
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid;
    background: var(--card-bg, #ffffff);
}

.dark-mode .meal-type-btn {
    background: #1e293b;
}

.meal-type-btn.active {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ===== حقول الإدخال ===== */
.form-input,
.form-select,
.form-textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    color: var(--text-primary, #0f172a);
    font-size: 0.9rem;
    transition: all 0.2s;
}

.dark-mode .form-input,
.dark-mode .form-select,
.dark-mode .form-textarea {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
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
    background: var(--card-bg, #ffffff);
    border-radius: 18px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .ingredient-card {
    background: #1e293b;
    border-color: #475569;
}

.ingredient-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dark-mode .ingredient-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    color: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
}

.remove-ingredient-btn {
    background: none;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;
    padding: 0.25rem;
}

.remove-ingredient-btn:hover {
    opacity: 1;
    transform: scale(1.1);
}

.ingredient-field {
    margin-bottom: 1rem;
}

.ingredient-field label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-tertiary, #94a3b8);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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
    gap: 0.75rem;
}

.nutrition-field label {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-tertiary, #94a3b8);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* ===== البحث عن الطعام ===== */
.search-container {
    position: relative;
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.dark-mode .search-results {
    background: #1e293b;
    border-color: #475569;
}

.search-result-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.search-result-item:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .search-result-item:hover {
    background: #334155;
}

.result-name {
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .result-name {
    color: #f1f5f9;
}

.result-calories {
    font-size: 0.7rem;
    font-weight: 600;
    color: #f59e0b;
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
    color: var(--text-tertiary, #94a3b8);
}

[dir="rtl"] .searching-indicator {
    right: auto;
    left: 12px;
}

.spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-light, #e2e8f0);
    border-top-color: #f59e0b;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

/* ===== زر إضافة مكون ===== */
.add-ingredient-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--secondary-bg, #f8fafc);
    border: 2px dashed var(--border-light, #e2e8f0);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary, #64748b);
}

.dark-mode .add-ingredient-btn {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.add-ingredient-btn:hover {
    border-color: #f59e0b;
    color: #f59e0b;
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
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .reset-btn {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.reset-btn:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .reset-btn:hover {
    background: #334155;
}

.submit-btn {
    flex: 2;
    padding: 0.75rem;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    color: white;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 700;
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

/* ===== الوجبات المسجلة ===== */
.meals-history {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .meals-history {
    border-top-color: #334155;
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
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .history-header h3 {
    color: #f1f5f9;
}

.refresh-history-btn {
    background: none;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 8px;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.refresh-history-btn:hover:not(:disabled) {
    background: var(--hover-bg, #f1f5f9);
    transform: rotate(180deg);
}

.dark-mode .refresh-history-btn:hover:not(:disabled) {
    background: #334155;
    color: #f1f5f9;
}

.meals-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 500px;
    overflow-y: auto;
}

.meal-history-item {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 18px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .meal-history-item {
    background: #0f172a;
    border-color: #334155;
}

.meal-history-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dark-mode .meal-history-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.meal-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.meal-type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
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
    transition: all 0.2s;
    opacity: 0.6;
}

.edit-meal-btn:hover {
    opacity: 1;
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.1);
}

.delete-meal-btn:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.1);
    transform: scale(1.1);
}

.meal-item-date {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
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
    font-weight: 600;
}

.nutrition-badge.calories {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

.ingredient-tag {
    background: var(--tertiary-bg, #f1f5f9);
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .ingredient-tag {
    background: #1e293b;
    color: #94a3b8;
}

.ingredient-more {
    background: var(--tertiary-bg, #f1f5f9);
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
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
    border-top-color: #f59e0b;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
}

.empty-hint {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
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
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    width: 90%;
    max-width: 500px;
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

.scanner-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .scanner-header h3 {
    color: #f1f5f9;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--text-secondary, #64748b);
}

.scanner-footer {
    margin-top: 1rem;
    text-align: center;
}

.scanner-footer p {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.5rem;
}

.cancel-btn {
    padding: 0.5rem 1rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .cancel-btn {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.cancel-btn:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .cancel-btn:hover {
    background: #334155;
}

/* ===== إشعار ===== */
.notification-toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 1000;
    animation: slideIn 0.3s ease;
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

.toast-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
}

.toast-close:hover {
    opacity: 1;
}

/* ===== أنيميشن ===== */
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

/* ===== دعم RTL ===== */
[dir="rtl"] .summary-card {
    flex-direction: row-reverse;
}

[dir="rtl"] .ingredient-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .meal-item-header {
    flex-direction: row-reverse;
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
    
    .scan-btn:hover,
    .submit-btn:hover,
    .meal-history-item:hover,
    .summary-card:hover {
        transform: none;
    }
}
            `}</style>
        </div>
    );
}

export default NutritionForm;