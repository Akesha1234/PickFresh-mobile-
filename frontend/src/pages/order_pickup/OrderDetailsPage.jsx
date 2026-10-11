import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Phone, User, Package, RefreshCw, CheckCircle2, Store } from 'lucide-react';
import StatusUpdateModal from './StatusUpdateModal';
import './OrderDetailsPage.css';

export default function OrderDetailsPage({ onNavigate, order }) {
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(order || {
        id: 'PF-1028',
        customerName: 'Kiara Fernando',
        phone: '0772345445',
        pickupTime: '4:00 PM - 4:30 PM',
        status: 'PENDING',
        items: []
    });

    useEffect(() => {
        if (order) {
            const initialAvatar = order.customerAvatar || order.customerImage || (order.rawOrder && (order.rawOrder.customerAvatar || order.rawOrder.customerImage)) || '';
            setCurrentOrder(prev => ({
                ...prev,
                ...order,
                customerAvatar: initialAvatar || prev.customerAvatar || '',
                customerImage: initialAvatar || prev.customerImage || ''
            }));
            const targetId = order.dbId || order._id || order.id || order.orderNumber;
            if (targetId) {
                fetch(`http://localhost:5000/api/orders/${targetId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.order) {
                            const fetchedAvatar = data.order.customerAvatar || data.order.customerImage || '';
                            setCurrentOrder(prev => ({
                                ...prev,
                                status: data.order.status || prev.status,
                                dbId: data.order._id || prev.dbId,
                                customerAvatar: fetchedAvatar || prev.customerAvatar || initialAvatar,
                                customerImage: fetchedAvatar || prev.customerImage || initialAvatar,
                                customerName: data.order.customerName || prev.customerName,
                                phone: data.order.customerPhone || prev.phone,
                                pickupTime: data.order.pickupTimeSlot || prev.pickupTime,
                                rawOrder: data.order
                            }));
                        }
                    })
                    .catch(err => console.warn('Order status sync error:', err));
            }
        }
    }, [order]);

    // Format dynamic items safely preventing duplicate unit text like (1kg) (1kg)
    const rawItems = currentOrder.items || (currentOrder.rawOrder && currentOrder.rawOrder.items) || [];

    const formattedItems = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems.map(it => {
        if (typeof it === 'string') {
            return { name: it, quantity: 1 };
        }
        let name = it.name || 'Grocery Item';
        const qty = it.quantity || 1;
        const unit = (it.unit || '').trim();
        if (unit && !name.toLowerCase().includes(unit.toLowerCase())) {
            name = `${name} (${unit})`;
        }
        return {
            name,
            quantity: qty,
            price: it.price ? `Rs. ${(it.price * qty).toLocaleString()}` : null,
            image: it.image || it.productImage || (it.product && it.product.image) || null
        };
    }) : [
        { name: 'Fresh Milk (1L)', quantity: 1, price: 'Rs. 450' },
        { name: 'Keeri Samba Rice (5kg)', quantity: 1, price: 'Rs. 1,450' }
    ];

    const getStatusBadgeConfig = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (s.includes('collect') || s.includes('complete')) {
            return { bg: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE', label: 'COLLECTED' };
        }
        if (s.includes('ready')) {
            return { bg: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', label: 'READY FOR PICKUP' };
        }
        if (s.includes('prep') || s.includes('pack')) {
            return { bg: '#E0E7FF', color: '#3730A3', border: '1px solid #A5B4FC', label: 'PREPARING' };
        }
        if (s.includes('accept')) {
            return { bg: '#DBEAFE', color: '#1E40AF', border: '1px solid #93C5FD', label: 'ACCEPTED' };
        }
        if (s.includes('cancel')) {
            return { bg: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', label: 'CANCELLED' };
        }
        return { bg: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', label: 'PENDING' };
    };

    const badge = getStatusBadgeConfig(currentOrder.status);

    const handleUpdateStatusConfirm = async (orderId, newStatus) => {
        try {
            const targetId = currentOrder.dbId || currentOrder.id || orderId;
            const res = await fetch(`http://localhost:5000/api/orders/${targetId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCurrentOrder(prev => ({ ...prev, status: newStatus }));
            } else {
                setCurrentOrder(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            console.error('Failed to update status in MongoDB:', err);
            setCurrentOrder(prev => ({ ...prev, status: newStatus }));
        }
        setIsStatusModalOpen(false);
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('dashboard');
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
        <div className="order-details-container">
            {/* 🔝 Top Navigation Bar */}
            <div className="order-details-header">
                <div>
                    <span className="order-details-sub-tag">Order Details</span>
                    <h1 className="order-details-page-title">
                        Order #{currentOrder.id || 'PF-1028'}
                    </h1>
                </div>
                <button
                    className="order-details-back-btn"
                    onClick={handleBack}
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="order-details-scrollable-body">
                {/* Current Status Banner */}
                <div className="order-details-status-banner" style={{ backgroundColor: badge.bg, border: badge.border }}>
                    <span className="order-details-status-text" style={{ color: badge.color }}>
                        Current Status: <strong>{badge.label}</strong>
                    </span>
                </div>

                {/* Customer Information Card */}
                <div className="order-details-card">
                    <span className="order-details-card-label">Customer Information</span>
                    <div className="order-details-customer-row">
                        <div className="order-details-avatar">
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
                        <div style={{ flex: 1 }}>
                            <h3 className="order-details-customer-name">
                                {currentOrder.customerName || 'Kiara Fernando'}
                            </h3>
                            <div className="order-details-phone-row">
                                <Phone size={13} color="#64748B" />
                                <span>{currentOrder.phone || '0772345445'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="order-details-items-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="order-details-section-title">Ordered Items</h2>
                        <span className="order-items-count-badge">
                            {formattedItems.length} {formattedItems.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>

                    <div className="order-details-items-list">
                        {formattedItems.map((item, index) => (
                            <div key={index} className="order-details-item-card">
                                <div className="order-item-left">
                                    <div className="order-item-icon-box" style={{ overflow: 'hidden', padding: 0, width: '42px', height: '42px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=100&auto=format&fit=crop&q=80';
                                                }}
                                            />
                                        ) : (
                                            <Package size={20} color="#27672D" />
                                        )}
                                    </div>
                                    <div>
                                        <span className="order-item-title">{item.name}</span>
                                        {item.price && <span className="order-item-price">{item.price}</span>}
                                    </div>
                                </div>
                                <span className="order-item-qty-badge">
                                    × {item.quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pickup Schedule Banner */}
                <div className="order-details-pickup-card">
                    <div className="pickup-card-icon-box">
                        <Clock size={20} color="#27672D" />
                    </div>
                    <div>
                        <span className="pickup-card-label">Scheduled Pickup Slot</span>
                        <h4 className="pickup-card-time">{currentOrder.pickupTime || '4:00 PM - 4:30 PM'}</h4>
                    </div>
                </div>
            </div>

            {/* Action Buttons Stack (Anchored at Bottom) */}
            <div className="order-details-actions-group">
                <button
                    className="order-details-update-btn"
                    onClick={() => onNavigate && onNavigate('status_update', {
                        order: {
                            ...currentOrder,
                            customerAvatar: resolvedAvatar,
                            customerImage: resolvedAvatar
                        }
                    })}
                >
                    <RefreshCw size={18} />
                    <span>Update order status</span>
                </button>

                <button
                    className="order-details-dashboard-btn"
                    onClick={handleBack}
                >
                    <ArrowLeft size={18} />
                    <span>Back to Dashboard</span>
                </button>
            </div>
        </div>
    );
}
