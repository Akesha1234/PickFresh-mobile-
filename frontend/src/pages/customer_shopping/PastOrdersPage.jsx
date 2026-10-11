import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Clock,
    MapPin,
    CheckCircle2,
    RotateCcw,
    Search,
    Package,
    X,
    ShoppingBag,
    Calendar,
    XCircle,
    Check,
    Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './PastOrdersPage.css';

export default function PastOrdersPage({ onNavigate, addToCart }) {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [ordersList, setOrdersList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch live orders directly from MongoDB Atlas Database with product image mapping for logged-in user
    useEffect(() => {
        let isMounted = true;

        const fetchOrders = async (isFirst = false) => {
            if (isFirst) {
                setIsLoading(true);
            }
            try {
                // Clean base name helper by stripping portion tags like (1kg), (250g)
                const getCleanName = (str) => {
                    if (!str) return '';
                    return str.replace(/\s*\([\d\sA-Za-z]+\)/g, '').trim().toLowerCase();
                };

                // Stop fetch if no user context to prevent fetching all orders
                if (!user || (!user.email && !user._id && !user.id && !user.name && !user.fullName)) {
                    setOrdersList([]);
                    if (isFirst && isMounted) setIsLoading(false);
                    return;
                }

                const queryParams = new URLSearchParams();
                if (user?.email) queryParams.append('customerEmail', user.email);
                if (user?._id || user?.id) queryParams.append('customerId', user._id || user.id);
                if (user?.name || user?.fullName) queryParams.append('customerName', user.name || user.fullName);

                const ordersUrl = `http://localhost:5000/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

                // Fetch orders and product catalog concurrently in parallel for 3x faster loading
                const [ordersRes, prodRes] = await Promise.all([
                    fetch(ordersUrl).catch(() => null),
                    fetch('http://localhost:5000/api/product-inventory/products').catch(() => null)
                ]);

                let productImageMap = {};
                if (prodRes && prodRes.ok) {
                    try {
                        const prodData = await prodRes.json();
                        if (prodData.success && Array.isArray(prodData.products)) {
                            prodData.products.forEach(p => {
                                if (p.name) {
                                    const fullKey = p.name.trim().toLowerCase();
                                    const baseKey = getCleanName(p.name);
                                    const imgUrl = p.image || p.imageUrl;
                                    if (imgUrl) {
                                        productImageMap[fullKey] = imgUrl;
                                        productImageMap[baseKey] = imgUrl;
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Error parsing products catalog:', e);
                    }
                }

                if (ordersRes && ordersRes.ok) {
                    const data = await ordersRes.json();
                    if (data.success && Array.isArray(data.orders) && isMounted) {
                        // Map MongoDB order object to UI model
                        const formatted = data.orders.map(o => ({
                            id: o.orderNumber || `PF-${o._id ? String(o._id).slice(-4) : '1024'}`,
                            dbId: o._id,
                            date: o.pickupTimeSlot ? `${o.pickupDate || 'Today'}, ${o.pickupTimeSlot}` : (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Today'),
                            rawDate: o.createdAt || new Date().toISOString(),
                            store: o.pickupStore || 'PickFresh Super',
                            pickupCounter: 'Express Pickup Counter',
                            status: o.status || 'Pending',
                            paymentMethod: o.paymentStatus || 'Pay at Pickup',
                            items: (o.items && o.items.length > 0) ? o.items.map(it => {
                                const fullKey = it.name ? it.name.trim().toLowerCase() : '';
                                const baseKey = getCleanName(it.name);
                                const catalogImg = productImageMap[fullKey] || productImageMap[baseKey];

                                let categoryFallback = '/cat_veg.png';
                                if (fullKey.includes('fruit') || fullKey.includes('mangosteen') || fullKey.includes('avocado') || fullKey.includes('grape') || fullKey.includes('apple') || fullKey.includes('banana') || fullKey.includes('mango') || fullKey.includes('orange') || fullKey.includes('strawberry')) {
                                    categoryFallback = '/cat_fruits.png';
                                } else if (fullKey.includes('milk') || fullKey.includes('dairy') || fullKey.includes('cheese') || fullKey.includes('butter') || fullKey.includes('highland')) {
                                    categoryFallback = '/highland_milk.png';
                                } else if (fullKey.includes('rice') || fullKey.includes('grain') || fullKey.includes('samba') || fullKey.includes('suwandel')) {
                                    categoryFallback = '/cat_rice.png';
                                } else if (fullKey.includes('bread') || fullKey.includes('bakery') || fullKey.includes('bun') || fullKey.includes('cake')) {
                                    categoryFallback = '/cat_bakery.png';
                                } else if (fullKey.includes('bev') || fullKey.includes('drink') || fullKey.includes('juice') || fullKey.includes('coke') || fullKey.includes('soda')) {
                                    categoryFallback = '/cat_bev.png';
                                }

                                const resolvedImage = (it.image && it.image !== '/cat_veg.png')
                                    ? it.image
                                    : (catalogImg || categoryFallback);

                                return {
                                    id: it._id || it.product || `item_${Math.random()}`,
                                    name: it.name,
                                    brand: it.brand || 'Fresh',
                                    price: Number(it.price) || 0,
                                    quantity: Number(it.quantity) || 1,
                                    image: resolvedImage
                                };
                            }) : [
                                { id: 'p0', name: 'Grocery Item', brand: 'PickFresh', price: Number(o.totalAmount) || 500, quantity: 1, image: '/cat_veg.png' }
                            ],
                            totalAmount: Number(o.totalAmount) || 0
                        }));
                        setOrdersList(formatted);
                    }
                }
            } catch (err) {
                console.warn('Backend past orders connection error:', err.message);
            } finally {
                if (isFirst && isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchOrders(true);

        // 1-second ultra fast polling interval & focus trigger for instant real-time sync
        const interval = setInterval(() => {
            fetchOrders(false);
        }, 1000);

        const handleFocus = () => {
            fetchOrders(false);
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [user?.email, user?.name, user?._id]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleReorder = (e, order) => {
        e.stopPropagation();
        if (addToCart && order.items) {
            order.items.forEach(item => {
                addToCart(item, item.quantity);
            });
            showToast(`Added items from #${order.id} to cart!`);
        } else {
            showToast(`Reordered #${order.id} items successfully!`);
        }
    };

    const isCompletedStatus = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        return s === 'completed' || s === 'collected';
    };

    const isCancelledStatus = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        return s === 'cancelled' || s.includes('cancel');
    };

    const filteredOrders = ordersList.filter(order => {
        // Filter tab
        if (activeFilter === 'completed' && !isCompletedStatus(order.status)) return false;
        if (activeFilter === 'cancelled' && !isCancelledStatus(order.status)) return false;

        // Search query
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchId = order.id.toLowerCase().includes(query);
            const matchStore = order.store.toLowerCase().includes(query);
            const matchItem = order.items.some(i => i.name.toLowerCase().includes(query));
            return matchId || matchStore || matchItem;
        }

        return true;
    });

    return (
        <div className="past-orders-container">
            {/* Header */}
            <div className="past-orders-header">
                <div className="header-title-group">
                    <h1 className="past-orders-title">My Orders</h1>
                    <span className="past-orders-subtitle">View and manage your pre-orders</span>
                </div>
                <button
                    className="past-orders-back-btn"
                    onClick={() => onNavigate && onNavigate('profile')}
                    aria-label="Back to Profile"
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </button>
            </div>

            {/* Toast Banner */}
            {toastMessage && (
                <div className="orders-toast">
                    <CheckCircle2 size={18} color="#166534" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Search Input Bar */}
            <div className="orders-search-wrapper">
                <Search size={18} color="#64748B" className="search-icon" />
                <input
                    type="text"
                    className="orders-search-input"
                    placeholder="Search by Order #, Store, or Item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                        <X size={14} color="#64748B" />
                    </button>
                )}
            </div>

            {/* Filter Chips */}
            <div className="orders-filter-chips">
                <button
                    className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    All ({ordersList.length})
                </button>
                <button
                    className={`filter-chip ${activeFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('completed')}
                >
                    Completed ({ordersList.filter(o => isCompletedStatus(o.status)).length})
                </button>
                <button
                    className={`filter-chip ${activeFilter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('cancelled')}
                >
                    Cancelled ({ordersList.filter(o => isCancelledStatus(o.status)).length})
                </button>
            </div>

            {/* Past Orders List */}
            <div className="past-orders-list">
                {isLoading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Loader2 size={24} className="spin-animate" color="#2D7B38" />
                        <span>Loading order history from database...</span>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="no-orders-empty">
                        <ShoppingBag size={48} color="#94A3B8" />
                        <h3>No orders found</h3>
                        <p>We couldn't find any orders matching your search or filter.</p>
                        <button
                            className="btn-reset-filter"
                            onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                        >
                            Reset filters
                        </button>
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div
                            key={order.id}
                            className="order-card"
                            onClick={() => setSelectedOrder(order)}
                        >
                            {/* Card Top Row */}
                            <div className="order-card-top">
                                <div className="order-num-group">
                                    <span className="order-id">#{order.id}</span>
                                    <span className="order-date">{order.date}</span>
                                </div>
                                <span className={`status-badge ${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {isCompletedStatus(order.status) ? (
                                        <CheckCircle2 size={13} color="#166534" />
                                    ) : isCancelledStatus(order.status) ? (
                                        <XCircle size={13} color="#991B1B" />
                                    ) : (
                                        <Clock size={13} color="#D97706" />
                                    )}
                                    {order.status}
                                </span>
                            </div>

                            {/* Store Info */}
                            <div className="order-store-row">
                                <MapPin size={15} color="#2D7B38" />
                                <span className="order-store-name">{order.store}</span>
                                <span className="dot-divider">•</span>
                                <span className="order-counter">{order.pickupCounter}</span>
                            </div>

                            {/* Items Thumbnails Preview */}
                            <div className="order-items-preview">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="preview-item-chip">
                                        <img
                                            src={item.image || '/cat_veg.png'}
                                            alt={item.name}
                                            className="preview-item-img"
                                            onError={(e) => { e.target.src = '/cat_veg.png'; }}
                                        />
                                        <div className="preview-item-details">
                                            <span className="preview-item-name">{item.name}</span>
                                            <span className="preview-item-qty">Qty: {item.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Card Summary & Actions */}
                            <div className="order-card-bottom">
                                <div className="total-summary">
                                    <span className="total-label">Total Amount</span>
                                    <span className="total-val">Rs. {order.totalAmount.toLocaleString()}</span>
                                </div>

                                {!isCompletedStatus(order.status) && !isCancelledStatus(order.status) && (
                                    <div className="card-actions-row">
                                        <button
                                            className="btn-reorder"
                                            style={{ backgroundColor: '#2D7B38', color: '#fff' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigate && onNavigate('track', { _id: order.dbId, orderNumber: order.id, pickupStore: order.store, pickupTimeSlot: order.date, status: order.status });
                                            }}
                                            title="Track this order"
                                        >
                                            <Clock size={14} />
                                            Track Order
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Details Bottom Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-sheet-header">
                            <div>
                                <h3 className="modal-title">Order Details</h3>
                                <span className="modal-subtitle">#{selectedOrder.id}</span>
                            </div>
                            <button className="modal-close-btn" onClick={() => setSelectedOrder(null)}>
                                <X size={20} color="#64748B" />
                            </button>
                        </div>

                        <div className="modal-body-scroll">
                            {/* Status and Date banner */}
                            <div className="modal-info-card">
                                <div className="info-card-row">
                                    <span className="info-card-label">Status</span>
                                    <span className={`status-badge ${selectedOrder.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div className="info-card-row">
                                    <span className="info-card-label">Order Date</span>
                                    <span className="info-card-value">{selectedOrder.date}</span>
                                </div>
                                <div className="info-card-row">
                                    <span className="info-card-label">Pickup Location</span>
                                    <span className="info-card-value">{selectedOrder.store}</span>
                                </div>
                                <div className="info-card-row">
                                    <span className="info-card-label">Payment</span>
                                    <span className="info-card-value">{selectedOrder.paymentMethod}</span>
                                </div>
                            </div>

                            {/* Itemized List */}
                            <div className="modal-items-section">
                                <h4 className="section-label">Ordered Items ({selectedOrder.items.length})</h4>
                                <div className="items-list-box">
                                    {selectedOrder.items.map((item, idx) => (
                                        <div key={idx} className="modal-item-row">
                                            <img
                                                src={item.image || '/cat_veg.png'}
                                                alt={item.name}
                                                className="modal-item-img"
                                                onError={(e) => { e.target.src = '/cat_veg.png'; }}
                                            />
                                            <div className="modal-item-info">
                                                <span className="modal-item-name">{item.name}</span>
                                                <span className="modal-item-sub">{item.brand || 'Fresh'} • Rs. {item.price} each</span>
                                            </div>
                                            <div className="modal-item-total">
                                                <span className="modal-qty">x{item.quantity}</span>
                                                <span className="modal-price">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total summary breakdown */}
                            <div className="modal-total-box">
                                <div className="summary-line">
                                    <span>Subtotal</span>
                                    <span>Rs. {selectedOrder.totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="summary-line">
                                    <span>Pickup Counter Fee</span>
                                    <span className="free-text">FREE</span>
                                </div>
                                <div className="summary-line total-bold">
                                    <span>Total Paid</span>
                                    <span className="grand-total">Rs. {selectedOrder.totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="modal-footer-actions">
                            {isCompletedStatus(selectedOrder.status) && (
                                <button
                                    className="btn-modal-reorder"
                                    onClick={(e) => {
                                        handleReorder(e, selectedOrder);
                                        setSelectedOrder(null);
                                    }}
                                >
                                    <RotateCcw size={18} />
                                    Reorder All Items
                                </button>
                            )}
                            {!isCompletedStatus(selectedOrder.status) && !isCancelledStatus(selectedOrder.status) && (
                                <button
                                    className="btn-modal-reorder"
                                    style={{ backgroundColor: '#2D7B38' }}
                                    onClick={() => {
                                        onNavigate && onNavigate('track', { _id: selectedOrder.dbId, orderNumber: selectedOrder.id, pickupStore: selectedOrder.store, pickupTimeSlot: selectedOrder.date, status: selectedOrder.status });
                                        setSelectedOrder(null);
                                    }}
                                >
                                    <Clock size={18} />
                                    Track Order
                                </button>
                            )}
                            <button className="btn-modal-close" onClick={() => setSelectedOrder(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bottom-spacer"></div>
        </div>
    );
}
