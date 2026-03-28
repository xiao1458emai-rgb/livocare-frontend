// src/components/Watch/WatchDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import watchService from '../../services/watchService';
import './WatchDashboard.css';

const WatchDashboard = () => {
    const { t } = useTranslation();
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [adbMode, setAdbMode] = useState(false);
    const [healthData, setHealthData] = useState({
        heartRate: null,
        bloodPressure: { systolic: null, diastolic: null },
        lastUpdate: null
    });
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        // استماع لتحديثات البيانات
        window.addEventListener('watchDataUpdate', (e) => {
            setHealthData(e.detail);
        });

        // استماع للتنبيهات
        window.addEventListener('watchAlert', (e) => {
            setAlerts(prev => [e.detail, ...prev].slice(0, 5));
            setTimeout(() => setAlerts(prev => prev.slice(1)), 5000);
        });

        return () => {
            window.removeEventListener('watchDataUpdate', () => {});
            window.removeEventListener('watchAlert', () => {});
        };
    }, []);

    const connectWatch = async () => {
        setConnecting(true);
        try {
            const success = await watchService.connectToWatch();
            if (success) {
                setConnected(true);
                await watchService.readHeartRate();
                await watchService.readBloodPressure();
            }
        } catch (error) {
            console.error('Connection failed:', error);
        }
        setConnecting(false);
    };

    const disconnectWatch = () => {
        watchService.disconnect();
        setConnected(false);
    };

    const enableADBMode = () => {
        watchService.enableADBMode();
        setAdbMode(true);
        setConnected(true);
    };

    const refreshData = async () => {
        await watchService.readHeartRate();
        await watchService.readBloodPressure();
    };

    return (
        <div className="watch-dashboard">
            <div className="watch-header">
                <h2>⌚ {t('watch.title', 'الساعة الذكية Z99 Ultra')}</h2>
                <div className="header-buttons">
                    {!connected ? (
                        <>
                            <button 
                                onClick={connectWatch}
                                disabled={connecting}
                                className="connect-btn"
                            >
                                {connecting ? '🔄 جاري الاتصال...' : '🔗 بلوتوث'}
                            </button>
                            <button 
                                onClick={enableADBMode}
                                className="adb-btn"
                            >
                                📱 ADB
                            </button>
                        </>
                    ) : (
                        <button onClick={disconnectWatch} className="disconnect-btn">
                            🔌 فصل
                        </button>
                    )}
                </div>
            </div>

            {connected && (
                <div className="watch-data">
                    {adbMode && (
                        <div className="adb-mode-badge">
                            📱 وضع ADB - استخدم تطبيق FitPro للقياس
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

                    <button onClick={refreshData} className="refresh-btn">
                        🔄 {t('watch.refresh', 'تحديث')}
                    </button>

                    {healthData.lastUpdate && (
                        <div className="last-update">
                            {t('watch.lastUpdate', 'آخر تحديث')}: {new Date(healthData.lastUpdate).toLocaleTimeString()}
                        </div>
                    )}
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
                .connect-btn, .disconnect-btn, .adb-btn {
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
                .adb-btn {
                    background: #10b981;
                    color: white;
                }
                .adb-mode-badge {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                    padding: 8px 12px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 0.8rem;
                    margin-bottom: 16px;
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
                .refresh-btn {
                    padding: 12px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
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
            `}</style>
        </div>
    );
};

export default WatchDashboard;