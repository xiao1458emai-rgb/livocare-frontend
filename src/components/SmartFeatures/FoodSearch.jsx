// src/components/SmartFeatures/FoodSearch.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../services/api';  // ✅ استخدم axiosInstance بدلاً من axios مباشرة
import '../../index.css';

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
                        {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
  /* ===========================================
   NutritionMain.css - الأنماط الداخلية فقط
   ✅ الصفحة الرئيسية للتغذية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.nutrition-main-container {
    background: var(--primary-bg, #f5f5f5);
    min-height: 100vh;
}

.dark-mode .nutrition-main-container {
    background: #0f172a;
}

/* ===== شريط التحميل ===== */
.loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(16, 185, 129, 0.15);
    z-index: 9999;
    overflow: hidden;
}

.loading-progress {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
    animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
}

/* ===== رأس الصفحة ===== */
.nutrition-header {
    background: var(--card-bg, #ffffff);
    border-bottom: 1px solid var(--border-light, #eef2f6);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.dark-mode .nutrition-header {
    background: #1e293b;
    border-bottom-color: #334155;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.header-title h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .header-title h1 {
    background: linear-gradient(135deg, #f87171, #fbbf24);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.title-icon {
    font-size: 1.8rem;
}

.header-badge {
    padding: 0.35rem 0.85rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .header-badge {
    background: #0f172a;
    color: #94a3b8;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.last-update {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    padding: 0.25rem 0.75rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 20px;
}

.dark-mode .last-update {
    background: #0f172a;
    color: #64748b;
}

/* ===== مفتاح التحديث التلقائي ===== */
.auto-refresh-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
    font-size: 0.75rem;
    transition: all 0.2s;
}

.dark-mode .auto-refresh-label {
    background: #0f172a;
    border-color: #334155;
}

.auto-refresh-label:hover {
    border-color: #10b981;
}

.auto-refresh-label input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    width: 36px;
    height: 18px;
    background: var(--border-light, #e2e8f0);
    border-radius: 18px;
    position: relative;
    transition: all 0.2s;
}

.dark-mode .toggle-slider {
    background: #475569;
}

.toggle-slider::before {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: all 0.2s;
}

input:checked + .toggle-slider {
    background: #10b981;
}

input:checked + .toggle-slider::before {
    transform: translateX(18px);
}

[dir="rtl"] input:checked + .toggle-slider::before {
    transform: translateX(-18px);
}

.toggle-text {
    color: var(--text-secondary, #64748b);
    font-weight: 500;
}

.dark-mode .toggle-text {
    color: #94a3b8;
}

/* ===== زر التحديث ===== */
.refresh-btn {
    width: 32px;
    height: 32px;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

.refresh-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    transform: rotate(180deg);
    border-color: transparent;
}

.refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== رسالة الخطأ ===== */
.error-message {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 14px;
    padding: 0.75rem 1rem;
    margin: 0 1rem 1.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: shake 0.3s ease;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.error-icon {
    font-size: 1rem;
}

.error-text {
    flex: 1;
    font-size: 0.85rem;
    color: #ef4444;
    font-weight: 500;
}

.error-close {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    border-radius: 6px;
    transition: all 0.2s;
}

.error-close:hover {
    background: rgba(239, 68, 68, 0.1);
}

/* ===== التبويبات ===== */
.nutrition-tabs {
    display: flex;
    gap: 0.5rem;
    margin: 0 1rem 1.5rem 1rem;
    padding: 0.25rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 50px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .nutrition-tabs {
    background: #0f172a;
    border-color: #334155;
}

.tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: transparent;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .tab-btn {
    color: #94a3b8;
}

.tab-icon {
    font-size: 1rem;
}

.tab-btn:hover {
    background: var(--hover-bg, #f1f5f9);
    transform: translateY(-1px);
}

.dark-mode .tab-btn:hover {
    background: #334155;
}

.tab-btn.active {
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    color: white;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.tab-btn.active:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* ===== محتوى التبويب ===== */
.tab-content {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .header-title {
    flex-direction: row-reverse;
}

[dir="rtl"] .header-controls {
    flex-direction: row-reverse;
}

[dir="rtl"] .auto-refresh-label {
    flex-direction: row-reverse;
}

[dir="rtl"] .error-message {
    flex-direction: row-reverse;
}

[dir="rtl"] .tab-btn {
    flex-direction: row-reverse;
}

[dir="rtl"] .error-message {
    animation: shakeRTL 0.3s ease;
}

@keyframes shakeRTL {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .loading-progress {
        animation: none;
    }
    
    .tab-content {
        animation: none;
    }
    
    .error-message {
        animation: none;
    }
    
    .refresh-btn:hover:not(:disabled) {
        transform: none;
    }
    
    .tab-btn:hover {
        transform: none;
    }
    
    .tab-btn.active:hover {
        transform: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .nutrition-header {
        border-bottom-width: 2px;
    }
    
    .tab-btn.active {
        border: 2px solid currentColor;
    }
    
    .error-message {
        border-width: 2px;
    }
    
    .auto-refresh-label {
        border-width: 2px;
    }
}
            `}</style>
        </div>
    );
};

export default FoodSearch;