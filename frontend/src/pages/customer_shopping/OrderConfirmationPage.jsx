import React, { useState } from 'react';
import { ArrowLeft, Clock, MapPin, CreditCard, Sparkles, CheckCircle2, ChevronDown, ChevronUp, ShoppingBag, Package } from 'lucide-react';
import './OrderConfirmationPage.css';

export default function OrderConfirmationPage({ onNavigate, orderDetails }) {
    const [showSummary, setShowSummary] = useState(true);

    const orderNumber = orderDetails?.orderNumber ? orderDetails.orderNumber.replace('#', '') : 'PF-0001';
    const pickupStore = orderDetails?.pickupStore || 'PickFresh Super • Main Counter';
    const pickupTime = orderDetails?.pickupTimeSlot || orderDetails?.pickupTime || 'Today, 4:30 PM';
    const totalAmount = orderDetails?.totalAmount !== undefined ? Number(orderDetails.totalAmount) : 2930;

    const itemsList = Array.isArray(orderDetails?.items) && orderDetails.items.length > 0
        ? orderDetails.items
        : [
            { name: 'Fresh Red Tomatoes', price: 340, quantity: 2, unit: '1kg', image: '/cat_veg.png' },
            { name: 'Highland Fresh Milk 1L', price: 480, quantity: 1, unit: 'pack', image: '/highland_milk.png' }
        ];

    return (
        <div className="order-conf-container">
            {/* Top Success Badge Header */}
            <div className="success-header-text">
                <div className="header-title-row">
                    <h1 className="page-title">Order confirmed</h1>
                </div>
                <p className="page-subtitle">Your pickup has been reserved successfully</p>
            </div>

            {/* Live Animated SVG Checkmark */}
            <div className="success-checkmark-wrapper">
                <div className="animated-pulse-ring" />
                <div className="success-circle">
                    <svg className="checkmark-svg" viewBox="0 0 52 52">
                        <circle className="checkmark-circle-bg" cx="26" cy="26" r="23" fill="none" />
                        <path className="checkmark-check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                </div>
            </div>

            {/* Premium Structured Order Card */}
            <div className="order-details-card">
                <div className="card-top-badge">
                    <span className="badge-dot" />
                    <span>RESERVATION CONFIRMED</span>
                </div>

                <h2 className="order-number">Order #{orderNumber}</h2>

                <div className="order-info-rows">
                    <div className="info-row">
                        <div className="info-icon-box">
                            <Clock size={16} color="#2D7B38" />
                        </div>
                        <div className="info-content">
                            <span className="info-label">Pickup Time</span>
                            <span className="info-value">{pickupTime}</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon-box">
                            <MapPin size={16} color="#2D7B38" />
                        </div>
                        <div className="info-content">
                            <span className="info-label">Pickup Location</span>
                            <span className="info-value">{pickupStore}</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-icon-box">
                            <CreditCard size={16} color="#2D7B38" />
                        </div>
                        <div className="info-content">
                            <span className="info-label">Total Amount</span>
                            <span className="info-value total">Rs. {totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Summary (Products List) Section */}
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #E2E8F0',
                marginBottom: '16px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
            }}>
                <div
                    onClick={() => setShowSummary(prev => !prev)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        width: '100%',
                        cursor: 'pointer',
                        paddingBottom: showSummary ? '12px' : '0',
                        borderBottom: showSummary ? '1px solid #F1F5F9' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            backgroundColor: '#ECF6EE',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            border: '1px solid #C8E6C9',
                            flexShrink: 0
                        }}>
                            <Package size={16} color="#2D7B38" />
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', margin: 0, whiteSpace: 'nowrap' }}>
                            Order Summary
                        </h3>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#2D7B38',
                            backgroundColor: '#DCFCE7',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            border: '1px solid #86EFAC',
                            flexShrink: 0
                        }}>
                            {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        marginLeft: 'auto',
                        flexShrink: 0
                    }}>
                        {showSummary ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
                    </div>
                </div>

                {showSummary && (
                    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {itemsList.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'space-between',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '12px',
                                    border: '1px solid #F1F5F9'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        flexShrink: 0,
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justify: 'center'
                                    }}>
                                        <img
                                            src={item.image || item.imageUrl || '/cat_veg.png'}
                                            alt={item.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={(e) => { e.target.src = '/cat_veg.png'; }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            color: '#1E293B',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {item.name}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                fontSize: '10.5px',
                                                fontWeight: '800',
                                                color: '#334155',
                                                backgroundColor: '#E2E8F0',
                                                padding: '1px 7px',
                                                borderRadius: '6px'
                                            }}>
                                                Qty: {item.quantity}
                                            </span>
                                            {item.unit && item.unit !== 'item' && !item.name.toLowerCase().includes(item.unit.toLowerCase()) && (
                                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                                                    • {item.unit}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    color: '#2D7B38',
                                    flexShrink: 0,
                                    letterSpacing: '-0.2px'
                                }}>
                                    Rs. {(item.price * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons Group with Uniform Spacing */}
            <div className="action-buttons-group">
                <button className="btn-primary" onClick={() => onNavigate && onNavigate('track', orderDetails)}>
                    <span className="live-pulse-dot" />
                    Track order
                </button>
                <button className="btn-outline-primary" onClick={() => onNavigate && onNavigate('home')}>
                    Continue shopping
                </button>
            </div>
        </div>
    );
}
