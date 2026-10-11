import React, { useState, useEffect } from 'react';
import { Bell, User, Home, FileText, Store, Truck, Package, X, ExternalLink, MapPin, Globe, Tag, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ReplenishmentRequestsPage from './ReplenishmentRequestsPage';
import RestockRequestDetailsPage from './RestockRequestDetailsPage';
import StoreListPage from './StoreListPage';
import DeliveryTrackingPage from './DeliveryTrackingPage';
import SupplierNotificationsPage from './SupplierNotificationsPage';
import SupplierProfilePage from './SupplierProfilePage';
import SupplierCatalogPage from './SupplierCatalogPage';
import './SupplierDashboard.css';

export default function SupplierDashboard({ onNavigate: topNav }) {
    const { user, logout } = useAuth();
    const userKey = user?.email || user?.supplierName || user?.name || 'anonymous';

    const [activeTab, setActiveTab] = useState('home'); // home, requests, stores, deliveries, notifications, profile
    const [subView, setSubView] = useState('list'); // list, details
    const [selectedPo, setSelectedPo] = useState(null);
    const [showNotifSheet, setShowNotifSheet] = useState(false);
    const [showCatMenu, setShowCatMenu] = useState(false);

    const [dashboardStats, setDashboardStats] = useState({
        storeClients: 0,
        pendingOrders: 0,
        deliveriesToday: 0
    });
    const [latestAlert, setLatestAlert] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `http://localhost:5000/api/supplier-replenishment/dashboard?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.success && data.stats) {
                setDashboardStats({
                    storeClients: Number(data.stats.storeClients ?? 0),
                    pendingOrders: Number(data.stats.pendingOrders ?? 0),
                    deliveriesToday: Number(data.stats.deliveriesToday ?? 0)
                });
            }
            if (data.success && data.latestAlert) {
                setLatestAlert({
                    storeName: data.latestAlert.storeName || 'Store Client',
                    productName: data.latestAlert.productName || 'Stock threshold alert',
                    currentStock: Number(data.latestAlert.currentStock ?? 0),
                    suggestedReorder: Number(data.latestAlert.suggestedReorder ?? 20)
                });
            } else {
                setLatestAlert(null);
            }
        } catch (err) {
            console.error('Backend API connection error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `http://localhost:5000/api/supplier-replenishment/notifications?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.notifications)) {
                const notifs = data.notifications.map(n => ({
                    id: n._id || n.id,
                    title: n.title,
                    message: n.message,
                    read: Boolean(n.read),
                    type: n.type || 'po'
                }));
                setNotifications(notifs);
            }
        } catch (err) {
            console.error('Fetch notifications error:', err.message);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        fetchNotifications();
        const interval = setInterval(() => {
            fetchDashboardData();
            fetchNotifications();
        }, 45000);
        return () => clearInterval(interval);
    }, [userKey]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const triggerVibration = () => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            try { window.navigator.vibrate([100, 50, 100]); } catch (e) { }
        }
    };

    const handleBellClick = () => {
        triggerVibration();
        setShowNotifSheet(prev => !prev);
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await fetch('http://localhost:5000/api/supplier-replenishment/notifications/mark-read', { method: 'PUT' });
        } catch (e) {
            console.error('Failed to update read status on server:', e);
        }
    };

    const handleViewAllNotifications = () => {
        setShowNotifSheet(false);
        setActiveTab('notifications');
    };

    const handleLogout = () => {
        if (logout) logout();
        if (topNav) topNav('login');
    };

    return (
        <div className="supplier-main-container">
            {/* Top Bar Header matching design with Profile & Interactive Bell icon */}
            <div className="supplier-top-header">
                <div className="supplier-header-left">
                    <img
                        src="/logo.jpg"
                        alt="PickFresh Logo"
                        className="supplier-logo-img"
                    />
                    <div>
                        <h1 className="supplier-brand-name">PickFresh</h1>
                        <p className="supplier-brand-subtitle">Replenishment</p>
                    </div>
                </div>

                <div className="supplier-header-right">
                    <button
                        className="supplier-icon-btn"
                        aria-label="Notifications"
                        onClick={handleBellClick}
                        title="Supplier Notifications"
                    >
                        <Bell size={22} color={unreadCount > 0 ? "#27672D" : "#334155"} />
                        {unreadCount > 0 && (
                            <span className="supplier-notif-badge">{unreadCount}</span>
                        )}
                    </button>
                    <button
                        className="supplier-icon-btn"
                        aria-label="Supplier Profile"
                        onClick={() => setActiveTab('profile')}
                        title="Supplier Profile"
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

            {/* Notifications Sheet Overlay Positioned Cleanly Below Header */}
            {showNotifSheet && (
                <div
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                    }}
                    onClick={() => setShowNotifSheet(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#FFFFFF', width: '100%', maxWidth: '380px', borderRadius: '24px',
                            padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0',
                            animation: 'fadeIn 0.2s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                                Supplier Notifications
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        style={{ background: 'none', border: 'none', color: '#27672D', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Read all
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowNotifSheet(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                >
                                    <X size={20} color="#64748B" />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>
                                    No new notifications
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <strong style={{ fontSize: '14px', color: '#1E293B', display: 'block', fontWeight: '800' }}>{n.title}</strong>
                                        <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{n.message}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={handleViewAllNotifications}
                            style={{
                                width: '100%', padding: '12px', backgroundColor: '#E8F5E9', color: '#27672D',
                                border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: '800',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer'
                            }}
                        >
                            View all notifications <ExternalLink size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Scrollable Main Viewport */}
            <div style={{ flex: 1, minHeight: 0, overflow: activeTab === 'home' ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'home' && (
                    <div className="supplier-content-scroll">
                        {/* Dashboard Business Title & Categories Chips */}
                        {(() => {
                            const categoriesList = Array.isArray(user?.supplyCategories) && user.supplyCategories.length > 0
                                ? user.supplyCategories
                                : (user?.supplyCategory ? user.supplyCategory.split(',').map(s => s.trim()).filter(Boolean) : ['Fresh Produce (Vegetables & Fruits)']);

                            const currentHour = new Date().getHours();
                            const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '-6px' }}>
                                        {greeting},
                                    </span>
                                    <h1 className="supplier-page-title" style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' }}>
                                        {user?.supplierName || user?.name || 'Ceylonese Wholesale Groceries'}
                                    </h1>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {/* Primary Category Chip */}
                                        <span style={{
                                            fontSize: '11.5px',
                                            fontWeight: '700',
                                            backgroundColor: '#FEF3C7',
                                            color: '#B45309',
                                            border: '1px solid #FDE68A',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}>
                                            <Tag size={12} color="#B45309" />
                                            {categoriesList[0] || 'Fresh Produce (Vegetables & Fruits)'}
                                        </span>

                                        {/* Interactive +N Categories Dropdown Button */}
                                        {categoriesList.length > 1 && (
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCatMenu(!showCatMenu)}
                                                    style={{
                                                        fontSize: '11.5px',
                                                        fontWeight: '700',
                                                        backgroundColor: '#FFFBEB',
                                                        color: '#B45309',
                                                        border: '1px solid #FDE68A',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                    }}
                                                >
                                                    <span>+{categoriesList.length - 1} More Categories</span>
                                                    <ChevronDown size={13} color="#B45309" style={{ transform: showCatMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                                </button>

                                                {/* Dropdown Popup Menu */}
                                                {showCatMenu && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        marginTop: '6px',
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '14px',
                                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                                                        padding: '8px',
                                                        minWidth: '230px',
                                                        zIndex: 100
                                                    }}>
                                                        <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#94A3B8', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
                                                            Supplied Product Lines ({categoriesList.length})
                                                        </div>
                                                        {categoriesList.map((cat, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '6px 10px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                color: '#1E293B',
                                                                borderRadius: '8px',
                                                                backgroundColor: idx === 0 ? '#FEF3C7' : 'transparent',
                                                                marginBottom: '2px'
                                                            }}>
                                                                <Check size={13} color="#B45309" />
                                                                <span>{cat}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <span style={{
                                            fontSize: '11.5px',
                                            color: '#334155',
                                            fontWeight: '700',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            backgroundColor: '#F1F5F9',
                                            border: '1px solid #E2E8F0',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}>
                                            {(user?.supplyRegion || user?.location || '').includes('Islandwide') ? (
                                                <>
                                                    <Globe size={12} color="#15803D" />
                                                    <strong style={{ color: '#15803D' }}>Islandwide Supply Partner</strong>
                                                </>
                                            ) : (
                                                <>
                                                    <MapPin size={12} color="#15803D" />
                                                    {user?.supplyRegion || user?.location || 'Colombo 03'}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 3 Metric Stat Cards Row connected to MongoDB Atlas */}
                        <div style={{ marginTop: '20px', marginBottom: '12px' }}>
                            <h2 className="supplier-section-title" style={{ fontSize: '17px' }}>Overview</h2>
                        </div>
                        <div className="supplier-stats-grid">
                            <div className="supplier-stat-card-item">
                                <span className="supplier-stat-num">{dashboardStats.storeClients}</span>
                                <span className="supplier-stat-label">Store Clients</span>
                            </div>

                            <div className="supplier-stat-card-item">
                                <span className="supplier-stat-num">{dashboardStats.pendingOrders}</span>
                                <span className="supplier-stat-label">Pending Orders</span>
                            </div>

                            <div className="supplier-stat-card-item">
                                <span className="supplier-stat-num amber">{dashboardStats.deliveriesToday}</span>
                                <span className="supplier-stat-label">Deliveries Today</span>
                            </div>
                        </div>

                        {/* Action Buttons Stack matching UI */}
                        <div style={{ marginTop: '24px', marginBottom: '12px' }}>
                            <h2 className="supplier-section-title" style={{ fontSize: '17px' }}>Quick Actions</h2>
                        </div>
                        <div className="supplier-actions-group">
                            <button
                                className="supplier-action-btn-solid"
                                onClick={() => setActiveTab('requests')}
                            >
                                <FileText size={18} /> View replenishment requests
                            </button>

                            <button
                                className="supplier-action-btn-outline"
                                onClick={() => setActiveTab('deliveries')}
                            >
                                <Truck size={18} /> Track Active Deliveries
                            </button>
                        </div>

                        {/* Latest Alert Section connected to MongoDB Atlas */}
                        <div className="supplier-alert-section">
                            <h2 className="supplier-section-title">Latest alert</h2>

                            {latestAlert?.productName ? (
                                <div className="supplier-alert-card">
                                    <h3 className="supplier-alert-store">{latestAlert.storeName}</h3>
                                    <h4 className="supplier-alert-product">
                                        {latestAlert.productName}
                                    </h4>
                                    <p className="supplier-alert-details">
                                        Current stock: {latestAlert.currentStock} • Suggested reorder: {latestAlert.suggestedReorder}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ fontSize: '13.5px', color: '#64748B', fontStyle: 'italic', padding: '14px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', marginTop: '8px' }}>
                                    No active stock alerts
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab views - kept mounted for instant zero-delay navigation */}
                <div style={{ display: activeTab === 'requests' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    {subView === 'details' ? (
                        <RestockRequestDetailsPage
                            po={selectedPo}
                            onNavigate={(screen) => {
                                if (screen === 'delivery_tracking' || screen === 'deliveries') {
                                    setActiveTab('deliveries');
                                    setSubView('list');
                                } else {
                                    setSubView('list');
                                }
                            }}
                        />
                    ) : (
                        <ReplenishmentRequestsPage
                            onNavigate={(screen, extra) => {
                                if (screen === 'request_details' && extra?.po) {
                                    setSelectedPo(extra.po);
                                    setSubView('details');
                                } else {
                                    setActiveTab('home');
                                }
                            }}
                        />
                    )}
                </div>

                <div style={{ display: activeTab === 'stores' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    <StoreListPage onNavigate={() => setActiveTab('home')} />
                </div>

                <div style={{ display: activeTab === 'deliveries' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    <DeliveryTrackingPage onNavigate={() => setActiveTab('home')} />
                </div>

                <div style={{ display: activeTab === 'catalog' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    <SupplierCatalogPage onNavigate={() => setActiveTab('home')} />
                </div>

                {activeTab === 'notifications' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                        <SupplierNotificationsPage onNavigate={() => setActiveTab('home')} />
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                        <SupplierProfilePage onNavigate={(screen) => screen === 'login' ? handleLogout() : setActiveTab('home')} />
                    </div>
                )}
            </div>

            {/* Fixed Supplier Bottom Navigation Bar */}
            <div className="supplier-bottom-nav">
                <button
                    className={`supplier-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('home'); setSubView('list'); }}
                >
                    <Home size={22} />
                    <span>Home</span>
                </button>

                <button
                    className={`supplier-nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
                    onClick={() => setActiveTab('catalog')}
                >
                    <Package size={22} />
                    <span>Catalog</span>
                </button>

                <button
                    className={`supplier-nav-item ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('requests'); setSubView('list'); }}
                >
                    <FileText size={22} />
                    <span>Requests</span>
                </button>

                <button
                    className={`supplier-nav-item ${activeTab === 'stores' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stores')}
                >
                    <Store size={22} />
                    <span>Stores</span>
                </button>

                <button
                    className={`supplier-nav-item ${activeTab === 'deliveries' ? 'active' : ''}`}
                    onClick={() => setActiveTab('deliveries')}
                >
                    <Truck size={22} />
                    <span>Deliveries</span>
                </button>
            </div>
        </div>
    );
}
