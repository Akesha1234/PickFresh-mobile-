import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Calendar, ChevronRight, Store, Package, UserCheck, RefreshCw, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './OrderDashboard.css';

export default function OrderDashboard({ onNavigate, storeName: initialStoreName }) {
    const { user } = useAuth();
    const registeredStore = user?.shopName || user?.name || initialStoreName || 'PickFresh Super • Main Counter';

    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
    const [activeOrdersList, setActiveOrdersList] = useState([]);
    const [pastOrdersCount, setPastOrdersCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboardOrders = async () => {
        try {
            // Pass the shop's registered name to the backend for precise store-level filtering
            const queryParams = new URLSearchParams();
            if (registeredStore) queryParams.append('storeName', registeredStore);

            const res = await fetch(`http://localhost:5000/api/orders?${queryParams.toString()}`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.orders)) {
                // Secondary strict filter on frontend as safety net
                const cleanRegistered = (registeredStore || '').split('•')[0].split('-')[0].trim().toLowerCase();
                let shopOrders = data.orders;

                if (cleanRegistered) {
                    shopOrders = data.orders.filter(o => {
                        const pStore = (o.pickupStore || '').toLowerCase();
                        return pStore.includes(cleanRegistered) || cleanRegistered.includes(pStore.split('•')[0].trim());
                    });
                }

                // Do NOT fall back to all orders — only show orders for this store
                setOrders(shopOrders);

                const pending = shopOrders.filter(o => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'pending' || s.includes('new');
                }).length;

                const preparing = shopOrders.filter(o => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'preparing' || s.includes('pack') || s === 'accepted';
                }).length;

                const ready = shopOrders.filter(o => {
                    const s = (o.status || '').toLowerCase();
                    return s.includes('ready');
                }).length;

                setStats({ pending, preparing, ready });

                // Active pre-orders: ONLY Pending, Accepted, Preparing, Ready for Pickup
                const activeList = shopOrders.filter(o => {
                    const s = (o.status || '').toLowerCase();
                    return s !== 'completed' && s !== 'cancelled' && s !== 'collected';
                });

                // Past orders count (Collected, Completed, Cancelled)
                const pastCount = shopOrders.filter(o => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'collected' || s === 'completed' || s === 'cancelled';
                }).length;

                setActiveOrdersList(activeList);
                setPastOrdersCount(pastCount);
            }
        } catch (err) {
            console.warn('Backend dashboard fetch error:', err.message);
        }
    };

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        fetchDashboardOrders().finally(() => setTimeout(() => setIsRefreshing(false), 500));
    };

    useEffect(() => {
        fetchDashboardOrders();
        // Polling every 3 seconds to keep backend orders live in real time
        const interval = setInterval(fetchDashboardOrders, 3000);
        return () => clearInterval(interval);
    }, [registeredStore]);

    const getStatusBadgeConfig = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (s === 'collected' || s === 'completed') {
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

    const handleOpenOrder = (orderObj) => {
        if (onNavigate) {
            const avatarUrl = orderObj.customerAvatar || orderObj.customerImage || (orderObj.rawOrder && (orderObj.rawOrder.customerAvatar || orderObj.rawOrder.customerImage)) || '';
            const formattedOrder = {
                id: orderObj.orderNumber || (orderObj._id ? `PF-${String(orderObj._id).slice(-4)}` : 'PF-1028'),
                dbId: orderObj._id,
                customerName: orderObj.customerName || 'Customer',
                customerAvatar: avatarUrl,
                customerImage: avatarUrl,
                pickupTime: orderObj.pickupTimeSlot || 'Scheduled Pickup',
                itemsCount: orderObj.items ? orderObj.items.length : 1,
                items: orderObj.items || [],
                status: (orderObj.status || 'PENDING').toUpperCase(),
                phone: orderObj.customerPhone || '0771234567',
                totalAmount: `Rs. ${(orderObj.totalAmount || 0).toLocaleString()}`,
                rawOrder: orderObj
            };
            onNavigate('order_details', { order: formattedOrder });
        }
    };

    const handleViewPickupSchedule = () => {
        if (onNavigate) {
            onNavigate('pickup_schedule');
        }
    };

    const handleViewPastOrders = () => {
        if (onNavigate) {
            onNavigate('past_orders');
        }
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('home');
        }
    };

    return (
        <div className="op-dashboard-container">
            {/* Header Title Row */}
            <div className="op-title-row">
                <div>
                    <h1 className="op-page-title">Order dashboard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Store size={14} color="#27672D" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#27672D' }}>{registeredStore}</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: '6px' }}>
                            LIVE DB
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        className="op-refresh-btn"
                        onClick={handleManualRefresh}
                        title="Refresh live orders"
                        style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <RefreshCw size={18} color="#475569" className={isRefreshing ? 'spin-animate' : ''} />
                    </button>
                    <button
                        className="op-back-btn"
                        onClick={handleBack}
                        aria-label="Back to home"
                    >
                        <ArrowLeft size={22} />
                    </button>
                </div>
            </div>

            {/* 3 Metric Stat Cards Row */}
            <div className="op-stats-row">
                <div className="op-stat-card-item pending-card">
                    <span className="op-stat-num pending-num">{stats.pending}</span>
                    <span className="op-stat-label">Pending</span>
                </div>

                <div className="op-stat-card-item preparing-card">
                    <span className="op-stat-num preparing-num">{stats.preparing}</span>
                    <span className="op-stat-label">Preparing</span>
                </div>

                <div className="op-stat-card-item ready-card">
                    <span className="op-stat-num ready-num">{stats.ready}</span>
                    <span className="op-stat-label">Ready</span>
                </div>
            </div>

            {/* Next pickup / Active Orders Section */}
            <div className="op-next-pickup-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className="op-section-title" style={{ margin: 0 }}>Active Pre-Orders</h2>
                        {activeOrdersList.length > 0 && (
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#27672D', background: '#E8F5E9', padding: '3px 10px', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
                                {activeOrdersList.length} Active
                            </span>
                        )}
                    </div>
                    <button
                        className="op-view-past-btn"
                        onClick={handleViewPastOrders}
                    >
                        <History size={14} />
                        <span>View Past Orders ({pastOrdersCount})</span>
                    </button>
                </div>

                {activeOrdersList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {activeOrdersList.map((orderObj, index) => {
                            const orderIdDisplay = orderObj.orderNumber || (orderObj._id ? `PF-${String(orderObj._id).slice(-4)}` : `PF-102${index + 4}`);
                            const badge = getStatusBadgeConfig(orderObj.status);
                            const totalAmountDisplay = orderObj.totalAmount ? `Rs. ${(orderObj.totalAmount).toLocaleString()}` : '';
                            const itemsCount = orderObj.items ? orderObj.items.length : 1;

                            return (
                                <div key={orderObj._id || index} className="op-pickup-card-enhanced">
                                    <div className="op-card-header-row">
                                        <div className="op-card-title-group">
                                            <div className="op-avatar-circle">
                                                <img
                                                    src={
                                                        (orderObj.customerAvatar && !orderObj.customerAvatar.includes('unsplash.com'))
                                                            ? orderObj.customerAvatar
                                                            : (orderObj.customerImage && !orderObj.customerImage.includes('unsplash.com'))
                                                                ? orderObj.customerImage
                                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(orderObj.customerName || 'Customer')}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`
                                                    }
                                                    alt={orderObj.customerName || 'Customer'}
                                                    style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(orderObj.customerName || 'Customer')}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="op-pickup-card-header">
                                                    #{orderIdDisplay}
                                                </h3>
                                                <span className="op-customer-name-sub">
                                                    {orderObj.customerName || 'Customer'}
                                                </span>
                                            </div>
                                        </div>
                                        {totalAmountDisplay && (
                                            <span className="op-card-price-badge">
                                                {totalAmountDisplay}
                                            </span>
                                        )}
                                    </div>

                                    <div className="op-card-details-row">
                                        <div className="op-detail-chip">
                                            <Clock size={13} color="#64748B" />
                                            <span>{orderObj.pickupTimeSlot || '4:00 PM - 4:30 PM'}</span>
                                        </div>
                                        <div className="op-detail-chip">
                                            <Package size={13} color="#64748B" />
                                            <span>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                                        </div>
                                    </div>

                                    <div className="op-pickup-card-footer-enhanced">
                                        <span className="op-status-badge-dynamic" style={{
                                            backgroundColor: badge.bg,
                                            color: badge.color,
                                            border: badge.border
                                        }}>
                                            {badge.label}
                                        </span>
                                        <button
                                            className="op-open-order-btn-enhanced"
                                            onClick={() => handleOpenOrder(orderObj)}
                                        >
                                            <span>Open order</span>
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px dashed #CBD5E1', padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13.5px', fontWeight: '600' }}>
                        No active pre-orders right now. New customer pre-orders for your shop will appear here in real time.
                    </div>
                )}
            </div>

            {/* Shop Owner Time Slot Capacity & Schedule Management Banner */}
            <div className="op-schedule-manage-section">
                <div className="op-schedule-card" onClick={handleViewPickupSchedule}>
                    <div className="op-schedule-card-left">
                        <div className="op-schedule-icon-box">
                            <Clock size={20} color="#27672D" />
                        </div>
                        <div>
                            <h3 className="op-schedule-card-title">Pickup schedule & slots</h3>
                            <p className="op-schedule-card-sub">Manage store capacity limits & busy times</p>
                        </div>
                    </div>
                    <div className="op-schedule-card-right">
                        <span className="op-schedule-btn-text">Manage</span>
                        <ChevronRight size={18} color="#27672D" />
                    </div>
                </div>
            </div>
        </div>
    );
}
