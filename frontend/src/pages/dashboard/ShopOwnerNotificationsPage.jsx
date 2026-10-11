import React, { useState } from 'react';
import { ArrowLeft, CheckCheck, Trash2, ShoppingBag, AlertTriangle, Truck, ChevronRight } from 'lucide-react';
import './ShopOwnerNotificationsPage.css';

export default function ShopOwnerNotificationsPage({ onNavigate, notifications, onMarkAllRead, onClearAll, onSelectNotification }) {
    const [filter, setFilter] = useState('all'); // all, orders, stock, suppliers

    const filteredNotifs = notifications.filter(n => {
        if (filter === 'orders') return n.type === 'order';
        if (filter === 'stock') return n.type === 'stock';
        if (filter === 'suppliers') return n.type === 'supplier';
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="so-notif-page-container">
            {/* Header Navigation */}
            <div className="so-notif-page-nav">
                <button
                    className="so-notif-back-btn"
                    onClick={() => onNavigate && onNavigate('dashboard')}
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="so-notif-page-title">Notifications</h1>
                <div style={{ width: 36 }}></div>
            </div>

            {/* Filter Tabs */}
            <div className="so-notif-filter-bar">
                <button
                    className={`so-filter-chip ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({notifications.length})
                </button>
                <button
                    className={`so-filter-chip ${filter === 'orders' ? 'active' : ''}`}
                    onClick={() => setFilter('orders')}
                >
                    Orders
                </button>
                <button
                    className={`so-filter-chip ${filter === 'stock' ? 'active' : ''}`}
                    onClick={() => setFilter('stock')}
                >
                    Stock Alerts
                </button>
                <button
                    className={`so-filter-chip ${filter === 'suppliers' ? 'active' : ''}`}
                    onClick={() => setFilter('suppliers')}
                >
                    Suppliers
                </button>
            </div>

            {/* Action Bar */}
            <div className="so-notif-actions-row">
                <span className="so-unread-summary">
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {unreadCount > 0 && (
                        <button className="so-text-btn" onClick={onMarkAllRead}>
                            <CheckCheck size={14} /> Mark read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button className="so-text-btn" onClick={onClearAll} style={{ color: '#DC2626' }}>
                            <Trash2 size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications List Stack */}
            <div className="so-notif-page-list">
                {filteredNotifs.length === 0 ? (
                    <div style={{ textStyle: 'center', textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: '14px' }}>
                        No notifications found.
                    </div>
                ) : (
                    filteredNotifs.map(notif => (
                        <div
                            key={notif.id}
                            className={`so-notif-card-item ${!notif.read ? 'unread' : ''}`}
                            onClick={() => onSelectNotification && onSelectNotification(notif)}
                        >
                            <div className="so-notif-card-icon">
                                {notif.type === 'order' && <ShoppingBag size={20} color="#27672D" />}
                                {notif.type === 'stock' && <AlertTriangle size={20} color="#D97706" />}
                                {notif.type === 'supplier' && <Truck size={20} color="#2563EB" />}
                            </div>

                            <div className="so-notif-card-body">
                                <div className="so-notif-card-header">
                                    <h3 className="so-notif-card-title">{notif.title}</h3>
                                    <span className="so-notif-card-time">{notif.time}</span>
                                </div>
                                <p className="so-notif-card-msg">{notif.message}</p>
                                <button className="so-notif-card-action-btn">
                                    {notif.type === 'order' && 'View Order'}
                                    {notif.type === 'stock' && 'Manage Inventory'}
                                    {notif.type === 'supplier' && 'Track Delivery'}
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
