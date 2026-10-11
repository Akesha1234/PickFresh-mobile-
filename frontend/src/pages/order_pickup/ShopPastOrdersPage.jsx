import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, History, Package, Search, UserCheck, ChevronRight, Store, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ShopPastOrdersPage.css';

export default function ShopPastOrdersPage({ onNavigate, storeName: initialStoreName }) {
    const { user } = useAuth();
    const registeredStore = user?.shopName || user?.name || initialStoreName || 'PickFresh Super • Main Counter';

    const [pastOrders, setPastOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'COLLECTED' | 'CANCELLED'
    const [isLoading, setIsLoading] = useState(true);

    const fetchPastOrders = async () => {
        try {
            const queryParams = new URLSearchParams();
            if (registeredStore) queryParams.append('storeName', registeredStore);

            const res = await fetch(`http://localhost:5000/api/orders?${queryParams.toString()}`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.orders)) {
                const cleanRegistered = (registeredStore || '').split('•')[0].split('-')[0].trim().toLowerCase();
                let shopOrders = data.orders;

                if (cleanRegistered) {
                    shopOrders = data.orders.filter(o => {
                        const pStore = (o.pickupStore || '').toLowerCase();
                        return pStore.includes(cleanRegistered) || cleanRegistered.includes(pStore.split('•')[0].trim());
                    });
                }

                // Filter ONLY past orders (Collected, Completed, Cancelled)
                const pastList = shopOrders.filter(o => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'collected' || s === 'completed' || s === 'cancelled';
                });

                setPastOrders(pastList);
            }
        } catch (err) {
            console.warn('Past orders fetch error:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPastOrders();
    }, [registeredStore]);

    useEffect(() => {
        let result = pastOrders;

        if (activeFilter === 'COLLECTED') {
            result = result.filter(o => {
                const s = (o.status || '').toLowerCase();
                return s === 'collected' || s === 'completed';
            });
        } else if (activeFilter === 'CANCELLED') {
            result = result.filter(o => (o.status || '').toLowerCase() === 'cancelled');
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o => {
                const idStr = (o.orderNumber || o._id || '').toLowerCase();
                const custName = (o.customerName || '').toLowerCase();
                return idStr.includes(q) || custName.includes(q);
            });
        }

        setFilteredOrders(result);
    }, [searchQuery, activeFilter, pastOrders]);

    const getStatusBadge = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (s === 'collected' || s === 'completed') {
            return { bg: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE', label: 'COLLECTED', icon: CheckCircle2 };
        }
        if (s === 'cancelled') {
            return { bg: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', label: 'CANCELLED', icon: XCircle };
        }
        return { bg: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', label: (statusStr || 'PAST').toUpperCase(), icon: History };
    };

    const handleOpenOrderDetails = (orderObj) => {
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
                status: (orderObj.status || 'COLLECTED').toUpperCase(),
                phone: orderObj.customerPhone || '0771234567',
                totalAmount: `Rs. ${(orderObj.totalAmount || 0).toLocaleString()}`,
                rawOrder: orderObj
            };
            onNavigate('order_details', { order: formattedOrder });
        }
    };

    return (
        <div className="shop-past-orders-container">
            {/* Header Title Row matching back-button right standardization */}
            <div className="shop-past-title-row">
                <div>
                    <h1 className="shop-past-page-title">Past Orders</h1>
                    <div className="shop-past-store-sub">
                        <Store size={14} color="#27672D" />
                        <span>{registeredStore}</span>
                    </div>
                </div>
                <button
                    className="shop-past-back-btn"
                    onClick={() => onNavigate && onNavigate('dashboard')}
                    aria-label="Back to order dashboard"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="shop-past-search-box">
                <Search size={18} color="#64748B" />
                <input
                    type="text"
                    placeholder="Search by order # or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="shop-past-search-input"
                />
            </div>

            {/* Filter Tabs */}
            <div className="shop-past-filter-tabs">
                <button
                    className={`shop-past-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('ALL')}
                >
                    All ({pastOrders.length})
                </button>
                <button
                    className={`shop-past-tab ${activeFilter === 'COLLECTED' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('COLLECTED')}
                >
                    Collected ({pastOrders.filter(o => ['collected', 'completed'].includes((o.status || '').toLowerCase())).length})
                </button>
                <button
                    className={`shop-past-tab ${activeFilter === 'CANCELLED' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('CANCELLED')}
                >
                    Cancelled ({pastOrders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length})
                </button>
            </div>

            {/* Orders List Stack */}
            <div className="shop-past-list-container">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((orderObj, index) => {
                        const orderIdDisplay = orderObj.orderNumber || (orderObj._id ? `PF-${String(orderObj._id).slice(-4)}` : `PF-10${index + 20}`);
                        const badge = getStatusBadge(orderObj.status);
                        const BadgeIcon = badge.icon;
                        const totalAmountDisplay = orderObj.totalAmount ? `Rs. ${(orderObj.totalAmount).toLocaleString()}` : '';
                        const itemsCount = orderObj.items ? orderObj.items.length : 1;

                        return (
                            <div key={orderObj._id || index} className="shop-past-card">
                                <div className="shop-past-card-header">
                                    <div className="shop-past-user-group">
                                        <div className="shop-past-avatar">
                                            <img
                                                src={
                                                    (orderObj.customerAvatar && !orderObj.customerAvatar.includes('unsplash.com'))
                                                        ? orderObj.customerAvatar
                                                        : (orderObj.customerImage && !orderObj.customerImage.includes('unsplash.com'))
                                                            ? orderObj.customerImage
                                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(orderObj.customerName || 'Customer')}&background=F3E8FF&color=6B21A8&bold=true&font-size=0.45`
                                                }
                                                alt={orderObj.customerName || 'Customer'}
                                                style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(orderObj.customerName || 'Customer')}&background=F3E8FF&color=6B21A8&bold=true&font-size=0.45`;
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="shop-past-order-id">#{orderIdDisplay}</h3>
                                            <span className="shop-past-cust-name">{orderObj.customerName || 'Customer'}</span>
                                        </div>
                                    </div>
                                    <span className="shop-past-price">{totalAmountDisplay}</span>
                                </div>

                                <div className="shop-past-details-row">
                                    <div className="shop-past-chip">
                                        <Clock size={13} color="#64748B" />
                                        <span>{orderObj.pickupTimeSlot || 'Scheduled Slot'}</span>
                                    </div>
                                    <div className="shop-past-chip">
                                        <Package size={13} color="#64748B" />
                                        <span>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                                    </div>
                                </div>

                                <div className="shop-past-card-footer">
                                    <span className="shop-past-badge" style={{ backgroundColor: badge.bg, color: badge.color, border: badge.border }}>
                                        <BadgeIcon size={13} />
                                        {badge.label}
                                    </span>

                                    <button
                                        className="shop-past-open-btn"
                                        onClick={() => handleOpenOrderDetails(orderObj)}
                                    >
                                        <span>View details</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="shop-past-empty-box">
                        <History size={36} color="#94A3B8" />
                        <h4 style={{ margin: '8px 0 4px', fontSize: '15px', color: '#334155' }}>No Past Orders Found</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                            {pastOrders.length === 0
                                ? 'Orders marked as "Collected" or "Cancelled" will automatically move here.'
                                : 'No orders matched your search or filter.'}
                        </p>
                    </div>
                )}
            </div>

            <div className="bottom-spacer" style={{ height: '80px', flexShrink: 0 }}></div>
        </div>
    );
}
