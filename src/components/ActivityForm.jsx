// ActivityForm.jsx - الشكل المجرد (بدون أي أنماط أو مكونات خارجية)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        calories_burned: ''
    });
    
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [userWeight, setUserWeight] = useState(70);
    const [showCaloriesEdit, setShowCaloriesEdit] = useState(false);
    
    const isMountedRef = useRef(true);
    const analyticsFetchedRef = useRef(false);

    const MET_VALUES = {
        walking: 3.5,
        running: 9.8,
        cycling: 7.5,
        swimming: 7.0,
        yoga: 2.5,
        weightlifting: 5.0,
        cardio: 6.5,
        other: 4.0
    };

    const calculateCalories = (activityType, durationMinutes, weight) => {
        if (!activityType || !durationMinutes || !weight) return 0;
        const met = MET_VALUES[activityType] || 4.0;
        return Math.round(met * weight * (durationMinutes / 60));
    };

    const updateCalories = useCallback((activityType, durationMinutes) => {
        if (activityType && durationMinutes && userWeight) {
            const calories = calculateCalories(activityType, parseInt(durationMinutes), userWeight);
            setFormData(prev => ({ ...prev, calories_burned: calories.toString() }));
        }
    }, [userWeight]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'activity_type' || name === 'duration_minutes') {
            const activityType = name === 'activity_type' ? value : formData.activity_type;
            const duration = name === 'duration_minutes' ? value : formData.duration_minutes;
            if (activityType && duration) {
                updateCalories(activityType, duration);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axiosInstance.post('/activities/', {
                activity_type: formData.activity_type,
                duration_minutes: parseInt(formData.duration_minutes),
                start_time: formData.start_time || new Date().toISOString().slice(0, 16),
                calories_burned: parseInt(formData.calories_burned) || 0
            });
            
            setFormData({ activity_type: '', duration_minutes: '', start_time: '', calories_burned: '' });
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Activity Form</h2>
            
            <form onSubmit={handleSubmit}>
                <select 
                    name="activity_type" 
                    value={formData.activity_type} 
                    onChange={handleChange} 
                    required
                >
                    <option value="">Select activity type</option>
                    <option value="walking">Walking</option>
                    <option value="running">Running</option>
                    <option value="cycling">Cycling</option>
                    <option value="swimming">Swimming</option>
                    <option value="yoga">Yoga</option>
                    <option value="weightlifting">Weightlifting</option>
                    <option value="cardio">Cardio</option>
                </select>
                
                <input 
                    type="number" 
                    name="duration_minutes" 
                    placeholder="Duration (minutes)"
                    value={formData.duration_minutes} 
                    onChange={handleChange} 
                    required 
                />
                
                <input 
                    type="number" 
                    name="calories_burned" 
                    placeholder="Calories burned (auto)"
                    value={formData.calories_burned} 
                    onChange={(e) => {
                        setFormData(prev => ({ ...prev, calories_burned: e.target.value }));
                        setShowCaloriesEdit(true);
                    }} 
                />
                
                <input 
                    type="datetime-local" 
                    name="start_time" 
                    value={formData.start_time} 
                    onChange={handleChange} 
                    required 
                />
                
                <button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Activity'}
                </button>
            </form>
        </div>
    );
};

export default ActivityForm;