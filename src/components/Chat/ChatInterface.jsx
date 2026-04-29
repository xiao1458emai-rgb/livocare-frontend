'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Chat.css';

const ChatInterface = ({ isAuthReady }) => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const messagesEndRef = useRef(null);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // جلب سجل المحادثات
    useEffect(() => {
        if (isAuthReady) {
            fetchChatHistory();
        }
    }, [isAuthReady]);

    // ✅ fetchChatHistory مصححة
    const fetchChatHistory = async () => {
        try {
            const response = await axiosInstance.get('/chat-logs/');
            console.log('📜 Chat history response:', response.data);
            
            let messagesData = [];
            
            // Django REST framework pagination format
            if (response.data && response.data.results && Array.isArray(response.data.results)) {
                messagesData = response.data.results;
            } 
            // Direct array format
            else if (Array.isArray(response.data)) {
                messagesData = response.data;
            }
            // Format from send_message endpoint
            else if (response.data && response.data.success && response.data.data) {
                messagesData = response.data.data;
            }
            else {
                messagesData = [];
            }
            
            setMessages(messagesData);
        } catch (error) {
            console.error('Error fetching chat history:', error);
            setMessages([]);
        }
    };

    // التمرير لآخر رسالة
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // حذف رسالة
    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm(t('chat.deleteConfirm') || 'هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        try {
            await axiosInstance.delete(`/chat-logs/${messageId}/`);
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
            alert(t('chat.deleteError') || 'فشل في حذف الرسالة');
        }
    };

    // مسح كل المحادثة
    const handleClearChat = async () => {
        if (!window.confirm(t('chat.clearConfirm') || 'هل أنت متأكد من حذف كل المحادثة؟')) return;
        
        try {
            await axiosInstance.delete('/chat-logs/clear_all/');
            setMessages([]);
        } catch (error) {
            console.error('Error clearing chat:', error);
            // إذا لم يكن endpoint clear_all موجود، نحذف رسالة رسالة
            for (const msg of messages) {
                try {
                    await axiosInstance.delete(`/chat-logs/${msg.id}/`);
                } catch (e) {
                    console.error('Failed to delete message:', msg.id);
                }
            }
            setMessages([]);
        }
    };

    // ✅ handleSendMessage المصححة
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || loading) return;

        setLoading(true);
        try {
            const response = await axiosInstance.post('/chat-logs/send_message/', {
                message: inputMessage
            });
            
            console.log('📨 Send message response:', response.data);
            
            // معالجة تنسيق response الصحيح
            if (response.data && response.data.success && response.data.data) {
                // التنسيق الصحيح من ChatLogViewSet.send_message
                setMessages(response.data.data);
                setInputMessage('');
            } 
            else if (Array.isArray(response.data)) {
                // تنسيق بديل
                setMessages(response.data);
                setInputMessage('');
            }
            else if (response.data && response.data.message) {
                // تنسيق آخر محتمل
                const newMessage = {
                    id: Date.now(),
                    sender: 'Bot',
                    message_text: response.data.message,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, newMessage]);
                setInputMessage('');
            }
            else {
                console.error('Unexpected response structure:', response.data);
                alert(t('chat.sendError') || 'فشل في إرسال الرسالة');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            console.error('Error details:', error.response?.data);
            
            // رسالة خطأ ودية
            const errorMessage = {
                id: Date.now(),
                sender: 'Bot',
                message_text: t('chat.errorMessage') || 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`chat-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="chat-header">
                <div className="chat-header-info">
                    <span className="bot-avatar">🤖</span>
                    <div>
                        <h2>{t('chat.title') || 'الدردشة الذكية'}</h2>
                        <p className="bot-status">
                            🟢 {t('chat.online') || 'متصل'} 
                            <span className="ai-badge">🧠 AI</span>
                        </p>
                    </div>
                </div>
                
                <div className="chat-actions">
                    {messages.length > 0 && (
                        <button 
                            onClick={handleClearChat}
                            className="clear-chat-btn"
                            title={t('chat.clearAll') || 'حذف كل المحادثة'}
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-welcome">
                        <div className="welcome-icon">💬</div>
                        <h3>{t('chat.welcome') || 'مرحباً!'}</h3>
                        <p>{t('chat.welcomeMessage') || 'أنا مساعدك الصحي الذكي. كيف يمكنني مساعدتك اليوم؟'}</p>
                        <div className="suggested-questions">
                            <button onClick={() => setInputMessage("كيف حالتي الصحية اليوم؟")}>
                                🩺 كيف حالتي الصحية؟
                            </button>
                            <button onClick={() => setInputMessage("نصائح لتحسين النوم")}>
                                😴 نصائح للنوم
                            </button>
                            <button onClick={() => setInputMessage("ما هو الوزن المثالي؟")}>
                                ⚖️ الوزن المثالي
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={msg.id || index}
                            className={`message ${msg.sender === 'User' ? 'user-message' : 'bot-message'} ${msg.isError ? 'error-message' : ''}`}
                        >
                            {msg.sender !== 'User' && <span className="bot-icon">🤖</span>}
                            <div className="message-content">
                                <p>{msg.message_text}</p>
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            
                            {msg.id && (
                                <button 
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="delete-message-btn"
                                    title={t('chat.delete') || 'حذف الرسالة'}
                                >
                                    ✕
                                </button>
                            )}
                            
                            {msg.sender === 'User' && <span className="user-icon">👤</span>}
                        </div>
                    ))
                )}
                {loading && (
                    <div className="message bot-message typing">
                        <span className="bot-icon">🤖</span>
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={t('chat.placeholder') || 'اكتب رسالتك هنا...'}
                    disabled={loading}
                    className="chat-input"
                />
                <button type="submit" disabled={loading || !inputMessage.trim()} className="send-btn">
                    {loading ? '⏳' : '📤'}
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;