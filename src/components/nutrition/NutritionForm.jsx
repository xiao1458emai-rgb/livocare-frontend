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
    
    // ✅ ==================== 9. دوال حفظ وتحديث الوجبة ====================
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
        
        const ingredients = validItems.map(item => ({
            name: item.name,
            quantity: parseFloat(item.quantity) || 100,
            unit: item.unit || 'g',
            calories: parseFloat(item.calories) || 0,
            protein: parseFloat(item.protein) || 0,
            carbs: parseFloat(item.carbs) || 0,
            fat: parseFloat(item.fat) || 0
        }));
        
        const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
        const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
        const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
        const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
        
        const submitData = {
            meal_type: mealData.meal_type,
            meal_time: mealData.meal_time,
            notes: mealData.notes || '',
            ingredients: ingredients,
            total_calories: totalCalories,
            total_protein: totalProtein,
            total_carbs: totalCarbs,
            total_fat: totalFat
        };
        
        try {
            await axiosInstance.post('/meals/', submitData);
            showMessage(isArabic ? '✅ تم إضافة الوجبة بنجاح' : '✅ Meal added successfully', 'success');
            await fetchMeals();
            clearForm();
            if (onDataSubmitted) onDataSubmitted();
        } catch (error) {
            console.error('Submission error:', error);
            showMessage(isArabic ? '❌ فشل حفظ الوجبة' : '❌ Failed to save meal', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthReady, isArabic, foodItems, mealData, fetchMeals, clearForm, onDataSubmitted, showMessage]);
    
    const handleUpdateMeal = useCallback(async (e) => {
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
                total_calories: totalCalories,
                total_protein: totalProtein,
                total_carbs: totalCarbs,
                total_fat: totalFat
            });
            
            showMessage(isArabic ? '✅ تم تحديث الوجبة بنجاح' : '✅ Meal updated successfully', 'success');
            setRefreshAnalytics(prev => prev + 1);
            setShowEditForm(false);
            setEditingMeal(null);
            clearForm();
            await fetchMeals();
        } catch (error) {
            console.error('Update error:', error);
            showMessage(isArabic ? '❌ فشل تحديث الوجبة' : '❌ Failed to update meal', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthReady, isArabic, editingMeal, foodItems, mealData, fetchMeals, clearForm, showMessage]);
    
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
    
    const handleEditMeal = useCallback((meal) => {
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
            clearForm();
        }
        setShowEditForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [clearForm]);
    
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
                        <button type="button" onClick={() => { setShowEditForm(false); setEditingMeal(null); clearForm(); }} className="cancel-edit-btn">
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
        </div>
    );
}

export default NutritionForm;