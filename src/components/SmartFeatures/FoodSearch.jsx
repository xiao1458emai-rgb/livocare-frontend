// src/components/SmartFeatures/FoodSearch.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './SmartFeatures.css';

const FoodSearch = ({ onSelectFood }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // ✅ الاتصال مباشرة بـ Open Food Facts API
            const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,generic_name,brands,nutriments,image_front_small_url,serving_size`;
            
            console.log('🔍 Searching:', searchUrl);
            
            const response = await axios.get(searchUrl, {
                timeout: 15000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'LivocareApp/1.0 (https://livocare.onrender.com)'
                }
            });
            
            console.log('📡 Response:', response.data);
            
            if (response.data && response.data.products && response.data.products.length > 0) {
                const products = response.data.products
                    .filter(product => {
                        const name = product.product_name || product.generic_name;
                        return name && name.length > 1;
                    })
                    .slice(0, 15)
                    .map(product => {
                        const nutriments = product.nutriments || {};
                        const name = product.product_name || product.generic_name || 'منتج غذائي';
                        
                        // استخراج القيم الغذائية
                        let calories = nutriments['energy-kcal'] || nutriments['energy'] || 0;
                        let protein = nutriments['proteins'] || nutriments['protein'] || 0;
                        let carbs = nutriments['carbohydrates'] || nutriments['carbs'] || 0;
                        let fat = nutriments['fat'] || 0;
                        let fiber = nutriments['fiber'] || 0;
                        
                        // تحويل إلى أرقام
                        calories = parseFloat(calories) || 0;
                        protein = parseFloat(protein) || 0;
                        carbs = parseFloat(carbs) || 0;
                        fat = parseFloat(fat) || 0;
                        fiber = parseFloat(fiber) || 0;
                        
                        return {
                            id: product.code,
                            name: name,
                            calories: Math.round(calories),
                            protein: Math.round(protein * 10) / 10,
                            carbs: Math.round(carbs * 10) / 10,
                            fat: Math.round(fat * 10) / 10,
                            fiber: Math.round(fiber * 10) / 10,
                            image: product.image_front_small_url || null,
                            brand: product.brands || null,
                            serving_size: product.serving_size || '100g'
                        };
                    });
                
                console.log(`✅ Found ${products.length} products`);
                setResults(products);
                
                if (products.length === 0) {
                    setError('لم يتم العثور على نتائج');
                }
            } else {
                setResults([]);
                setError('لم يتم العثور على نتائج');
            }
        } catch (err) {
            console.error('Food search error:', err);
            setError('حدث خطأ في البحث. تأكد من اتصالك بالإنترنت.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const formatNumber = (value) => {
        if (!value || value === 0) return '';
        return value;
    };

    return (
        <div className="food-search">
            <div className="search-header">
                <h3>🔍 بحث عن طعام</h3>
                <p className="search-subtitle">ابحث عن الأطعمة والمكونات الغذائية</p>
            </div>
            
            <div className="search-box">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="مثال: تفاح، دجاج، أرز أبيض، زبادي..."
                    className="search-input"
                />
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="search-btn"
                >
                    {loading ? '⏳' : '🔍 بحث'}
                </button>
            </div>

            {loading && (
                <div className="search-loading">
                    <div className="spinner-small"></div>
                    <p>جاري البحث...</p>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <span>❌</span> {error}
                    <button onClick={() => setError(null)} className="error-dismiss">✕</button>
                </div>
            )}

            {results.length === 0 && query && !loading && !error && (
                <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <p>لم يتم العثور على نتائج لـ "{query}"</p>
                    <p className="no-results-hint">
                        💡 جرب: تفاح، دجاج، أرز، خبز، زبادي، موز
                    </p>
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
                    <div className="results-header">
                        <span>📋 نتائج البحث ({results.length})</span>
                    </div>
                    <div className="results-grid">
                        {results.map((food, index) => (
                            <div 
                                key={food.id || index} 
                                className="food-card"
                                onClick={() => {
                                    console.log('✅ Selected:', food);
                                    if (onSelectFood) onSelectFood(food);
                                }}
                            >
                                {food.image && (
                                    <img src={food.image} alt={food.name} className="food-image" />
                                )}
                                <div className="food-info">
                                    <h4>{food.name}</h4>
                                    {food.brand && <p className="food-brand">🏭 {food.brand}</p>}
                                    <div className="food-nutrients">
                                        {formatNumber(food.calories) > 0 && (
                                            <span className="nutrient calories">🔥 {food.calories} سعرة</span>
                                        )}
                                        {formatNumber(food.protein) > 0 && (
                                            <span className="nutrient protein">💪 {food.protein}g بروتين</span>
                                        )}
                                        {formatNumber(food.carbs) > 0 && (
                                            <span className="nutrient carbs">🌾 {food.carbs}g كارب</span>
                                        )}
                                        {formatNumber(food.fat) > 0 && (
                                            <span className="nutrient fat">🫒 {food.fat}g دهون</span>
                                        )}
                                    </div>
                                    {food.fiber > 0 && (
                                        <div className="food-fiber">🌿 ألياف: {food.fiber}g</div>
                                    )}
                                    <div className="select-hint">✨ انقر للإضافة</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodSearch;