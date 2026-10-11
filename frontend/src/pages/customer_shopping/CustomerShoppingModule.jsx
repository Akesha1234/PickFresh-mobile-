import React, { useState, useEffect } from 'react';
import { Home, Search, ShoppingCart, User, Bell, ChevronRight, CheckCheck, X, Sparkles, Tag, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomerHomePage from './CustomerHomePage';
import SearchPage from './SearchPage';
import CustomerStoresPage from './CustomerStoresPage';
import ProductDetailsPage from './ProductDetailsPage';
import CartPage from './CartPage';
import PickupSelectionPage from './PickupSelectionPage';
import SmartReplacementPage from './SmartReplacementPage';
import OrderConfirmationPage from './OrderConfirmationPage';
import LiveTrackingPage from './LiveTrackingPage';
import ProfilePage from './ProfilePage';
import PastOrdersPage from './PastOrdersPage';
import NotificationsPage from './NotificationsPage';
import ReadyPickupAlertModal from './ReadyPickupAlertModal';
import './CustomerShoppingModule.css';

export default function CustomerShoppingModule({ initialPage = 'home', onNavigate: propsOnNavigate }) {
    const { user } = useAuth();
    const customerUserId = user?.email || user?._id || user?.id || 'guest_customer';

    const [subPage, setSubPage] = useState(initialPage);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);
    const [itemToReplace, setItemToReplace] = useState(null);
    const [searchCategory, setSearchCategory] = useState('All');
    const [lastOrderDetails, setLastOrderDetails] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [isCartLoading, setIsCartLoading] = useState(false);

    // 1. Fetch live customer cart from MongoDB Atlas Backend
    useEffect(() => {
        const fetchBackendCart = async () => {
            setIsCartLoading(true);
            try {
                const res = await fetch(`http://localhost:5000/api/cart?userId=${encodeURIComponent(customerUserId)}`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.items)) {
                    setCartItems(data.items);
                }
            } catch (err) {
                console.warn('Backend cart fetch connection error:', err.message);
            } finally {
                setIsCartLoading(false);
            }
        };

        fetchBackendCart();
    }, [customerUserId]);

    const handleNavigate = (page, data = null) => {
        if (page === 'order_confirm') {
            if (data) {
                setLastOrderDetails(data);
            }
            // Clear cart in backend on successful checkout
            fetch('http://localhost:5000/api/cart/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: customerUserId })
            }).catch(e => console.warn('Backend cart clear error:', e));

            setCartItems([]);
        }
        // When navigating to track, always update lastOrderDetails with the specific order
        if (page === 'track' || page === 'live_tracking' || page === 'live-tracking') {
            if (data) {
                setLastOrderDetails(data);
            }
        }
        if (page === 'search') {
            if (data && data.category) {
                setSearchCategory(data.category);
            }
            if (data && data.store) {
                setSelectedStore(data.store);
            } else if (data && data.storeName) {
                setSelectedStore({ name: data.storeName, storeName: data.storeName });
            }
        }
        if (page === 'login' || page === 'welcome' || page === 'signup' || page === 'roleselect') {
            if (propsOnNavigate) {
                propsOnNavigate(page, data);
            }
            return;
        }
        setSubPage(page);
    };

    // Real-time backend notification sync & Heartbeat Ready for Pickup alert
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [notificationsList, setNotificationsList] = useState([]);

    const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
    const dismissedAlertsRef = React.useRef(dismissedAlerts);
    dismissedAlertsRef.current = dismissedAlerts;

    const [activeReadyAlertOrder, setActiveReadyAlertOrder] = useState(null);

    const handleCloseReadyAlert = () => {
        if (activeReadyAlertOrder) {
            const orderKey = activeReadyAlertOrder._id || activeReadyAlertOrder.orderNumber;
            setDismissedAlerts(prev => {
                const next = new Set(prev);
                if (orderKey) next.add(orderKey);
                return next;
            });
        }
        setActiveReadyAlertOrder(null);
    };

    const handleTrackReadyOrder = (order) => {
        if (order) {
            const orderKey = order._id || order.orderNumber;
            setDismissedAlerts(prev => {
                const next = new Set(prev);
                if (orderKey) next.add(orderKey);
                return next;
            });
            setLastOrderDetails(order);
            setSubPage('track');
        }
        setActiveReadyAlertOrder(null);
    };

    useEffect(() => {
        let isMounted = true;

        const formatTimeAgo = (dateStr) => {
            if (!dateStr) return 'Just now';
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return 'Just now';
            const diffSec = Math.floor((new Date() - dateObj) / 1000);
            if (diffSec < 60) return 'Just now';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        };

        const syncBackendNotifications = async () => {
            try {
                // Fix #1: Filter at backend with customer query params — don't fetch all orders
                const notifParams = new URLSearchParams();
                if (user?.email) notifParams.append('customerEmail', user.email);
                if (user?._id || user?.id) notifParams.append('customerId', user._id || user.id);
                const notifUrl = `http://localhost:5000/api/orders${notifParams.toString() ? `?${notifParams.toString()}` : ''}`;
                const res = await fetch(notifUrl);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.orders) && isMounted) {
                    let dynamicNotifs = [];

                    const userCreatedAt = user?.createdAt ? new Date(user.createdAt).getTime() : 0;

                    // Orders already filtered server-side; just apply createdAt guard
                    const userSpecificOrders = data.orders.filter(o => {
                        const orderTime = new Date(o.createdAt || o.updatedAt).getTime();
                        return orderTime >= userCreatedAt;
                    });

                    // Check for active "Ready for Pickup" orders to trigger Heartbeat Popup Alert
                    const readyOrders = userSpecificOrders.filter(o => {
                        const s = (o.status || '').toLowerCase().trim();
                        const isReady = s === 'ready for pickup' || s === 'ready';
                        const orderKey = o._id || o.orderNumber;
                        return isReady && !dismissedAlertsRef.current.has(orderKey);
                    });

                    if (readyOrders.length > 0) {
                        setActiveReadyAlertOrder(readyOrders[0]);
                    } else {
                        setActiveReadyAlertOrder(null);
                    }

                    userSpecificOrders.forEach(o => {
                        const orderNum = o.orderNumber || `PF-${o._id ? String(o._id).slice(-4) : '1024'}`;
                        const store = (o.pickupStore || 'PickFresh Super').split(' - ')[0];
                        const time = formatTimeAgo(o.createdAt || o.updatedAt);
                        const status = (o.status || 'Pending').toLowerCase();

                        // Fix #3: Attach the full order object so Track taps open the correct order
                        if (status === 'pending') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_pending`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Placed!`,
                                message: `Pre-order received at ${store}. Awaiting shop confirmation.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'track'
                            });
                        } else if (status === 'accepted') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_accepted`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Accepted!`,
                                message: `${store} confirmed your order. Items will be packed soon.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'track'
                            });
                        } else if (status === 'preparing' || status === 'processing') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_preparing`,
                                orderId: o._id,
                                orderData: o,
                                title: `Packing Order #${orderNum}`,
                                message: `Your items are currently being packed by ${store}.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'track'
                            });
                        } else if (status === 'ready for pickup' || status === 'completed' || status === 'ready') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_ready`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Ready for Pickup!`,
                                message: `Head to ${store} express pickup counter now.`,
                                time,
                                type: 'order',
                                read: false,
                                actionText: 'Track Order',
                                actionTarget: 'track'
                            });
                        } else if (status === 'cancelled') {
                            dynamicNotifs.push({
                                id: `notif_${o._id}_cancelled`,
                                orderId: o._id,
                                orderData: o,
                                title: `Order #${orderNum} Cancelled`,
                                message: `Order reservation at ${store} was cancelled.`,
                                time,
                                type: 'order',
                                read: true,
                                actionText: 'View Past Orders',
                                actionTarget: 'history'
                            });
                        }
                    });

                    // Preserve read states across polls
                    setNotificationsList(prev => {
                        const readSet = new Set(prev.filter(n => n.read).map(n => n.id));
                        return dynamicNotifs.map(n => readSet.has(n.id) ? { ...n, read: true } : n);
                    });
                }
            } catch (err) {
                console.warn('Backend notification polling error:', err.message);
            }
        };

        syncBackendNotifications();
        // Fast 4 second polling interval for responsive notification sync without server load
        const interval = setInterval(syncBackendNotifications, 4000);

        const handleFocus = () => {
            syncBackendNotifications();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, []);

    const unreadCount = notificationsList.filter(n => !n.read).length;

    const handleMarkAllAsRead = () => {
        setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleMarkSingleAsRead = (id) => {
        setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const handleClearAllNotifications = () => {
        setNotificationsList([]);
    };

    const handleNotifBellClick = () => {
        setShowNotifDropdown(prev => !prev);
    };

    const handleOpenReplacement = (item) => {
        setItemToReplace(item);
        setSubPage('smart_replacement');
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setSubPage('product_details');
    };

    // 2. Add to Cart with MongoDB Atlas Backend Persistence
    const handleAddToCart = async (product, qty = 1) => {
        if (!product) return;

        const storeDisplayName = selectedStore
            ? selectedStore.name.split(' - ')[0]
            : (product.storeName || product.brand || 'PickFresh Super');

        const productPayload = {
            id: product.id || `p_${Date.now()}`,
            name: product.name,
            brand: product.brand || 'Highland',
            storeName: storeDisplayName,
            category: product.category || 'Grocery',
            price: Number(product.price) || 0,
            unit: product.unit || 'pack',
            quantity: qty,
            stock: product.stock !== undefined ? product.stock : (product.available || 50),
            image: product.image || '/cat_veg.png',
            useImageFile: product.useImageFile || (typeof product.image === 'string' && product.image.startsWith('/'))
        };

        // Optimistic UI update
        setCartItems(prev => {
            const matchIndex = prev.findIndex(item =>
                (product.id && item.id === product.id) ||
                (item.name && product.name && item.name.toLowerCase().trim() === product.name.toLowerCase().trim())
            );

            if (matchIndex > -1) {
                const updated = [...prev];
                updated[matchIndex] = {
                    ...updated[matchIndex],
                    quantity: updated[matchIndex].quantity + qty
                };
                return updated;
            }
            return [...prev, productPayload];
        });

        // Persist to MongoDB Atlas via Backend API
        try {
            const res = await fetch('http://localhost:5000/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: customerUserId,
                    product: productPayload,
                    quantity: qty
                })
            });
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.items)) {
                setCartItems(data.items);
            }
        } catch (err) {
            console.warn('Backend cart add error:', err.message);
        }
    };

    // 3. Update Item Quantity in MongoDB Atlas Backend
    const handleUpdateQuantity = async (id, newQty) => {
        if (newQty <= 0) {
            handleRemoveItem(id);
            return;
        }

        // Optimistic UI update
        setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));

        try {
            const res = await fetch('http://localhost:5000/api/cart/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: customerUserId,
                    itemId: id,
                    quantity: newQty
                })
            });
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.items)) {
                setCartItems(data.items);
            }
        } catch (err) {
            console.warn('Backend cart update error:', err.message);
        }
    };

    // 4. Remove Item from MongoDB Atlas Backend
    const handleRemoveItem = async (id) => {
        // Optimistic UI update
        setCartItems(prev => prev.filter(item => item.id !== id));

        try {
            const res = await fetch('http://localhost:5000/api/cart/item/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: customerUserId,
                    itemId: id
                })
            });
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.items)) {
                setCartItems(data.items);
            }
        } catch (err) {
            console.warn('Backend cart item delete error:', err.message);
        }
    };

    const handleReplaceItem = (alternativeProduct) => {
        if (!alternativeProduct) return;
        handleAddToCart(alternativeProduct, 1);
    };

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="customer-shopping-master">
            {/* Global Top Navigation Header Matching User Image */}
            <div className="global-top-header">
                <div className="exact-logo-group">
                    <div className="exact-logo-circle">
                        <img src="/logo.jpg" alt="PickFresh Logo" className="exact-logo-img" />
                    </div>
                    <div className="exact-logo-text">
                        <h2 className="exact-brand-name">PickFresh</h2>
                        <span className="exact-brand-sub">Customer view</span>
                    </div>
                </div>

                <div className="search-header-right">
                    <button
                        className={`exact-notif-btn ${unreadCount > 0 ? 'has-unread-ringing' : ''}`}
                        aria-label="Notifications"
                        onClick={handleNotifBellClick}
                    >
                        <Bell size={20} color="#2D7B38" />
                        {unreadCount > 0 && (
                            <span className="notif-badge-dot">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Quick Notifications Dropdown - Contained within phone screen */}
            {showNotifDropdown && (
                <div className="notif-dropdown-overlay" onClick={() => setShowNotifDropdown(false)}>
                    <div className="notif-dropdown-card" onClick={(e) => e.stopPropagation()}>
                        <div className="notif-dd-header">
                            <div className="notif-dd-title-row">
                                <h3 className="notif-dd-title">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="notif-dd-count-pill">{unreadCount} new</span>
                                )}
                            </div>
                            <div className="notif-dd-actions">
                                {unreadCount > 0 && (
                                    <button className="notif-dd-readall" onClick={handleMarkAllAsRead}>
                                        <CheckCheck size={14} /> Mark read
                                    </button>
                                )}
                                <button className="notif-dd-close" onClick={() => setShowNotifDropdown(false)}>
                                    <X size={16} color="#64748B" />
                                </button>
                            </div>
                        </div>

                        <div className="notif-dd-body">
                            {notificationsList.length === 0 ? (
                                <div className="notif-dd-empty">No notifications</div>
                            ) : (
                                notificationsList.slice(0, 3).map((item) => (
                                    <div
                                        key={item.id}
                                        className={`notif-dd-item ${!item.read ? 'unread' : ''}`}
                                        onClick={() => {
                                            handleMarkSingleAsRead(item.id);
                                            setShowNotifDropdown(false);
                                            // Fix #3: use handleNavigate so order data is passed to LiveTrackingPage
                                            if (item.actionTarget === 'track' && item.orderData) {
                                                handleNavigate('track', item.orderData);
                                            } else if (item.actionTarget) {
                                                handleNavigate(item.actionTarget);
                                            }
                                        }}
                                    >
                                        <div className="notif-dd-item-icon">
                                            {item.type === 'order' && <ShoppingBag size={16} color="#2D7B38" />}
                                            {item.type === 'offer' && <Tag size={16} color="#E65100" />}
                                            {item.type === 'system' && <Sparkles size={16} color="#7B1FA2" />}
                                        </div>
                                        <div className="notif-dd-item-text">
                                            <div className="notif-dd-item-top">
                                                <span className="notif-dd-item-title">{item.title}</span>
                                                <span className="notif-dd-item-time">{item.time}</span>
                                            </div>
                                            <p className="notif-dd-item-sub">{item.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="notif-dd-footer">
                            <button
                                className="notif-dd-viewall-btn"
                                onClick={() => {
                                    setShowNotifDropdown(false);
                                    setSubPage('notifications');
                                }}
                            >
                                <span>View All Notifications</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Container */}
            <div className={`subpage-view-container ${['profile', 'cart', 'pickup_select', 'product_details'].includes(subPage) ? 'fixed-action-page' : ''}`}>
                <div style={{ display: subPage === 'home' ? 'block' : 'none' }}>
                    <CustomerHomePage
                        onNavigate={handleNavigate}
                        onSelectProduct={handleSelectProduct}
                        addToCart={handleAddToCart}
                        selectedStore={selectedStore}
                        onSelectStore={setSelectedStore}
                    />
                </div>
                {subPage === 'notifications' && (
                    <NotificationsPage
                        onNavigate={handleNavigate}
                        notifications={notificationsList}
                        onMarkAsRead={handleMarkSingleAsRead}
                        onClearAll={handleClearAllNotifications}
                        // Fix #6: pass order data so full notifications page also navigates to correct order
                        onNotificationAction={(target, orderData) => handleNavigate(target, orderData || null)}
                    />
                )}
                {subPage === 'stores' && (
                    <CustomerStoresPage
                        onNavigate={handleNavigate}
                        selectedStore={selectedStore}
                        onSelectStore={setSelectedStore}
                    />
                )}
                <div style={{ display: subPage === 'search' ? 'block' : 'none' }}>
                    <SearchPage
                        onNavigate={handleNavigate}
                        onSelectProduct={handleSelectProduct}
                        addToCart={handleAddToCart}
                        selectedStore={selectedStore}
                        onSelectStore={setSelectedStore}
                        initialCategory={searchCategory}
                    />
                </div>
                {subPage === 'product_details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                        <ProductDetailsPage
                            product={selectedProduct}
                            onNavigate={handleNavigate}
                            addToCart={handleAddToCart}
                            selectedStore={selectedStore}
                        />
                    </div>
                )}
                {subPage === 'cart' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                        <CartPage
                            cartItems={cartItems}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemoveItem={handleRemoveItem}
                            onNavigate={handleNavigate}
                            selectedStore={selectedStore}
                            onOpenReplacement={handleOpenReplacement}
                        />
                    </div>
                )}
                {subPage === 'pickup_select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                        <PickupSelectionPage
                            onNavigate={handleNavigate}
                            cartItems={cartItems}
                            selectedStore={selectedStore}
                        />
                    </div>
                )}
                {subPage === 'smart_replacement' && (
                    <SmartReplacementPage
                        onNavigate={handleNavigate}
                        onReplaceItem={handleReplaceItem}
                        itemToReplace={itemToReplace}
                    />
                )}
                {subPage === 'order_confirm' && (
                    <OrderConfirmationPage
                        onNavigate={handleNavigate}
                        orderDetails={lastOrderDetails}
                    />
                )}
                {(subPage === 'track' || subPage === 'live_tracking' || subPage === 'live-tracking') && (
                    <LiveTrackingPage
                        onNavigate={handleNavigate}
                        orderDetails={lastOrderDetails}
                    />
                )}
                {subPage === 'profile' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                        <ProfilePage
                            onNavigate={handleNavigate}
                        />
                    </div>
                )}
                {(subPage === 'history' || subPage === 'past_orders' || subPage === 'order_history') && (
                    <PastOrdersPage
                        onNavigate={handleNavigate}
                        addToCart={handleAddToCart}
                    />
                )}
            </div>

            {/* Bottom Fixed Navigation Bar (Matches User Screenshot) */}
            <div className="bottom-nav-bar">
                <button
                    className={`nav-tab-btn ${subPage === 'home' ? 'active' : ''}`}
                    onClick={() => setSubPage('home')}
                >
                    <Home size={22} className="nav-icon" />
                    <span>Home</span>
                </button>

                <button
                    className={`nav-tab-btn ${subPage === 'search' ? 'active' : ''}`}
                    onClick={() => setSubPage('search')}
                >
                    <Search size={22} className="nav-icon" />
                    <span>Search</span>
                </button>

                <button
                    className={`nav-tab-btn ${(subPage === 'cart' || subPage === 'track' || subPage === 'live_tracking' || subPage === 'live-tracking') ? 'active' : ''}`}
                    onClick={() => setSubPage('cart')}
                >
                    <div className="cart-icon-wrapper">
                        <ShoppingCart size={22} className="nav-icon" />
                        {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
                    </div>
                    <span>Cart</span>
                </button>

                <button
                    className={`nav-tab-btn ${(subPage === 'profile' || subPage === 'history' || subPage === 'past_orders' || subPage === 'order_history') ? 'active' : ''}`}
                    onClick={() => setSubPage('profile')}
                >
                    <User size={22} className="nav-icon" />
                    <span>Profile</span>
                </button>
            </div>

            {/* Heartbeat Ready for Pickup Popup Alert Modal */}
            <ReadyPickupAlertModal
                alertOrder={activeReadyAlertOrder}
                onClose={handleCloseReadyAlert}
                onTrackOrder={handleTrackReadyOrder}
            />
        </div>
    );
}
