import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Truck, AlertTriangle, BellRing } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './SupplierNotificationsPage.css';

export default function SupplierNotificationsPage({ onNavigate }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('All');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `http://localhost:5000/api/supplier-replenishment/notifications?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.notifications)) {
                setNotifications(data.notifications.map(n => ({
                    id: n._id || n.id,
                    type: n.type || 'po',
                    title: n.title,
                    message: n.message,
                    time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
                    read: Boolean(n.read)
                })));
            }
        } catch (err) {
            console.error('Error fetching notifications:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user?.email, user?.supplierName, user?.name]);

    const handleVibrateDevice = () => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            try {
                window.navigator.vibrate([150, 50, 150]);
            } catch (e) {
                console.log('Vibration supported/triggered');
            }
        }
    };

    const handleAddTestNotification = async () => {
        handleVibrateDevice();

        const title = `⚡ Live Restock PO #${Math.floor(800 + Math.random() * 100)}`;
        const message = 'Fresh Super Store requested 30 units Anchor Milk 400g.';

        try {
            const res = await fetch('http://localhost:5000/api/supplier-replenishment/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'po',
                    title,
                    message,
                    supplierName: user?.supplierName || user?.name || '',
                    supplierEmail: user?.email || ''
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchNotifications();
            }
        } catch (e) {
            console.error('Error posting test notification:', e);
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await fetch('http://localhost:5000/api/supplier-replenishment/notifications/mark-read', { method: 'PUT' });
        } catch (e) {
            console.error('Failed to update read status on server:', e);
        }
    };

    const filteredNotifs = notifications.filter(n => {
        if (activeTab === 'Unread') return !n.read;
        if (activeTab === 'POs') return n.type === 'po';
        if (activeTab === 'Deliveries') return n.type === 'delivery';
        return true;
    });

    const getIconWrap = (type) => {
        switch (type) {
            case 'po':
                return <div className="supplier-notif-icon-wrap po"><Package size={20} /></div>;
            case 'delivery':
                return <div className="supplier-notif-icon-wrap delivery"><Truck size={20} /></div>;
            default:
                return <div className="supplier-notif-icon-wrap alert"><AlertTriangle size={20} /></div>;
        }
    };

    return (
        <div className="supplier-notif-page-container">
            {/* Header Title Row */}
            <div className="supplier-notif-title-row">
                <h1 className="supplier-notif-page-title">Supplier Notifications</h1>

                <div className="supplier-notif-header-actions">
                    <button
                        className="supplier-notif-mark-all"
                        onClick={handleMarkAllRead}
                    >
                        Read all
                    </button>

                    <button
                        className="supplier-notif-back-btn"
                        onClick={() => onNavigate && onNavigate('home')}
                        aria-label="Back to dashboard"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} color="#1E293B" />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="supplier-notif-tabs">
                {['All', 'Unread', 'POs', 'Deliveries'].map(tab => (
                    <button
                        key={tab}
                        className={`supplier-notif-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Notifications List connected to MongoDB Atlas */}
            <div className="supplier-notif-list">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                        Loading notifications...
                    </div>
                ) : filteredNotifs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94A3B8', fontSize: '14px' }}>
                        No notifications found in {activeTab}.
                    </div>
                ) : (
                    filteredNotifs.map(n => (
                        <div key={n.id} className={`supplier-notif-card ${!n.read ? 'unread' : ''}`}>
                            {getIconWrap(n.type)}

                            <div className="supplier-notif-content">
                                <h3 className="supplier-notif-card-title">{n.title}</h3>
                                <p className="supplier-notif-card-msg">{n.message}</p>
                                <span className="supplier-notif-card-time">{n.time}</span>
                            </div>

                            {!n.read && <div className="supplier-notif-unread-dot" />}
                        </div>
                    ))
                )}
            </div>

            {/* Test Trigger Button with Vibration */}
            <button
                className="supplier-notif-test-btn"
                onClick={handleAddTestNotification}
            >
                <BellRing size={18} /> Simulate New Alert (Vibrate 📳)
            </button>
        </div>
    );
}
