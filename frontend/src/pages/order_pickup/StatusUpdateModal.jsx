import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, CheckCircle2, RefreshCw } from 'lucide-react';
import './StatusUpdateModal.css';

export default function StatusUpdateModal({ isOpen, onClose, onUpdateStatus, currentOrder }) {
    if (isOpen === false) return null;

    const steps = [
        { id: 1, key: 'Pending', label: 'Pending' },
        { id: 2, key: 'Accepted', label: 'Accepted' },
        { id: 3, key: 'Preparing', label: 'Preparing' },
        { id: 4, key: 'Ready for Pickup', label: 'Ready for Pickup' },
        { id: 5, key: 'Collected', label: 'Collected' }
    ];

    const getInitialStepIndex = (statusStr) => {
        if (!statusStr) return 0;
        const s = String(statusStr).toLowerCase();
        if (s.includes('collect') || s.includes('complete')) return 4;
        if (s.includes('ready')) return 3;
        if (s.includes('prep') || s.includes('pack')) return 2;
        if (s.includes('accept')) return 1;
        return 0; // Default: Pending
    };

    const [activeStepIndex, setActiveStepIndex] = useState(() => getInitialStepIndex(currentOrder?.status));

    useEffect(() => {
        if (currentOrder?.status) {
            setActiveStepIndex(getInitialStepIndex(currentOrder.status));
        }
    }, [currentOrder?.status]);

    const handleSelectStep = (index) => {
        setActiveStepIndex(index);
    };

    const selectedStep = steps[activeStepIndex] || steps[0];
    const buttonLabel = `Update Status to "${selectedStep.label}"`;

    const handleConfirmUpdate = () => {
        if (onUpdateStatus && currentOrder) {
            onUpdateStatus(currentOrder.id || currentOrder.dbId, selectedStep.key);
        }
        if (onClose) onClose();
    };

    const handleCloseModal = () => {
        if (onClose) onClose();
    };

    const content = (
        <div className="status-update-container">
            {/* Header Title Row */}
            <div className="status-update-title-row">
                <div>
                    <span className="status-update-sub-tag">Order #{currentOrder?.id || 'PF-1028'}</span>
                    <h1 className="status-update-page-title">Update status</h1>
                </div>
                <button
                    className="status-update-back-btn"
                    onClick={handleCloseModal}
                    aria-label="Close"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {/* Vertical Timeline Stepper */}
            <div className="status-update-stepper-wrapper">
                <div className="status-update-vertical-line" />

                {steps.map((step, index) => {
                    const isCompleted = index < activeStepIndex;
                    const isActive = index === activeStepIndex;

                    let circleClass = 'pending';
                    if (isCompleted) circleClass = 'completed';
                    if (isActive) circleClass = 'active';

                    let labelClass = 'pending';
                    if (isCompleted) labelClass = 'completed';
                    if (isActive) labelClass = 'active';

                    return (
                        <div
                            key={step.id}
                            className={`status-update-step-item ${isActive ? 'selected-step-card' : ''}`}
                            onClick={() => handleSelectStep(index)}
                        >
                            <div className={`status-update-step-circle ${circleClass}`}>
                                {isCompleted ? (
                                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                                ) : (
                                    step.id
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 className={`status-update-step-label ${labelClass}`}>
                                    {step.label}
                                </h3>
                                {isActive && (
                                    <span className="status-selected-indicator">Selected Status</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons Stack */}
            <div className="status-update-actions-group">
                <button
                    className="status-update-primary-btn"
                    onClick={handleConfirmUpdate}
                >
                    <CheckCircle2 size={18} />
                    <span>{buttonLabel}</span>
                </button>

                <button
                    className="status-update-cancel-btn"
                    onClick={handleCloseModal}
                >
                    Cancel Update
                </button>
            </div>
        </div>
    );

    if (isOpen) {
        return (
            <div className="op-status-modal-overlay" onClick={handleCloseModal}>
                <div className="op-status-modal-card-full" onClick={(e) => e.stopPropagation()}>
                    {content}
                </div>
            </div>
        );
    }

    return content;
}
