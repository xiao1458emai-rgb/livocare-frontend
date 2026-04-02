// src/components/Watch/WatchDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import watchService from '../../services/watchService';
import './WatchDashboard.css';

const WatchDashboard = () => {
    const { t } = useTranslation();
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [healthData, setHealthData] = useState({
        heartRate: null,
        bloodPressure: { systolic: null, diastolic: null },
        lastUpdate: null
    });
    const [alerts, setAlerts] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [adbConnected, setAdbConnected] = useState(false);

    useEffect(() => {
        // ✅ التحقق من وضع الهاتف
        setIsMobile(watchService.isMobile);
        
        // ✅ استماع لتحديثات البيانات من watchService
        watchService.onData((type, data) => {
            if (type === 'heartRate') {
                setHealthData(prev => ({ ...prev, heartRate: data, lastUpdate: new Date() }));
                window.dispatchEvent(new CustomEvent('watchDataUpdate', { detail: { heartRate: data, lastUpdate: new Date() } }));
            }
            if (type === 'bloodPressure') {
                setHealthData(prev => ({ ...prev, bloodPressure: data, lastUpdate: new Date() }));
                window.dispatchEvent(new CustomEvent('watchDataUpdate', { detail: { bloodPressure: data, lastUpdate: new Date() } }));
            }
            if (type === 'connected') {
                setConnected(true);
                setAdbConnected(true);
            }
            if (type === 'disconnected') {
                setConnected(false);
                setAdbConnected(false);
            }
        });

        // استماع للتنبيهات
        window.addEventListener('watchAlert', (e) => {
            setAlerts(prev => [e.detail, ...prev].slice(0, 5));
            setTimeout(() => setAlerts(prev => prev.slice(1)), 5000);
        });

        // ✅ محاولة الاتصال بـ ADB Monitor تلقائياً
        if (watchService.isMobile) {
            setTimeout(() => {
                watchService.connectADBMonitor();
            }, 1000);
        }

        return () => {
            window.removeEventListener('watchAlert', () => {});
        };
    }, []);

    const connectWatch = async () => {
        setConnecting(true);
        try {
            const success = await watchService.connectToWatch();
            if (success) {
                setConnected(true);
                const hr = await watchService.readHeartRate();
                const bp = await watchService.readBloodPressure();
                if (hr) setHealthData(prev => ({ ...prev, heartRate: hr, lastUpdate: new Date() }));
                if (bp) setHealthData(prev => ({ ...prev, bloodPressure: bp, lastUpdate: new Date() }));
            }
        } catch (error) {
            console.error('Connection failed:', error);
        }
        setConnecting(false);
    };

    const disconnectWatch = () => {
        watchService.disconnect();
        setConnected(false);
        setAdbConnected(false);
        setHealthData({
            heartRate: null,
            bloodPressure: { systolic: null, diastolic: null },
            lastUpdate: null
        });
    };

    const connectADB = () => {
        watchService.connectADBMonitor();
    };

    const requestMeasurement = () => {
        if (watchService.ws && watchService.ws.readyState === WebSocket.OPEN) {
            watchService.ws.send(JSON.stringify({ type: 'request_measurement' }));
            console.log('📤 Requested measurement from ADB');
            alert('📤 تم إرسال طلب القياس\n\nقم بالقياس في تطبيق FitPro');
        } else {
            console.log('⚠️ WebSocket not connected, trying to connect...');
            watchService.connectADBMonitor();
            setTimeout(() => {
                if (watchService.ws && watchService.ws.readyState === WebSocket.OPEN) {
                    watchService.ws.send(JSON.stringify({ type: 'request_measurement' }));
                    alert('📤 تم إرسال طلب القياس\n\nقم بالقياس في تطبيق FitPro');
                } else {
                    alert('❌ لا يمكن الاتصال بـ ADB Monitor\n\nتأكد من:\n1. تشغيل ADB Monitor على الكمبيوتر\n2. الهاتف متصل بالكمبيوتر عبر USB\n3. إعدادات USB Debugging مفعلة');
                }
            }, 2000);
        }
    };

    const showMobileMessage = () => {
        alert('📱 وضع الهاتف - ADB Monitor\n\n1. شغل ADB Monitor على الكمبيوتر:\n   node server/adbMonitor.js\n\n2. وصل الهاتف بالكمبيوتر عبر USB\n\n3. قم بالقياس في تطبيق FitPro\n\n4. ستظهر البيانات هنا تلقائياً');
    };

    const refreshData = async () => {
        const hr = await watchService.readHeartRate();
        const bp = await watchService.readBloodPressure();
        if (hr) setHealthData(prev => ({ ...prev, heartRate: hr, lastUpdate: new Date() }));
        if (bp) setHealthData(prev => ({ ...prev, bloodPressure: bp, lastUpdate: new Date() }));
    };

    return (
        <div className="watch-dashboard">
            <div className="watch-header">
                <h2>⌚ {t('watch.title', 'الساعة الذكية Z99 Ultra')}</h2>
                <div className="header-buttons">
                    {!connected ? (
                        <>
                            {!isMobile && (
                                <button 
                                    onClick={connectWatch}
                                    disabled={connecting}
                                    className="connect-btn"
                                >
                                    {connecting ? '🔄 جاري الاتصال...' : '🔗 بلوتوث'}
                                </button>
                            )}
                            {isMobile && (
                                <button 
                                    onClick={connectADB}
                                    className="adb-connect-btn"
                                >
                                    🔌 اتصال ADB
                                </button>
                            )}
                        </>
                    ) : (
                        <button onClick={disconnectWatch} className="disconnect-btn">
                            🔌 فصل
                        </button>
                    )}
                </div>
            </div>

            {/* حالة اتصال ADB */}
            {isMobile && (
                <div className={`adb-status ${adbConnected ? 'connected' : 'disconnected'}`}>
                    <span className="status-dot"></span>
                    <span className="status-text">
                        {adbConnected ? '✅ متصل بـ ADB Monitor' : '⏳ غير متصل - اضغط "اتصال ADB"'}
                    </span>
                </div>
            )}

            {connected && (
                <div className="watch-data">
                    {isMobile && adbConnected && (
                        <div className="mobile-mode-badge">
                            📱 ADB Mode - البيانات ستصل من FitPro عبر USB
                        </div>
                    )}

                    <div className="data-card heart-rate">
                        <div className="card-icon">❤️</div>
                        <div className="card-info">
                            <h3>{t('watch.heartRate', 'معدل ضربات القلب')}</h3>
                            <div className="value">
                                {healthData.heartRate || '---'}
                                <span className="unit">BPM</span>
                            </div>
                            <div className="status">
                                {healthData.heartRate > 100 && '⚠️ مرتفع'}
                                {healthData.heartRate < 60 && '⚠️ منخفض'}
                                {healthData.heartRate >= 60 && healthData.heartRate <= 100 && healthData.heartRate && '✅ طبيعي'}
                            </div>
                        </div>
                    </div>

                    <div className="data-card blood-pressure">
                        <div className="card-icon">🩸</div>
                        <div className="card-info">
                            <h3>{t('watch.bloodPressure', 'ضغط الدم')}</h3>
                            <div className="value">
                                {healthData.bloodPressure.systolic || '---'}/
                                {healthData.bloodPressure.diastolic || '---'}
                                <span className="unit">mmHg</span>
                            </div>
                            <div className="status">
                                {healthData.bloodPressure.systolic > 140 && '⚠️ مرتفع'}
                                {healthData.bloodPressure.systolic < 90 && '⚠️ منخفض'}
                                {healthData.bloodPressure.systolic >= 90 && healthData.bloodPressure.systolic <= 140 && healthData.bloodPressure.systolic && '✅ طبيعي'}
                            </div>
                        </div>
                    </div>

                    <div className="action-buttons-row">
                        <button onClick={refreshData} className="refresh-btn">
                            🔄 {t('watch.refresh', 'تحديث')}
                        </button>
                        {isMobile && adbConnected && (
                            <button onClick={requestMeasurement} className="request-btn">
                                📊 طلب قياس جديد
                            </button>
                        )}
                    </div>

                    {healthData.lastUpdate && (
                        <div className="last-update">
                            {t('watch.lastUpdate', 'آخر تحديث')}: {new Date(healthData.lastUpdate).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            )}

            {/* رسالة توضيحية عند عدم الاتصال على الهاتف */}
            {!connected && isMobile && (
                <div className="info-message">
                    <div className="info-icon">📱</div>
                    <div className="info-text">
                        <strong>وضع ADB Monitor</strong>
                        <p>1. شغل الخادم: <code>node server/adbMonitor.js</code></p>
                        <p>2. وصل الهاتف بالكمبيوتر عبر USB (USB Debugging مفعل)</p>
                        <p>3. اضغط "اتصال ADB" ثم قم بالقياس في FitPro</p>
                        <button onClick={showMobileMessage} className="help-btn">
                            ❓ مساعدة
                        </button>
                    </div>
                </div>
            )}

            {/* التنبيهات */}
            {alerts.length > 0 && (
                <div className="alerts-container">
                    {alerts.map((alert, i) => (
                        <div key={i} className="alert-message">
                            <strong>{alert.title}</strong>
                            <p>{alert.message}</p>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .watch-dashboard {
                    background: var(--card-bg);
                    border-radius: 20px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .watch-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .header-buttons {
                    display: flex;
                    gap: 8px;
                }
                .connect-btn, .disconnect-btn, .info-btn, .adb-connect-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .connect-btn {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                }
                .disconnect-btn {
                    background: #ef4444;
                    color: white;
                }
                .info-btn {
                    background: #10b981;
                    color: white;
                }
                .adb-connect-btn {
                    background: #3b82f6;
                    color: white;
                }
                .adb-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border-radius: 20px;
                    margin-bottom: 16px;
                    font-size: 0.8rem;
                }
                .adb-status.connected {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }
                .adb-status.disconnected {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                }
                .mobile-mode-badge {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                    padding: 8px 12px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 0.8rem;
                    margin-bottom: 16px;
                }
                .info-message {
                    margin-top: 16px;
                    padding: 16px;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 12px;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                .info-icon {
                    font-size: 2rem;
                }
                .info-text {
                    flex: 1;
                }
                .info-text strong {
                    display: block;
                    margin-bottom: 8px;
                }
                .info-text p {
                    margin: 4px 0;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .info-text code {
                    background: var(--card-bg);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                }
                .help-btn {
                    margin-top: 8px;
                    padding: 4px 12px;
                    background: transparent;
                    border: 1px solid var(--primary-color);
                    border-radius: 20px;
                    color: var(--primary-color);
                    cursor: pointer;
                    font-size: 0.7rem;
                }
                .watch-data {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .data-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .card-icon {
                    font-size: 3rem;
                }
                .card-info {
                    flex: 1;
                }
                .card-info h3 {
                    margin: 0 0 8px 0;
                    font-size: 1rem;
                }
                .value {
                    font-size: 2rem;
                    font-weight: 700;
                }
                .unit {
                    font-size: 0.9rem;
                    margin-left: 4px;
                }
                .status {
                    font-size: 0.8rem;
                    margin-top: 4px;
                }
                .action-buttons-row {
                    display: flex;
                    gap: 12px;
                }
                .refresh-btn, .request-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .refresh-btn {
                    background: var(--primary-color);
                    color: white;
                }
                .request-btn {
                    background: #10b981;
                    color: white;
                }
                .last-update {
                    text-align: center;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }
                .alerts-container {
                    margin-top: 16px;
                }
                .alert-message {
                    background: rgba(239, 68, 68, 0.1);
                    border-left: 4px solid #ef4444;
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 8px;
                }
                @media (max-width: 480px) {
                    .action-buttons-row {
                        flex-direction: column;
                    }
                    .data-card {
                        flex-direction: column;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default WatchDashboard;