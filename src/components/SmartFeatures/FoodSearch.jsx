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
            // ✅ استخدام Open Food Facts API مباشرة
            const response = await axios.get(
                `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`,
                { timeout: 10000 }
            );
            
            console.log('🔍 Open Food Facts response:', response.data);
            
            if (response.data && response.data.products && response.data.products.length > 0) {
                const products = response.data.products.map(product => ({
                    id: product.code,
                    name: product.product_name || product.generic_name || product.product_name_fr || 'منتج غير معروف',
                    calories: product.nutriments?.['energy-kcal'] || product.nutriments?.energy || 0,
                    protein: product.nutriments?.proteins || 0,
                    carbs: product.nutriments?.carbohydrates || 0,
                    fat: product.nutriments?.fat || 0,
                    fiber: product.nutriments?.fiber || 0,
                    image: product.image_front_small_url || product.image_url || null,
                    serving_size: product.serving_size || null,
                    brand: product.brands || null
                }));
                
                setResults(products);
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
        return value !== undefined && value !== null && value !== 0 ? value : '';
    };

    return (
        <div className="food-search">
            <div className="search-box">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('foodSearch.placeholder')}
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

            {error && <div className="error-message">❌ {error}</div>}

            {results.length === 0 && query && !loading && !error && (
                <div className="no-results">
                    <p>{t('foodSearch.noResults')}</p>
                    <p className="no-results-hint">💡 جرب: تفاح، دجاج، أرز، خبز</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
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
                                        <span>🔥 {Math.round(food.calories)} {t('foodSearch.calories')}</span>
                                    )}
                                    {formatNumber(food.protein) > 0 && (
                                        <span>💪 {food.protein}g {t('foodSearch.protein')}</span>
                                    )}
                                    {formatNumber(food.carbs) > 0 && (
                                        <span>🌾 {food.carbs}g {t('foodSearch.carbs')}</span>
                                    )}
                                    {formatNumber(food.fat) > 0 && (
                                        <span>🫒 {food.fat}g {t('foodSearch.fat')}</span>
                                    )}
                                </div>
                                {food.fiber > 0 && (
                                    <div className="food-fiber">
                                        🌿 {t('foodSearch.fiber')}: {food.fiber}g
                                    </div>
                                )}
                                {food.serving_size && (
                                    <div className="food-serving">
                                        📦 {t('foodSearch.servingSize')}: {food.serving_size}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FoodSearch;