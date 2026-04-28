// src/components/SmartFeatures/FoodSearch.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../services/api';  // ✅ استخدم axiosInstance بدلاً من axios مباشرة
import './SmartFeatures.css';

const FoodSearch = ({ onSelectFood }) => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ✅ الاستماع لتغييرات اللغة
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

    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // ✅ استخدام Backend بدلاً من الاتصال المباشر
            const response = await axiosInstance.get('/food/search/', {
                params: { query: query.trim() },
                timeout: 15000
            });
            
            console.log('🔍 Search response:', response.data);
            
            if (response.data?.success && response.data?.data) {
                const products = response.data.data;
                
                if (products.length > 0) {
                    console.log(`✅ Found ${products.length} products`);
                    setResults(products);
                } else {
                    setResults([]);
                    setError(response.data?.message || (isArabic ? 'لم يتم العثور على نتائج' : 'No results found'));
                }
            } else {
                setResults([]);
                setError(response.data?.error || (isArabic ? 'حدث خطأ في البحث' : 'Search error'));
            }
        } catch (err) {
            console.error('Food search error:', err);
            
            let errorMessage = isArabic ? 'حدث خطأ في البحث. يرجى المحاولة مرة أخرى.' : 'Search error. Please try again.';
            
            if (err.response?.status === 504) {
                errorMessage = isArabic ? 'انتهى وقت الاتصال، يرجى المحاولة مرة أخرى' : 'Connection timeout, please try again';
            } else if (err.response?.status === 503) {
                errorMessage = isArabic ? 'لا يمكن الاتصال بقاعدة البيانات' : 'Cannot connect to database';
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            }
            
            setError(errorMessage);
            setResults([]);
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
                <h3>{isArabic ? '🔍 بحث عن طعام' : '🔍 Food Search'}</h3>
                <p className="search-subtitle">
                    {isArabic ? 'ابحث عن الأطعمة والمكونات الغذائية' : 'Search for foods and ingredients'}
                </p>
            </div>
            
            <div className="search-box">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isArabic ? 'مثال: تفاح، دجاج، أرز، زبادي...' : 'Example: apple, chicken, rice, yogurt...'}
                    className="search-input"
                />
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="search-btn"
                >
                    {loading ? '⏳' : '🔍'} {isArabic ? 'بحث' : 'Search'}
                </button>
            </div>

            {loading && (
                <div className="search-loading">
                    <div className="spinner-small"></div>
                    <p>{isArabic ? 'جاري البحث...' : 'Searching...'}</p>
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
                    <p>{isArabic ? `لم يتم العثور على نتائج لـ "${query}"` : `No results found for "${query}"`}</p>
                    <p className="no-results-hint">
                        💡 {isArabic ? 'جرب: تفاح، دجاج، أرز، خبز، زبادي، موز' : 'Try: apple, chicken, rice, bread, yogurt, banana'}
                    </p>
                </div>
            )}

            {results.length > 0 && (
                <div className="search-results">
                    <div className="results-header">
                        <span>📋 {isArabic ? `نتائج البحث (${results.length})` : `Search Results (${results.length})`}</span>
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
                                            <span className="nutrient calories">🔥 {food.calories} {isArabic ? 'سعرة' : 'cal'}</span>
                                        )}
                                        {formatNumber(food.protein) > 0 && (
                                            <span className="nutrient protein">💪 {food.protein}g {isArabic ? 'بروتين' : 'protein'}</span>
                                        )}
                                        {formatNumber(food.carbs) > 0 && (
                                            <span className="nutrient carbs">🌾 {food.carbs}g {isArabic ? 'كارب' : 'carbs'}</span>
                                        )}
                                        {formatNumber(food.fat) > 0 && (
                                            <span className="nutrient fat">🫒 {food.fat}g {isArabic ? 'دهون' : 'fat'}</span>
                                        )}
                                    </div>
                                    <div className="select-hint">{isArabic ? '✨ انقر للإضافة' : '✨ Click to add'}</div>
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