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
            // ✅ استخدام API البحث الصحيح من Open Food Facts
            const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,generic_name,brands,nutriments,image_front_small_url,serving_size`;
            
            console.log('🔍 Searching URL:', searchUrl);
            
            const response = await axios.get(searchUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'LivocareApp/1.0 (https://livocare.onrender.com)'
                }
            });
            
            console.log('📡 Open Food Facts response:', response.data);
            
            if (response.data && response.data.products && response.data.products.length > 0) {
                const products = response.data.products
                    .filter(product => product.product_name || product.generic_name)
                    .map(product => {
                        const nutriments = product.nutriments || {};
                        return {
                            id: product.code,
                            name: product.product_name || product.generic_name || 'منتج غذائي',
                            calories: nutriments['energy-kcal'] || nutriments['energy'] || 0,
                            protein: nutriments['proteins'] || nutriments['protein'] || 0,
                            carbs: nutriments['carbohydrates'] || nutriments['carbs'] || 0,
                            fat: nutriments['fat'] || 0,
                            fiber: nutriments['fiber'] || 0,
                            image: product.image_front_small_url || null,
                            serving_size: product.serving_size || '100g',
                            brand: product.brands || null
                        };
                    });
                
                console.log(`✅ Found ${products.length} products`);
                setResults(products);
                
                if (products.length === 0) {
                    setError(t('foodSearch.noResults'));
                }
            } else {
                setResults([]);
                setError(t('foodSearch.noResults'));
            }
        } catch (err) {
            console.error('Food search error:', err);
            setError(t('foodSearch.searchError'));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const formatNumber = (value) => {
        if (value === undefined || value === null) return '';
        const num = Number(value);
        if (isNaN(num) || num === 0) return '';
        return Math.round(num * 10) / 10;
    };

    return (
        <div className="food-search">
            <div className="search-header">
                <h3>🔍 {t('foodSearch.title', 'بحث عن طعام')}</h3>
                <p className="search-subtitle">{t('foodSearch.subtitle', 'ابحث عن الأطعمة والمكونات الغذائية')}</p>
            </div>
            
            <div className="search-box">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('foodSearch.placeholder', 'مثال: تفاح، دجاج، أرز، زبادي...')}
                    className="search-input"
                />
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="search-btn"
                >
                    {loading ? '⏳' : '🔍'}
                </button>
            </div>

            {loading && (
                <div className="search-loading">
                    <div className="spinner-small"></div>
                    <p>{t('foodSearch.searching', 'جاري البحث...')}</p>
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
                    <p>{t('foodSearch.noResults', 'لم يتم العثور على نتائج')}</p>
                    <p className="no-results-hint">
                        💡 {t('foodSearch.hint', 'جرب: تفاح، دجاج، أرز، خبز، زبادي')}
                    </p>
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
                    <div className="results-header">
                        <span>📋 {t('foodSearch.results', 'نتائج البحث')} ({results.length})</span>
                    </div>
                    {results.map((food, index) => (
                        <div 
                            key={food.id || index} 
                            className="food-card"
                            onClick={() => onSelectFood && onSelectFood(food)}
                        >
                            {food.image && (
                                <img src={food.image} alt={food.name} className="food-image" />
                            )}
                            <div className="food-info">
                                <h4>{food.name}</h4>
                                {food.brand && <p className="food-brand">🏭 {food.brand}</p>}
                                <div className="food-nutrients">
                                    {formatNumber(food.calories) > 0 && (
                                        <span className="nutrient calories">
                                            🔥 {formatNumber(food.calories)} {t('foodSearch.calories', 'سعرة')}
                                        </span>
                                    )}
                                    {formatNumber(food.protein) > 0 && (
                                        <span className="nutrient protein">
                                            💪 {formatNumber(food.protein)}g {t('foodSearch.protein', 'بروتين')}
                                        </span>
                                    )}
                                    {formatNumber(food.carbs) > 0 && (
                                        <span className="nutrient carbs">
                                            🌾 {formatNumber(food.carbs)}g {t('foodSearch.carbs', 'كارب')}
                                        </span>
                                    )}
                                    {formatNumber(food.fat) > 0 && (
                                        <span className="nutrient fat">
                                            🫒 {formatNumber(food.fat)}g {t('foodSearch.fat', 'دهون')}
                                        </span>
                                    )}
                                </div>
                                {food.fiber > 0 && (
                                    <div className="food-fiber">
                                        🌿 {t('foodSearch.fiber', 'ألياف')}: {formatNumber(food.fiber)}g
                                    </div>
                                )}
                                {food.serving_size && (
                                    <div className="food-serving">
                                        📦 {t('foodSearch.servingSize', 'الحصة')}: {food.serving_size}
                                    </div>
                                )}
                                <div className="select-hint">
                                    ✨ {t('foodSearch.clickToSelect', 'انقر للإضافة')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FoodSearch;