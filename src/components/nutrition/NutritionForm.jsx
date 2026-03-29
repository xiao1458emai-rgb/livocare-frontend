// src/components/nutrition/NutritionForm.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from "../../services/api"; // ✅ إزالة import axios (غير مستخدم)
import NutritionAnalytics from '../Analytics/NutritionAnalytics';
import BarcodeScanner from '../Camera/BarcodeScanner';
import '../../index.css';

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

    const fetchMeals = async () => {
        if (!isAuthReady) return;
        if (!checkAuth()) return;
        
        setLoadingMeals(true);
        try {
            const response = await axiosInstance.get('/meals/');
            setMeals(Array.isArray(response.data) ? response.data : []);
            setMessage('');
        } catch (error) {
            console.error('Error fetching meals:', error);
            setMessage(t('nutrition.errorLoading'));
            setMessageType('error');
            setMeals([]);
        } finally {
            setLoadingMeals(false);
        }
    };

    const handleDeleteMeal = async (mealId) => {
        if (!window.confirm(t('nutrition.deleteConfirm'))) return;
        
        try {
            await axiosInstance.delete(`/meals/${mealId}/`);
            setMeals(prev => prev.filter(meal => meal.id !== mealId));
            setMessage(t('nutrition.mealDeleted'));
            setMessageType('success');
            setRefreshAnalytics(prev => prev + 1);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error deleting meal:', error);
            setMessage(t('nutrition.deleteError'));
            setMessageType('error');
        }
    };

    const searchFood = async (query, index) => {
        if (!query || query.length < 2) return;

        const newItems = [...foodItems];
        newItems[index].isSearching = true;
        newItems[index].showResults = true;
        setFoodItems(newItems);

        try {
            // ✅ إزالة /api المكرر - استخدم المسار الصحيح
            const response = await axiosInstance.get(`/food/search/?query=${encodeURIComponent(query)}`);
            const results = response.data.data || response.data.results || [];
            
            const updatedItems = [...foodItems];
            updatedItems[index].searchResults = results;
            updatedItems[index].isSearching = false;
            setFoodItems(updatedItems);
        } catch (error) {
            console.error('Search error:', error);
            const updatedItems = [...foodItems];
            updatedItems[index].searchResults = [];
            updatedItems[index].isSearching = false;
            setFoodItems(updatedItems);
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
        console.log('📦 Barcode result:', result);
        const barcodeText = typeof result === 'object' ? result.data || result.text : result;
        
        setIsLoading(true);
        setMessage('');
        
        try {
            // ✅ استخدام axiosInstance بدلاً من axios
            const offResponse = await axiosInstance.get(`https://world.openfoodfacts.org/api/v0/product/${barcodeText}.json`);
            
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
                setMessage('⚠️ المنتج غير موجود، الرجاء إدخال البيانات يدوياً');
                setMessageType('info');
            }
        } catch (error) {
            console.error('Error in barcode search:', error);
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
            setMessage(t('nutrition.mealUpdated'));
            setMessageType('success');
            setRefreshAnalytics(prev => prev + 1);
            setShowEditForm(false);
            setEditingMeal(null);
            clearForm();
            await fetchMeals();
        } catch (error) {
            console.error('Update error:', error);
            setMessage(t('nutrition.updateFailed'));
            setMessageType('error');
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
            setMessage(t('nutrition.mealAdded'));
            setMessageType('success');
            setRefreshAnalytics(prev => prev + 1);
            await fetchMeals();
            clearForm();
            if (onDataSubmitted) onDataSubmitted();
        } catch (error) {
            console.error('Submission error:', error);
            setMessage(t('nutrition.failedToSave'));
            setMessageType('error');
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

    useEffect(() => {
        if (isAuthReady) fetchMeals();
    }, [isAuthReady]);

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

    return (
        <div className={`nutrition-form-container ${darkMode ? 'dark-mode' : ''}`}>
            {showScanner && (
                <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setShowScanner(false)} darkMode={darkMode} />
            )}

            {/* باقي الكود JSX كما هو - لم يتغير */}
            {/* ... (نفس الـ JSX الأصلي) ... */}
        
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