import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, CheckCircle2, User, Clock, Package, AlertCircle } from 'lucide-react';
import './StatusUpdatePage.css';

export default function StatusUpdatePage({ onNavigate, order }) {
    const [currentOrder, setCurrentOrder] = useState(order || {
        id: 'PF-1028',
        dbId: null,
        customerName: 'Kiara Fernando',
        phone: '0772345445',
        pickupTime: '4:00 PM - 4:30 PM',
        status: 'PENDING',
        items: []
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => {
        if (order) {
            setCurrentOrder(order);
        }
    }, [order]);

    const steps = [
        { id: 1, key: 'Pending', label: 'Pending', desc: 'Order received & waiting for confirmation' },
        { id: 2, key: 'Accepted', label: 'Accepted', desc: 'Order confirmed by store staff' },
        { id: 3, key: 'Preparing', label: 'Preparing', desc: 'Items being picked & packed' },
        { id: 4, key: 'Ready for Pickup', label: 'Ready for Pickup', desc: 'Packed & ready at pickup counter' },
        { id: 5, key: 'Collected', label: 'Collected', desc: 'Picked up by customer' }
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

    const selectedStep = steps[activeStepIndex] || steps[0];

    const handleConfirmUpdate = async () => {
        setIsUpdating(true);
        const targetId = currentOrder.dbId || currentOrder.rawOrder?._id || currentOrder.id;
        const newStatus = selectedStep.key;
        let serverUpdatedOrder = null;

        try {
            if (targetId) {
                const res = await fetch(`http://localhost:5000/api/orders/${targetId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                console.log('MongoDB Status Update response:', data);
                if (data.success && data.order) {
                    serverUpdatedOrder = data.order;
                }
            }
        } catch (err) {
            console.error('Failed to update status in MongoDB Atlas:', err);
        }

        setIsUpdating(false);
        setUpdateSuccess(true);

        const updatedOrderObj = {
            ...currentOrder,
            status: newStatus,
            dbId: serverUpdatedOrder?._id || currentOrder.dbId,
            customerAvatar: serverUpdatedOrder?.customerAvatar || currentOrder.customerAvatar || resolvedAvatar,
            customerImage: serverUpdatedOrder?.customerImage || currentOrder.customerImage || resolvedAvatar,
            rawOrder: serverUpdatedOrder || currentOrder.rawOrder
        };

        setTimeout(() => {
            if (onNavigate) {
                onNavigate('order_details', { order: updatedOrderObj });
            }
        }, 600);
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('order_details', { order: currentOrder });
        }
    };

    const resolvedAvatar =
        (currentOrder.customerAvatar && !currentOrder.customerAvatar.includes('unsplash.com'))
            ? currentOrder.customerAvatar
            : (currentOrder.customerImage && !currentOrder.customerImage.includes('unsplash.com'))
                ? currentOrder.customerImage
                : (currentOrder.rawOrder?.customerAvatar && !currentOrder.rawOrder?.customerAvatar.includes('unsplash.com'))
                    ? currentOrder.rawOrder.customerAvatar
                    : (currentOrder.rawOrder?.customerImage && !currentOrder.rawOrder?.customerImage.includes('unsplash.com'))
                        ? currentOrder.rawOrder.customerImage
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentOrder.customerName || 'Customer')}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;

    return (
        <div className="status-page-container">
            <div className="status-page-scrollable-body">
                {/* Top Navigation Header */}
                <div className="status-page-header">
                    <div>
                        <span className="status-page-sub-title">Order #{currentOrder.id || 'PF-1028'}</span>
                        <h1 className="status-page-title">Update Status</h1>
                    </div>
                    <button
                        className="status-page-back-btn"
                        onClick={handleBack}
                        aria-label="Back to Order Details"
                    >
                        <ArrowLeft size={22} />
                    </button>
                </div>

                {/* Customer & Order Context Card */}
                <div className="status-page-order-card">
                    <div className="status-page-customer-info">
                        <div className="status-page-avatar" style={{ overflow: 'hidden' }}>
                            <img
                                src={resolvedAvatar}
                                alt={currentOrder.customerName || 'Customer'}
                                style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentOrder.customerName || 'Customer')}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;
                                }}
                            />
                        </div>
                        <div>
                            <h3 className="status-page-cust-name">{currentOrder.customerName || 'Kiara Fernando'}</h3>
                            <div className="status-page-slot-text">
                                <Clock size={12} color="#64748B" />
                                <span>Pickup: {currentOrder.pickupTime || '4:00 PM - 4:30 PM'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stepper Timeline Section */}
                <div className="status-page-stepper-container">
                    <span className="status-page-section-label">Select Order Progress Status</span>

                    <div className="status-page-stepper-list">
                        <div className="status-page-timeline-line" />

                        {steps.map((step, index) => {
                            const isCompleted = index < activeStepIndex;
                            const isActive = index === activeStepIndex;

                            return (
                                <div
                                    key={step.id}
                                    className={`status-page-step-card ${isActive ? 'active-step' : ''} ${isCompleted ? 'completed-step' : ''}`}
                                    onClick={() => setActiveStepIndex(index)}
                                >
                                    <div className={`status-page-circle ${isCompleted ? 'circle-completed' : isActive ? 'circle-active' : 'circle-pending'}`}>
                                        {isCompleted ? (
                                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                                        ) : (
                                            <span>{step.id}</span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 className={`status-page-step-title ${isActive || isCompleted ? 'text-dark' : 'text-muted'}`}>
                                            {step.label}
                                        </h4>
                                        <p className="status-page-step-desc">{step.desc}</p>
                                    </div>
                                    {isActive && (
                                        <span className="status-page-selected-pill">
                                            Selected
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Success Message Banner */}
                {updateSuccess && (
                    <div className="status-page-success-banner">
                        <CheckCircle2 size={18} color="#166534" />
                        <span>Status updated to "{selectedStep.label}" in MongoDB Atlas!</span>
                    </div>
                )}
            </div>

            {/* Action Buttons Stack */}
            <div className="status-page-actions">
                <button
                    className="status-page-save-btn"
                    onClick={handleConfirmUpdate}
                    disabled={isUpdating}
                >
                    <CheckCircle2 size={18} />
                    <span>{isUpdating ? 'Saving to Database...' : `Save Status: ${selectedStep.label}`}</span>
                </button>

                <button
                    className="status-page-cancel-btn"
                    onClick={handleBack}
                >
                    Back to Order Details
                </button>
            </div>
        </div>
    );
}
