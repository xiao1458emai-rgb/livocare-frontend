// src/components/ActivityForm.jsx - نسخة مبسطة للغاية
import React, { useState, useEffect } from 'react';
import axiosInstance from '../services/api';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: ''
    });

    // ✅ جلب الأنشطة - مرة واحدة فقط
    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const response = await axiosInstance.get('/activities/');
            let data = response.data?.results || response.data || [];
            setActivities(data);
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await axiosInstance.post('/activities/', {
                activity_type: formData.activity_type,
                duration_minutes: parseInt(formData.duration_minutes),
                start_time: formData.start_time || new Date().toISOString().slice(0, 16)
            });
            
            await fetchActivities();
            
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            
            setFormData({ activity_type: '', duration_minutes: '', start_time: '' });
            
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
            <h3>إضافة نشاط جديد</h3>
            
            <form onSubmit={handleSubmit}>
                <select name="activity_type" value={formData.activity_type} onChange={handleChange} required>
                    <option value="">اختر النوع</option>
                    <option value="walking">🚶 مشي</option>
                    <option value="running">🏃 جري</option>
                    <option value="cycling">🚴 دراجة</option>
                </select>
                
                <input type="number" name="duration_minutes" placeholder="المدة (دقائق)" value={formData.duration_minutes} onChange={handleChange} required />
                
                <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required />
                
                <button type="submit" disabled={loading}>حفظ</button>
            </form>
            
            <hr />
            
            <h4>الأنشطة المسجلة ({activities.length})</h4>
            {activities.map(act => (
                <div key={act.id} style={{ borderBottom: '1px solid #eee', padding: '5px' }}>
                    {act.activity_type} - {act.duration_minutes} دقيقة
                </div>
            ))}
        </div>
    );
};

export default ActivityForm;