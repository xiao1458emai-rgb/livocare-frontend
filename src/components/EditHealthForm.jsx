// src/components/EditHealthForm.jsx
'use client'
import React, { useState } from 'react';
import axiosInstance from '../services/api';

const EditHealthForm = ({ currentRecord, onClose, onUpdate, isArabic }) => {
    const [formData, setFormData] = useState({
        weight_kg: currentRecord.weight_kg || '',
        systolic_pressure: currentRecord.systolic_pressure || '',
        diastolic_pressure: currentRecord.diastolic_pressure || '',
        blood_glucose: currentRecord.blood_glucose || '',
        heart_rate: currentRecord.heart_rate || '',
        spo2: currentRecord.spo2 || '',
        body_temperature: currentRecord.body_temperature || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axiosInstance.put(`/health_status/${currentRecord.id}/`, formData);
            if (onUpdate) onUpdate();
            if (onClose) onClose();
        } catch (err) {
            console.error('Error updating record:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isArabic ? '✏️ تعديل القراءة' : '✏️ Edit Reading'}</h3>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="edit-form-grid">
                        <div className="form-group">
                            <label>⚖️ {isArabic ? 'الوزن' : 'Weight'} (kg)</label>
                            <input name="weight_kg" type="number" step="0.1" value={formData.weight_kg || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>❤️ {isArabic ? 'الضغط الانقباضي' : 'Systolic'} (mmHg)</label>
                            <input name="systolic_pressure" type="number" value={formData.systolic_pressure || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>💙 {isArabic ? 'الضغط الانبساطي' : 'Diastolic'} (mmHg)</label>
                            <input name="diastolic_pressure" type="number" value={formData.diastolic_pressure || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>🩸 {isArabic ? 'سكر الدم' : 'Glucose'} (mg/dL)</label>
                            <input name="blood_glucose" type="number" step="0.1" value={formData.blood_glucose || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>💓 {isArabic ? 'النبض' : 'Heart Rate'} (BPM)</label>
                            <input name="heart_rate" type="number" value={formData.heart_rate || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>💨 SpO₂ (%)</label>
                            <input name="spo2" type="number" value={formData.spo2 || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>🌡️ {isArabic ? 'درجة الحرارة' : 'Temperature'} (°C)</label>
                            <input name="body_temperature" type="number" step="0.1" value={formData.body_temperature || ''} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="cancel-btn">
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" disabled={loading} className="save-btn">
                            {loading ? '...' : (isArabic ? '💾 حفظ' : '💾 Save')}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    animation: fadeIn 0.2s ease;
                }
                .edit-modal {
                    background: var(--card-bg);
                    border-radius: 24px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 1.5rem;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                }
                .modal-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }
                .close-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: none;
                    background: rgba(239,68,68,0.1);
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 1.2rem;
                }
                .edit-form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1rem;
                    margin: 1.5rem 0;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .form-group label {
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                }
                .form-group input {
                    padding: 0.75rem;
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    background: var(--input-bg);
                    color: var(--text-primary);
                }
                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-light);
                }
                .cancel-btn {
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    cursor: pointer;
                }
                .save-btn {
                    flex: 1;
                    padding: 0.75rem;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @media (max-width: 640px) {
                    .edit-form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default EditHealthForm;