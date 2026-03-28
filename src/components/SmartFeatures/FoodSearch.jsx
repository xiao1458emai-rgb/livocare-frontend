// src/components/SmartFeatures/FoodSearch.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import externalApis from '../../services/externalApis';
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
            const response = await externalApis.searchFood(query);
            if (response.success) {
                setResults(response.data);
            } else {
                setError(response.error || t('foodSearch.searchFailed'));
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

    // ✅ دالة مساعدة لتنسيق الأرقام
    const formatNumber = (value) => {
        return value !== undefined && value !== null ? value : 0;
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
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
                    {results.map((food, index) => (
                        <div 
                            key={index} 
                            className="food-card"
                            onClick={() => onSelectFood && onSelectFood(food)}
                        >
                            {food.image && (
                                <img src={food.image} alt={food.name} className="food-image" />
                            )}
                            <div className="food-info">
                                <h4>{food.name}</h4>
                                <div className="food-nutrients">
                                    <span>🔥 {formatNumber(food.calories)} {t('foodSearch.calories')}</span>
                                    <span>💪 {formatNumber(food.protein)}g {t('foodSearch.protein')}</span>
                                    <span>🌾 {formatNumber(food.carbs)}g {t('foodSearch.carbs')}</span>
                                    <span>🫒 {formatNumber(food.fat)}g {t('foodSearch.fat')}</span>
                                </div>
                                {food.fiber > 0 && (
                                    <div className="food-fiber">
                                        🌿 {t('foodSearch.fiber')}: {formatNumber(food.fiber)}g
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