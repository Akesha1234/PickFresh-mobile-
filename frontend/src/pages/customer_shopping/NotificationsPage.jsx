import React, { useState } from 'react';
import { ArrowLeft, Bell, ShoppingBag, Tag, Sparkles, Check, CheckCircle2, Trash2, ChevronRight, Clock, Filter } from 'lucide-react';
import './NotificationsPage.css';

export default function NotificationsPage({ onNavigate, notifications, onMarkAsRead, onClearAll, onNotificationAction }) {
    const [activeTab, setActiveTab] = useState('All');

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const filteredNotifications = notifications.filter(item => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Orders') return item.type === 'order';
        if (activeTab === 'Offers') return item.type === 'offer';
        if (activeTab === 'System') return item.type === 'system';
        return true;
    });

    const getIconForType = (type) => {
        switch (type) {
            case 'order':
                return <ShoppingBag size={20} color="#2D7B38" />;
            case 'offer':
                return <Tag size={20} color="#E65100" />;
            case 'system':
                return <Sparkles size={20} color="#7B1FA2" />;
            default:
                return <Bell size={20} color="#2D7B38" />;
        }
    };

    const getBgColorForType = (type) => {
        switch (type) {
            case 'order':
                return '#E8F5E9';
            case 'offer':
                return '#FFF3E0';
            case 'system':
                return '#F3E5F5';
            default:
                return '#E8F5E9';
        }
    };

    return (
        <div className="notif-page-container">
            {/* Header matching Past Orders layout */}
            <div className="notif-page-header">
                <div className="notif-header-title-group">
                    <h1 className="notif-page-title">Notifications</h1>
                    <p className="notif-page-sub">Stay updated on orders & fresh deals</p>
                </div>

                <div className="notif-header-actions-right">
                    {notifications.length > 0 && (
                        <button
                            className="notif-header-clear-link"
                            onClick={onClearAll}
                            title="Clear all notifications"
                        >
                            <Trash2 size={14} />
                            <span>Clear all</span>
                        </button>
                    )}
                    <button
                        className="notif-back-btn"
                        onClick={() => onNavigate && onNavigate('home')}
                        aria-label="Back to Home"
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="notif-tabs-row">
                {['All', 'Orders', 'Offers', 'System'].map((tab) => {
                    const count = tab === 'All'
                        ? notifications.length
                        : notifications.filter(n => (
                            tab === 'Orders' ? n.type === 'order' :
                                tab === 'Offers' ? n.type === 'offer' :
                                    tab === 'System' ? n.type === 'system' : false
                        )).length;

                    return (
                        <button
                            key={tab}
                            className={`notif-tab-chip ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => handleTabChange(tab)}
                        >
                            <span>{tab}</span>
                            {count > 0 && <span className="tab-count-badge">{count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Notifications List */}
            <div className="notif-list-container">
                {filteredNotifications.length === 0 ? (
                    <div className="notif-empty-state">
                        <div className="empty-icon-circle">
                            <Bell size={36} color="#94A3B8" />
                        </div>
                        <h3 className="empty-title">No notifications yet</h3>
                        <p className="empty-sub">We'll inform you when your order status updates or new offers arrive!</p>
                        <button
                            className="btn-empty-shop"
                            onClick={() => onNavigate && onNavigate('home')}
                        >
                            Explore Fresh Deals
                        </button>
                    </div>
                ) : (
                    filteredNotifications.map((item) => (
                        <div
                            key={item.id}
                            className={`notif-card ${!item.read ? 'unread' : ''}`}
                            onClick={() => onMarkAsRead && onMarkAsRead(item.id)}
                        >
                            <div
                                className="notif-icon-avatar"
                                style={{ backgroundColor: getBgColorForType(item.type) }}
                            >
                                {getIconForType(item.type)}
                            </div>

                            <div className="notif-content flex-1">
                                <div className="notif-card-top">
                                    <h4 className="notif-title">{item.title}</h4>
                                    <span className="notif-time">{item.time}</span>
                                </div>
                                <p className="notif-message">{item.message}</p>

                                {item.actionText && (
                                    <div className="notif-action-row">
                                        <button
                                            className="notif-card-action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onMarkAsRead) onMarkAsRead(item.id);
                                                // Fix #6: Pass orderData so parent navigates to the specific order
                                                if (onNotificationAction) onNotificationAction(item.actionTarget, item.orderData || null);
                                                else if (onNavigate) onNavigate(item.actionTarget || 'home');
                                            }}
                                        >
                                            <span>{item.actionText}</span>
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!item.read && <span className="unread-dot-badge" />}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
