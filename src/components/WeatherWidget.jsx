// components/WeatherWidget.jsx
const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);
    const [recommendation, setRecommendation] = useState('');

    useEffect(() => {
        fetchWeather();
    }, []);

    const fetchWeather = async () => {
        const response = await axiosInstance.get('/api/weather/');
        setWeather(response.data);
        generateRecommendation(response.data);
    };

    const generateRecommendation = (weather) => {
        if (weather.temperature > 35) {
            setRecommendation('🌡️ الجو حار جداً! اشرب ماء كثيراً وتجنب التمارين الشاقة');
        } else if (weather.temperature < 15) {
            setRecommendation('🧥 الجو بارد! ارتد ملابس دافئة ومارس الرياضة داخل المنزل');
        } else if (weather.description.includes('مطر')) {
            setRecommendation('☔ يوم ممطر! وقت مناسب للتأمل والقراءة');
        }
    };

    return (
        <div className="weather-widget">
            <div className="weather-icon">🌤️</div>
            <div className="weather-info">
                <h4>{weather?.city}</h4>
                <p>{weather?.temperature}°C - {weather?.description}</p>
                {recommendation && <p className="recommendation">{recommendation}</p>}
            </div>
        </div>
    );
};