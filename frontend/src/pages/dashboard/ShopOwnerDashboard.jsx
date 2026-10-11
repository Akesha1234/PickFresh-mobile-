import React, { useState, useEffect, useRef } from 'react';
import {
    Bell, User, Home, Package, ClipboardList, Truck,
    Plus, ChevronRight, X, ShoppingBag, AlertTriangle, CheckCheck,
    TrendingUp, TrendingDown, Store, ArrowUpRight, Tag, Sparkles, Edit3, Check, ArrowRight, Loader2, Trash2
} from 'lucide-react';
import ProductInventoryModule from '../product_inventory/ProductInventoryModule';
import OrderPickupModule from '../order_pickup/OrderPickupModule';
import SupplierReplenishmentModule from '../supplier_replenishment/SupplierReplenishmentModule';
import AddProductPage from '../product_inventory/AddProductPage';
import ShopOwnerProfilePage from './ShopOwnerProfilePage';
import ShopOwnerNotificationsPage from './ShopOwnerNotificationsPage';
import { useAuth } from '../../context/AuthContext';
import './ShopOwnerDashboard.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';
let shopOwnerDashboardCache = null;

export default function ShopOwnerDashboard({ onNavigate }) {
    const { logout, user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('home'); // home, inventory, orders, suppliers, profile, notifications
    const [inventoryScreen, setInventoryScreen] = useState('product_list');
    const [subScreen, setSubScreen] = useState(null);
    const [showNotifSheet, setShowNotifSheet] = useState(false);

    // Live Store Open/Closed status sync
    const isStoreOpen = user?.storeStatus !== 'closed';

    const handleToggleStoreStatus = async () => {
        const newStatus = isStoreOpen ? 'closed' : 'open';
        try {
            await updateUser({ storeStatus: newStatus });
        } catch (err) {
            console.warn('Failed to update store status:', err);
        }
    };

    // Dynamic Stats State strictly from MongoDB Atlas Backend
    const [dashboardStats, setDashboardStats] = useState(shopOwnerDashboardCache?.stats || {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        todaySales: 0,
        activePickups: 0
    });

    // Dynamic Recent Stock Activity State strictly from Backend
    const [recentActivity, setRecentActivity] = useState(shopOwnerDashboardCache?.recentActivity || []);

    // Shop Owner Specific Notifications Data
    const [notifications, setNotifications] = useState(shopOwnerDashboardCache?.notifications || [
        {
            id: 'so_1',
            title: 'New Customer Pre-Order #PF-1048',
            message: 'Kamal Bandara placed a pickup order (4 items • Rs. 3,450).',
            time: '2m ago',
            type: 'order',
            targetTab: 'orders',
            read: false
        },
        {
            id: 'so_2',
            title: 'Critical Low Stock Warning',
            message: 'Highland Fresh Milk 1L is down to 3 packs in stock. Reorder recommended.',
            time: '18m ago',
            type: 'stock',
            targetTab: 'inventory',
            read: false
        },
        {
            id: 'so_3',
            title: 'Supplier Delivery Arriving Soon',
            message: 'Nuwara Eliya Produce Farm shipment #PO-892 is 10 mins away.',
            time: '45m ago',
            type: 'supplier',
            targetTab: 'suppliers',
            read: false
        }
    ]);

    // Store Offer Banner State
    const [offerBanner, setOfferBanner] = useState({
        badge: '🔥 20% OFF DEALS',
        title: 'Fresh Harvest Deals',
        subtitle: 'Pick up in 15 mins at nearest grocery store',
        btnText: 'Shop Now',
        active: true,
        bannerBg: '/banner_bg.png'
    });
    const [hasCustomBanner, setHasCustomBanner] = useState(false);
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [editBadge, setEditBadge] = useState('🔥 20% OFF DEALS');
    const [editTitle, setEditTitle] = useState('Fresh Harvest Deals');
    const [editSubtitle, setEditSubtitle] = useState('Pick up in 15 mins at nearest grocery store');
    const [editBtnText, setEditBtnText] = useState('Shop Now');
    const [editActive, setEditActive] = useState(true);
    const [editBannerBg, setEditBannerBg] = useState('/banner_bg.png');
    const [isSavingBanner, setIsSavingBanner] = useState(false);
    const [bannerToast, setBannerToast] = useState('');

    // Banner Image Upload Handler (Convert File to Base64)
    const handleBannerImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image file size must be less than 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditBannerBg(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const showBannerModalRef = useRef(showBannerModal);
    useEffect(() => {
        showBannerModalRef.current = showBannerModal;
    }, [showBannerModal]);

    const handleOpenBannerModal = () => {
        if (!hasCustomBanner) {
            if (!editBadge) setEditBadge('🔥 20% OFF DEALS');
            if (!editTitle) setEditTitle('Fresh Harvest Deals');
            if (!editSubtitle) setEditSubtitle('Pick up in 15 mins at nearest grocery store');
            if (!editBtnText) setEditBtnText('Shop Now');
        }
        setShowBannerModal(true);
    };

    // Fetch Store Offer Banner from MongoDB Atlas
    const fetchOfferBanner = async () => {
        if (!user) return;
        try {
            const storeName = user?.shopName || user?.name || '';
            const endpoint = `${API_BASE_URL}/offer-banner?storeEmail=${encodeURIComponent(user?.email || '')}&storeName=${encodeURIComponent(storeName)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (res.ok && data.success && data.offerBanner) {
                setHasCustomBanner(!!data.hasCustomBanner);
                setOfferBanner(data.offerBanner);

                // NEVER overwrite modal fields while the user is actively typing in the modal
                if (!showBannerModalRef.current) {
                    if (data.hasCustomBanner) {
                        setEditBadge(data.offerBanner.badge || '🔥 20% OFF DEALS');
                        setEditTitle(data.offerBanner.title || 'Fresh Harvest Deals');
                        setEditSubtitle(data.offerBanner.subtitle || '');
                        setEditBtnText(data.offerBanner.btnText || 'Shop Now');
                        setEditActive(data.offerBanner.active !== false);
                        setEditBannerBg(data.offerBanner.bannerBg || '/banner_bg.png');
                    } else {
                        // Pre-fill clean defaults for new banner creation
                        setEditBadge('🔥 20% OFF DEALS');
                        setEditTitle('Fresh Harvest Deals');
                        setEditSubtitle('Pick up in 15 mins at nearest grocery store');
                        setEditBtnText('Shop Now');
                        setEditActive(true);
                        setEditBannerBg('/banner_bg.png');
                    }
                }
            }
        } catch (err) {
            console.warn('Error fetching offer banner:', err.message);
        }
    };

    const handleSaveOfferBanner = async (e) => {
        if (e) e.preventDefault();
        setIsSavingBanner(true);
        try {
            const payload = {
                storeEmail: user?.email || '',
                storeName: user?.shopName || user?.name || 'GroceryMart',
                badge: editBadge,
                title: editTitle,
                subtitle: editSubtitle,
                btnText: editBtnText,
                active: editActive,
                bannerBg: editBannerBg || '/banner_bg.png'
            };
            const res = await fetch(`${API_BASE_URL}/offer-banner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.offerBanner) {
                setOfferBanner(data.offerBanner);
                setHasCustomBanner(true);
                setBannerToast('Store offer banner published to Customer Home!');
                setShowBannerModal(false);
                setTimeout(() => setBannerToast(''), 3500);
            }
        } catch (err) {
            console.error('Error saving banner:', err);
        } finally {
            setIsSavingBanner(false);
        }
    };

    const handleDeleteOfferBanner = async () => {
        if (!window.confirm('Are you sure you want to remove your store offer banner?')) return;
        setIsSavingBanner(true);
        try {
            const res = await fetch(`${API_BASE_URL}/offer-banner`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeEmail: user?.email || '',
                    storeName: user?.shopName || user?.name || ''
                })
            });
            const data = await res.json();
            if (data.success) {
                setHasCustomBanner(false);
                setOfferBanner(null);
                setEditBadge('🔥 20% OFF DEALS');
                setEditTitle('Fresh Harvest Deals');
                setEditSubtitle('Pick up in 15 mins at nearest grocery store');
                setShowBannerModal(false);
                setBannerToast('Store banner removed successfully!');
                setTimeout(() => setBannerToast(''), 3500);
            }
        } catch (err) {
            console.error('Error deleting banner:', err);
        } finally {
            setIsSavingBanner(false);
        }
    };

    // Fetch Dashboard Stats from Backend API for logged in Shop
    const fetchDashboardStats = async () => {
        if (!user) return;

        try {
            const storeName = user?.shopName || user?.storeName || user?.name || '';
            const endpoint = `${API_BASE_URL}/dashboard?storeEmail=${encodeURIComponent(user?.email || '')}&storeName=${encodeURIComponent(storeName)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (res.ok && data.success && data.stats) {
                setDashboardStats(prev => ({
                    ...prev,
                    ...data.stats
                }));
                let newActivity = prev => prev;
                if (data.recentActivity && Array.isArray(data.recentActivity)) {
                    setRecentActivity(data.recentActivity);
                    newActivity = data.recentActivity;
                }
                shopOwnerDashboardCache = {
                    ...(shopOwnerDashboardCache || {}),
                    stats: data.stats,
                    recentActivity: newActivity
                };
            }
        } catch (err) {
            console.warn('Backend API request error (using local dashboard state):', err.message);
        }
    };

    // Fetch Live Store Notifications strictly from MongoDB Atlas Backend
    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const storeName = user?.shopName || user?.storeName || user?.name || '';
            const endpoint = `${API_BASE_URL}/notifications?storeEmail=${encodeURIComponent(user?.email || '')}&storeName=${encodeURIComponent(storeName)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
                shopOwnerDashboardCache = {
                    ...(shopOwnerDashboardCache || {}),
                    notifications: data.notifications
                };
            }
        } catch (err) {
            console.warn('Backend notifications fetch error:', err.message);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDashboardStats();
            fetchNotifications();
            fetchOfferBanner();

            // Polling every 45s to keep stats fresh — only re-runs when the user changes, not on tab switches
            const interval = setInterval(() => {
                fetchDashboardStats();
                fetchNotifications();
                fetchOfferBanner();
            }, 45000);

            return () => clearInterval(interval);
        }
    }, [user?.email, user?.shopName]);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Trigger haptic vibration on bell click
    const handleBellClick = () => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            try {
                window.navigator.vibrate([100, 50, 100]);
            } catch (err) { }
        }
        setShowNotifSheet(prev => !prev);
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleClearAll = () => {
        setNotifications([]);
    };

    const handleNotificationClick = (notif) => {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setShowNotifSheet(false);
        if (notif.targetTab) {
            setActiveTab(notif.targetTab);
            setSubScreen(null);
        }
    };

    const handleViewAllNotifications = () => {
        setShowNotifSheet(false);
        setActiveTab('notifications');
        setSubScreen(null);
    };

    const handleQuickAction = (action) => {
        if (action === 'products') {
            setActiveTab('inventory');
        } else if (action === 'add_product') {
            setSubScreen('add_product');
        } else if (action === 'orders') {
            setActiveTab('orders');
        }
    };

    return (
        <div className="merchant-dashboard-container">
            {/* Top Bar Header matching screenshot with Profile & Interactive Bell icon */}
            <div className="merchant-top-header">
                <div className="merchant-header-left">
                    <img
                        src="/logo.jpg"
                        alt="PickFresh Logo"
                        className="merchant-logo-img"
                    />
                    <div>
                        <h1 className="merchant-brand-name">PickFresh</h1>
                        <p className="merchant-brand-subtitle">Shop staff</p>
                    </div>
                </div>

                <div className="merchant-header-right">
                    <button
                        className={`merchant-icon-btn ${unreadCount > 0 ? 'has-unread-ringing' : ''}`}
                        aria-label="Notifications"
                        onClick={handleBellClick}
                        title="Store Notifications"
                    >
                        <Bell size={22} color={unreadCount > 0 ? "#27672D" : "#334155"} />
                        {unreadCount > 0 && (
                            <span className="merchant-notif-badge">{unreadCount}</span>
                        )}
                    </button>
                    <button
                        className="merchant-icon-btn profile-icon-btn"
                        aria-label="Store Profile"
                        onClick={() => { setActiveTab('profile'); setSubScreen(null); }}
                        title="Store Profile"
                        style={{
                            backgroundColor: activeTab === 'profile' ? '#E8F5E9' : 'transparent',
                            borderRadius: '50%',
                            padding: '6px'
                        }}
                    >
                        <User size={22} color="#27672D" />
                    </button>
                </div>
            </div>

            {/* Shop Owner Notifications Dropdown Modal Sheet */}
            {showNotifSheet && (
                <div className="so-notif-modal-overlay" onClick={() => setShowNotifSheet(false)}>
                    <div className="so-notif-card" onClick={(e) => e.stopPropagation()}>
                        <div className="so-notif-header">
                            <h3 className="so-notif-title">Store Notifications</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        style={{ background: 'none', border: 'none', color: '#27672D', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                    >
                                        <CheckCheck size={14} /> Read all
                                    </button>
                                )}
                                <button className="so-notif-close" onClick={() => setShowNotifSheet(false)}>
                                    <X size={16} color="#64748B" />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {notifications.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', padding: '20px 0' }}>No new notifications</p>
                            ) : (
                                notifications.slice(0, 3).map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`so-notif-item ${!notif.read ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="so-notif-icon-box">
                                            {notif.type === 'order' && <ShoppingBag size={18} color="#27672D" />}
                                            {notif.type === 'stock' && <AlertTriangle size={18} color="#D97706" />}
                                            {notif.type === 'supplier' && <Truck size={18} color="#2563EB" />}
                                        </div>
                                        <div className="so-notif-body">
                                            <div className="so-notif-top">
                                                <span className="so-notif-item-title">{notif.title}</span>
                                                <span className="so-notif-time">{notif.time}</span>
                                            </div>
                                            <p className="so-notif-msg">{notif.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button className="so-notif-view-all-btn" onClick={handleViewAllNotifications}>
                            View All Notifications <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Viewport Content per Bottom Tab / Subscreen */}
            <div style={{ flex: 1, minHeight: 0, overflow: (activeTab === 'home' && !subScreen) ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'home' && !subScreen && (
                    <div className="merchant-content-scroll">
                        {/* Personalized Greeting & Live Store Status Header */}
                        <div className="so-welcome-card">
                            <div className="so-welcome-left">
                                <span className="so-welcome-subtitle">WELCOME BACK</span>
                                <h3 className="so-welcome-title">{user?.shopName || user?.name || 'My Grocery Store'}</h3>
                            </div>
                            <button
                                className={`so-status-pill-btn ${isStoreOpen ? 'open' : 'closed'}`}
                                onClick={handleToggleStoreStatus}
                                title="Click to toggle store open/closed status for customers"
                            >
                                <span className="so-status-dot"></span>
                                <span>{isStoreOpen ? 'STORE OPEN' : 'STORE CLOSED'}</span>
                            </button>
                        </div>

                        {/* Title */}
                        <h1 className="merchant-page-title">Merchant Dashboard</h1>

                        {/* Toast Notification for Banner Save */}
                        {bannerToast && (
                            <div style={{
                                backgroundColor: '#F0FDF4',
                                border: '1px solid #86EFAC',
                                color: '#166534',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                marginBottom: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <CheckCheck size={18} color="#166534" />
                                <span>{bannerToast}</span>
                            </div>
                        )}

                        {/* Low Stock Warning Alert Banner */}
                        {dashboardStats.lowStockCount > 0 && (
                            <div
                                onClick={() => { setInventoryScreen('low_stock'); setActiveTab('inventory'); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'space-between',
                                    backgroundColor: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    marginBottom: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertTriangle size={20} color="#D97706" />
                                    <div>
                                        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', margin: 0 }}>Low Stock Warning</h4>
                                        <p style={{ fontSize: '11px', color: '#B45309', margin: 0 }}>{dashboardStats.lowStockCount} product(s) are running below threshold.</p>
                                    </div>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#D97706', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    Restock <ChevronRight size={14} />
                                </span>
                            </div>
                        )}

                        {/* 3 Metrics Overview Cards fetching from backend */}
                        <div className="merchant-metrics-row">
                            <div className="merchant-metric-card" onClick={() => { setInventoryScreen('product_list'); setActiveTab('inventory'); }}>
                                <span className="merchant-metric-number">{dashboardStats.totalProducts}</span>
                                <span className="merchant-metric-label">Total products</span>
                            </div>

                            <div className="merchant-metric-card peach" onClick={() => { setInventoryScreen('low_stock'); setActiveTab('inventory'); }}>
                                <span className="merchant-metric-number amber">{dashboardStats.lowStockCount}</span>
                                <span className="merchant-metric-label">Low stock</span>
                            </div>

                            <div className="merchant-metric-card" onClick={() => { setInventoryScreen('product_list'); setActiveTab('inventory'); }}>
                                <span className="merchant-metric-number red">{dashboardStats.outOfStockCount}</span>
                                <span className="merchant-metric-label">Out of stock</span>
                            </div>
                        </div>

                        {/* Dual Project Status Cards: Soft Modern Pastel Theme */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '6px' }}>
                            <div
                                onClick={() => setActiveTab('orders')}
                                style={{
                                    backgroundColor: '#ECFDF5',
                                    borderRadius: '18px',
                                    padding: '14px 16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                    border: '1px solid #A7F3D0',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
                                    minHeight: '92px',
                                    boxSizing: 'border-box',
                                    transition: 'transform 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        Customer Pickups
                                    </span>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShoppingBag size={14} color="#059669" />
                                    </div>
                                </div>
                                <div style={{ marginTop: '4px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#047857', lineHeight: '1.1' }}>
                                        {dashboardStats.activePickups ?? 0} Orders
                                    </h3>
                                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '3px', display: 'block' }}>
                                        Ready for collection →
                                    </span>
                                </div>
                            </div>

                            <div
                                onClick={() => { setInventoryScreen('low_stock'); setActiveTab('inventory'); }}
                                style={{
                                    backgroundColor: '#FFFBEB',
                                    borderRadius: '18px',
                                    padding: '14px 16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                    border: '1px solid #FDE68A',
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
                                    minHeight: '92px',
                                    boxSizing: 'border-box',
                                    transition: 'transform 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        Stock Restock
                                    </span>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Truck size={14} color="#D97706" />
                                    </div>
                                </div>
                                <div style={{ marginTop: '4px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#B45309', lineHeight: '1.1' }}>
                                        {dashboardStats.lowStockCount ?? 0} Items
                                    </h3>
                                    <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '700', marginTop: '3px', display: 'block' }}>
                                        Reorder from supplier →
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick actions Section */}
                        <div>
                            <h2 className="merchant-section-title">Quick actions</h2>
                            <div className="merchant-actions-group">
                                <button
                                    className="merchant-action-btn solid-green"
                                    onClick={() => handleQuickAction('products')}
                                >
                                    View all products
                                </button>
                                <button
                                    className="merchant-action-btn outline-green"
                                    onClick={() => handleQuickAction('add_product')}
                                >
                                    Add new product
                                </button>
                                <button
                                    className="merchant-action-btn solid-orange"
                                    onClick={() => handleQuickAction('orders')}
                                >
                                    View Pre-Orders
                                </button>
                            </div>
                        </div>

                        {/* Store Offer Banner Management & Live Preview */}
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '18px',
                            border: '1px solid #E2E8F0',
                            padding: '14px',
                            marginTop: '18px',
                            marginBottom: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Tag size={16} color="#27672D" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>Store Offer Banner</h4>
                                        <span style={{ fontSize: '11px', color: hasCustomBanner ? '#059669' : '#94A3B8', fontWeight: '600', lineHeight: '1.2' }}>
                                            {hasCustomBanner ? '✓ Live on Customer App' : 'Not published yet'}
                                        </span>
                                    </div>
                                </div>
                                {hasCustomBanner && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={handleOpenBannerModal}
                                            style={{
                                                backgroundColor: '#F0FDF4',
                                                color: '#166534',
                                                border: '1px solid #BBF7D0',
                                                borderRadius: '8px',
                                                height: '32px',
                                                padding: '0 12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                lineHeight: 1,
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Edit3 size={13} /> Edit Offer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeleteOfferBanner}
                                            title="Remove Banner"
                                            style={{
                                                backgroundColor: '#FEF2F2',
                                                color: '#DC2626',
                                                border: '1px solid #FCA5A5',
                                                borderRadius: '8px',
                                                height: '32px',
                                                padding: '0 12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                lineHeight: 1,
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                            {hasCustomBanner ? (
                                /* Live Banner Preview */
                                <div className="modern-banner-card" style={{ cursor: 'default', margin: 0 }}>
                                    <img src={offerBanner.bannerBg || '/banner_bg.png'} alt={offerBanner.title} className="modern-banner-bg" />
                                    <div className="modern-banner-overlay">
                                        <div className="modern-banner-badge">
                                            <span>{offerBanner.badge || '🔥 20% OFF DEALS'}</span>
                                        </div>
                                        <h3 className="modern-banner-title">{offerBanner.title || 'Fresh Harvest Deals'}</h3>
                                        <p className="modern-banner-subtitle">{offerBanner.subtitle || 'Pick up in 15 mins at nearest grocery store'}</p>
                                        <button className="modern-banner-btn" style={{ pointerEvents: 'none' }}>
                                            <span>{offerBanner.btnText || 'Shop Now'}</span>
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Add Banner CTA — shown when store has no banner yet */
                                <div
                                    onClick={handleOpenBannerModal}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        border: '2px dashed #CBD5E1',
                                        borderRadius: '16px',
                                        padding: '28px 16px',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #F8FAFC 0%, #F0FDF4 100%)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Plus size={22} color="#27672D" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>Add a Store Banner</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B', fontWeight: '500' }}>Create a banner to promote your deals on the Customer Home page</p>
                                    </div>
                                    <button
                                        type="button"
                                        style={{
                                            backgroundColor: '#27672D',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '9px 20px',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '4px'
                                        }}
                                    >
                                        <Sparkles size={14} /> Create Banner
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Recent stock activity Section */}
                        <div>
                            <h2 className="merchant-section-title">Recent stock activity</h2>
                            <div className="merchant-activity-list">
                                {recentActivity.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '13px', fontWeight: '500' }}>
                                        No recent stock activity recorded yet. Newly added products will appear here in real time.
                                    </div>
                                ) : (
                                    recentActivity.map(act => (
                                        <div key={act.id} className="merchant-activity-card-enhanced">
                                            <div className="merchant-activity-info">
                                                <div className={`merchant-activity-icon ${act.type}`}>
                                                    {act.type === 'in' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                                </div>
                                                <div>
                                                    <h4 className="merchant-activity-title">{act.title}</h4>
                                                    <span className="merchant-activity-time">{act.subtitle}</span>
                                                </div>
                                            </div>
                                            <span className={`merchant-activity-badge ${act.type}`}>{act.change}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscreen view for Add Product */}
                {subScreen === 'add_product' && (
                    <AddProductPage onNavigate={() => {
                        setSubScreen(null);
                        setActiveTab('inventory');
                        fetchDashboardStats();
                    }} />
                )}

                {/* Tab Views - kept mounted with display toggle for instant zero-delay navigation */}
                <div style={{ display: (activeTab === 'inventory' && !subScreen) ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: '100%' }}>
                    <ProductInventoryModule
                        key={inventoryScreen}
                        initialScreen={inventoryScreen}
                        onNavigate={(screen) => {
                            if (screen === 'dashboard' || screen === 'home') {
                                setActiveTab('home');
                                setInventoryScreen('product_list');
                            }
                        }}
                    />
                </div>

                <div style={{ display: (activeTab === 'orders' && !subScreen) ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    <OrderPickupModule onNavigate={(screen) => {
                        if (screen === 'dashboard' || screen === 'home') {
                            setActiveTab('home');
                        }
                    }} />
                </div>

                <div style={{ display: (activeTab === 'suppliers' && !subScreen) ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    <SupplierReplenishmentModule onNavigate={(screen) => {
                        if (screen === 'dashboard' || screen === 'home') {
                            setActiveTab('home');
                        }
                    }} />
                </div>

                {activeTab === 'profile' && !subScreen && (
                    <div style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <ShopOwnerProfilePage onNavigate={(screen) => {
                            if (screen === 'login') {
                                if (onNavigate) onNavigate('login');
                            } else {
                                setActiveTab('home');
                            }
                        }} />
                    </div>
                )}

                {activeTab === 'notifications' && !subScreen && (
                    <ShopOwnerNotificationsPage
                        onNavigate={() => setActiveTab('home')}
                        notifications={notifications}
                        onMarkAllRead={handleMarkAllRead}
                        onClearAll={handleClearAll}
                        onSelectNotification={handleNotificationClick}
                    />
                )}
            </div>

            {/* Fixed Bottom Navigation Bar */}
            <div className="merchant-bottom-nav">
                <button
                    className={`merchant-nav-item ${activeTab === 'home' && !subScreen ? 'active' : ''}`}
                    onClick={() => { setActiveTab('home'); setSubScreen(null); }}
                >
                    <Home size={22} />
                    <span>Home</span>
                </button>

                <button
                    className={`merchant-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('inventory'); setSubScreen(null); }}
                >
                    <Package size={22} />
                    <span>Inventory</span>
                </button>

                <button
                    className={`merchant-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('orders'); setSubScreen(null); }}
                >
                    <ClipboardList size={22} />
                    <span>Orders</span>
                </button>

                <button
                    className={`merchant-nav-item ${activeTab === 'suppliers' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('suppliers'); setSubScreen(null); }}
                >
                    <Truck size={22} />
                    <span>Suppliers</span>
                </button>
            </div>

            {/* Modal for editing Store Offer Banner */}
            {showBannerModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '420px',
                        padding: '20px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={20} color="#166534" />
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                                    {hasCustomBanner ? 'Edit Store Offer Banner' : 'Create Store Offer Banner'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBannerModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} color="#64748B" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveOfferBanner} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                                    Offer Badge / Tagline
                                </label>
                                <input
                                    type="text"
                                    value={editBadge}
                                    onChange={(e) => setEditBadge(e.target.value)}
                                    placeholder="e.g. 🔥 20% OFF DEALS"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                                    Banner Headline / Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="e.g. Fresh Harvest Deals"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                                    Subtitle / Description
                                </label>
                                <input
                                    type="text"
                                    value={editSubtitle}
                                    onChange={(e) => setEditSubtitle(e.target.value)}
                                    placeholder="e.g. Pick up in 15 mins at nearest grocery store"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '500', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                                    Button Action Label
                                </label>
                                <input
                                    type="text"
                                    value={editBtnText}
                                    onChange={(e) => setEditBtnText(e.target.value)}
                                    placeholder="e.g. Shop Now"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            {/* Image Selector & Upload Section */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Banner Background Image
                                </label>

                                {/* Live Selected Image Thumbnail */}
                                <div style={{ position: 'relative', width: '100%', height: '90px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px', border: '1px solid #CBD5E1' }}>
                                    <img src={editBannerBg || '/banner_bg.png'} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.6), transparent)', display: 'flex', alignItems: 'center', padding: '10px' }}>
                                        <span style={{ color: '#FFF', fontSize: '11px', fontWeight: '700', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '6px' }}>Selected Image Preview</span>
                                    </div>
                                </div>

                                {/* Custom Upload Button */}
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justify: 'center',
                                        gap: '6px',
                                        backgroundColor: '#F8FAFC',
                                        border: '1px dashed #94A3B8',
                                        borderRadius: '10px',
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#166534',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}>
                                        <Plus size={14} /> Upload Custom Image File
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBannerImageUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>

                                {/* Preset Image Options */}
                                <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>OR CHOOSE A PRESET STORE IMAGE:</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                    {[
                                        { name: 'Fresh Veggies', url: '/banner_bg.png' },
                                        { name: 'Fruits', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop&q=60' },
                                        { name: 'Supermarket', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60' },
                                        { name: 'Bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60' }
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setEditBannerBg(preset.url)}
                                            style={{
                                                border: editBannerBg === preset.url ? '2px solid #166534' : '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                padding: 0,
                                                height: '42px',
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                            title={preset.name}
                                        >
                                            <img src={preset.url} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Active on Customer Home</span>
                                <input
                                    type="checkbox"
                                    checked={editActive}
                                    onChange={(e) => setEditActive(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#166534' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                {hasCustomBanner && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteOfferBanner}
                                        style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        title="Remove Banner"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowBannerModal(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingBanner}
                                    style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: '#166534', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    {isSavingBanner ? <Loader2 size={16} className="spinner-icon" /> : <Check size={16} />}
                                    {hasCustomBanner ? 'Save Changes' : 'Publish Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
