import React, { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Sparkles, Store, ArrowRight } from 'lucide-react';
import './CartPage.css';

export default function CartPage({ cartItems, onUpdateQuantity, onRemoveItem, onNavigate, onOpenReplacement }) {
    const items = cartItems || [];

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const openSwapModal = (targetItem) => {
        const itemToSwap = targetItem || items[0];
        if (onOpenReplacement) {
            onOpenReplacement(itemToSwap);
        } else if (onNavigate) {
            onNavigate('smart_replacement');
        }
    };

    // Empty Cart State
    if (!items || items.length === 0) {
        return (
            <div className="new-cart-wrap">
                <div className="page-title-area">
                    <div className="title-left">
                        <h1 className="page-title">Your Cart</h1>
                        <p className="page-subtitle">0 items in your shopping bag</p>
                    </div>
                    <button
                        className="cart-page-back-arrow"
                        onClick={() => onNavigate && onNavigate('search')}
                        aria-label="Back to Search"
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </button>
                </div>

                <div className="cart-empty-container">
                    <div className="empty-icon-circle">
                        <ShoppingBag size={48} color="#2D7B38" />
                    </div>
                    <h3 className="empty-title">Your cart is empty</h3>
                    <p className="empty-desc">Looks like you haven't added any fresh items to your cart yet.</p>
                    <button className="btn-explore" onClick={() => onNavigate && onNavigate('home')}>
                        Start Shopping
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    const hasSmartSwapBanner = items.some(item => (item.stock !== undefined && item.quantity > item.stock) || (item.stock !== undefined && item.stock <= 3) || item.isLowStock);

    return (
        <div className="new-cart-wrap">
            {/* Header with Title on Left & Count Chip + Back Arrow on Right */}
            <div className="page-title-area">
                <div className="title-left">
                    <h1 className="page-title">Your Cart</h1>
                    <p className="page-subtitle">{totalCount} {totalCount === 1 ? 'item' : 'items'} ready for pickup</p>
                </div>
                <div className="title-right-group">
                    <span className="cart-count-chip">{totalCount} Items</span>
                    <button
                        className="cart-page-back-arrow"
                        onClick={() => onNavigate && onNavigate('search')}
                        aria-label="Back to Search"
                    >
                        <ArrowLeft size={20} color="#1E293B" />
                    </button>
                </div>
            </div>

            <div className={`scroll-area ${hasSmartSwapBanner ? 'has-smart-banner' : ''}`}>

                {/* AI Swap Banner - Render ONLY if at least one item has low stock or requested quantity exceeds available stock */}
                {hasSmartSwapBanner && (
                    <div className="global-smart-swap-banner">
                        <div className="banner-left">
                            <div className="swap-icon-glow">
                                <Sparkles size={16} color="#B45309" />
                            </div>
                            <div>
                                <span className="banner-title">Smart Substitution Enabled</span>
                                <span className="banner-text">Item low stock? AI automatically suggests fresh swaps</span>
                            </div>
                        </div>
                        <button className="swap-action-btn" onClick={() => openSwapModal(items.find(i => (i.stock !== undefined && i.quantity > i.stock) || (i.stock !== undefined && i.stock <= 3) || i.isLowStock))}>
                            <span>AI Swap</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                {/* Cart Items List */}
                <div className="cart-items-list">
                    {items.map((item, idx) => {
                        const isLowStock = (item.stock !== undefined && item.quantity > item.stock) || (item.stock !== undefined && item.stock > 0 && item.stock <= 3) || item.isLowStock === true;
                        const itemImg = item.image || item.imageUrl || '/cat_veg.png';

                        return (
                            <div key={item.id || idx} className="cart-card">
                                <div className="item-img-container">
                                    <img
                                        src={typeof itemImg === 'string' && (itemImg.startsWith('data:') || itemImg.startsWith('/') || itemImg.startsWith('http')) ? itemImg : '/cat_veg.png'}
                                        alt={item.name}
                                        className="product-img"
                                        onError={(e) => { e.target.src = '/cat_veg.png'; }}
                                    />
                                </div>
                                <div className="item-details-container">
                                    <div className="item-top-row">
                                        <h3 className="product-name">{item.name}</h3>
                                    </div>

                                    <div className="item-tags-row">
                                        <div className="store-tag">
                                            <Store size={11} color="#2D7B38" />
                                            <span className="store-name">{item.storeName || item.brand || 'PickFresh Super'}</span>
                                            <span className="dot">•</span>
                                            <span className="tag-cat">{item.category || 'Produce'}</span>
                                        </div>
                                    </div>

                                    {isLowStock && (
                                        <div className="item-smart-banner" onClick={() => openSwapModal(item)}>
                                            <Sparkles size={12} color="#B45309" />
                                            <span className="item-banner-text">Smart Swap Eligible (Low Stock)</span>
                                        </div>
                                    )}

                                    <div className="item-bottom-row">
                                        <span className="item-price">Rs. {item.price * item.quantity}</span>
                                        <div className="qty-and-delete">
                                            <div className="qty-selector">
                                                <button
                                                    className="qty-btn minus"
                                                    onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    <Minus size={13} strokeWidth={2.5} />
                                                </button>
                                                <span className="qty-number">{item.quantity}</span>
                                                <button
                                                    className="qty-btn plus"
                                                    onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    <Plus size={13} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                            <button
                                                className="delete-icon-btn"
                                                onClick={() => onRemoveItem && onRemoveItem(item.id)}
                                                aria-label="Delete Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Order Breakdown Summary Card */}
                <div className="summary-area">
                    <div className="summary-card">
                        <h4 className="summary-card-title">Order Breakdown</h4>
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>Rs. {totalAmount}</span>
                        </div>
                        <div className="summary-row">
                            <span>Pickup Service Fee</span>
                            <span style={{ color: '#166534', fontWeight: '800' }}>FREE</span>
                        </div>
                        <div className="dashed-divider"></div>
                        <div className="total-row">
                            <span className="total-label">Total Payable</span>
                            <span className="total-amount">Rs. {totalAmount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="cart-bottom-action-bar">
                <div className="cart-action-bar-info">
                    <span className="cart-action-bar-label">Total Payable</span>
                    <span className="cart-action-bar-amount">Rs. {totalAmount}</span>
                </div>
                <button className="btn-cart-checkout" onClick={() => onNavigate && onNavigate('pickup_select')}>
                    <span>Select Pickup Time</span>
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}
