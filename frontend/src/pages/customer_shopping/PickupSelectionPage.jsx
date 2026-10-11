import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './PickupSelectionPage.css';

export default function PickupSelectionPage({ onNavigate, cartItems = [], selectedStore }) {
    const { user } = useAuth();

    // Determine exact store from cart items or selected store
    const storeDisplayName = (cartItems && cartItems.length > 0 && cartItems[0].storeName)
        ? cartItems[0].storeName
        : (selectedStore ? (selectedStore.name || selectedStore.storeName || 'PickFresh Super • Main Counter') : 'PickFresh Super • Main Counter');

    const defaultInitialSlots = [
        { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', status: '5 slots available', full: false, badge: 'AVAILABLE', badgeType: 'normal' },
        { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', status: '3 slots left', full: false, badge: '🔥 3 SLOTS LEFT', badgeType: 'hot' },
        { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', status: '6 slots available', full: false, badge: 'AVAILABLE', badgeType: 'normal' },
        { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', status: '8 slots available', full: false, badge: 'AVAILABLE', badgeType: 'normal' }
    ];

    const [selectedSlotId, setSelectedSlotId] = useState('slot1');
    const [timeSlots, setTimeSlots] = useState(defaultInitialSlots);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(''); // Fix #4: track errors instead of fake order

    // Instant silent background fetch from Backend API for the target storeDisplayName
    useEffect(() => {
        let isMounted = true;
        const fetchAvailableSlots = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/order-pickup/slots?storeName=${encodeURIComponent(storeDisplayName)}&date=Today`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.slots) && data.slots.length > 0 && isMounted) {
                    setTimeSlots(data.slots);
                    const availableSlot = data.slots.find(s => !s.full && !s.isBlocked);
                    if (availableSlot) {
                        setSelectedSlotId(availableSlot.id);
                    }
                }
            } catch (err) {
                console.warn('Backend slot connection error:', err.message);
            }
        };

        fetchAvailableSlots();
        return () => { isMounted = false; };
    }, [storeDisplayName]);

    const totalAmount = cartItems && cartItems.length > 0
        ? cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        : 2930;

    const selectedSlotObj = timeSlots.find(s => s.id === selectedSlotId);

    const handlePlacePreOrder = async () => {
        setIsSubmitting(true);
        setSubmitError('');
        const slotText = selectedSlotObj ? (selectedSlotObj.duration || selectedSlotObj.time) : '4:30 PM - 5:00 PM';

        const payload = {
            items: cartItems.length > 0 ? cartItems : [
                { name: 'Fresh Red Tomatoes', price: 340, quantity: 2, unit: '1kg', image: '/cat_veg.png' },
                { name: 'Highland Fresh Milk 1L', price: 480, quantity: 1, unit: 'pack', image: '/highland_milk.png' }
            ],
            totalAmount: totalAmount,
            pickupStore: storeDisplayName,
            pickupDate: 'Today',
            pickupTimeSlot: slotText,
            customerName: user ? (user.name || user.fullName || user.email) : 'Guest Customer',
            customerEmail: user?.email || '',
            customerId: user?._id || user?.id || null,
            customerPhone: user?.phone || '0771234567',
            customerAvatar: (user?.picture || user?.avatar || user?.image) ? (user.picture || user.avatar || user.image) : '',
            smartReplacementOptIn: true
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();

            if (res.ok && data.success && data.order) {
                if (onNavigate) {
                    onNavigate('order_confirm', {
                        ...data.order,
                        pickupSlot: slotText,
                        items: cartItems.length > 0 ? cartItems : data.order.items
                    });
                }
            } else {
                // Fix #4: Show real error — don't fake a confirmation
                setSubmitError(data.message || 'Could not place order. Please try again.');
            }
        } catch (err) {
            // Fix #4: On timeout or network error, show error — never fake a confirmation
            if (err.name === 'AbortError') {
                setSubmitError('Request timed out. Please check your connection and try again.');
            } else {
                setSubmitError('Network error. Please try again.');
            }
            console.warn('Backend order creation error:', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="new-pickup-container">
            {/* 🔝 Top Navigation Bar */}
            <div className="new-pickup-header">
                <div className="new-pickup-title-group">
                    <h1 className="new-pickup-title">Choose pickup time</h1>
                    <span className="new-pickup-subtitle">Pick the most convenient slot</span>
                </div>
                <button
                    className="new-pickup-back-btn"
                    onClick={() => onNavigate && onNavigate('cart')}
                    aria-label="Go Back to Cart"
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </button>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="new-pickup-scroll-body">
                {/* Store Pickup Banner Info */}
                <div className="pickup-store-banner">
                    <div className="banner-store-icon">
                        <MapPin size={16} color="#2D7B38" />
                    </div>
                    <div className="banner-store-text">
                        <span className="banner-store-name">{storeDisplayName}</span>
                        <span className="banner-store-date">Today • Pickup Reservation</span>
                    </div>
                </div>

                {/* Time Slots Options List */}
                <div className="new-pickup-slots-list">
                    {isLoading ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Loader2 size={24} className="spin-animate" color="#2D7B38" />
                            <span>Fetching pickup slots for {storeDisplayName}...</span>
                        </div>
                    ) : (
                        timeSlots.map((slot) => {
                            const isSelected = selectedSlotId === slot.id;
                            const isFull = slot.full || slot.isBlocked;

                            let cardClass = 'new-pickup-slot-card';
                            if (isFull) cardClass += ' disabled';
                            if (isSelected && !isFull) cardClass += ' active';

                            return (
                                <div
                                    key={slot.id}
                                    className={cardClass}
                                    onClick={() => !isFull && setSelectedSlotId(slot.id)}
                                >
                                    <div className="slot-left-info">
                                        <div className={`slot-clock-box ${isSelected ? 'active' : ''}`}>
                                            <Clock size={18} color={isSelected ? '#2D7B38' : (isFull ? '#94A3B8' : '#64748B')} />
                                        </div>
                                        <div className="slot-time-group">
                                            <span className="slot-main-time">{slot.time}</span>
                                            <span className="slot-duration-text">{slot.duration}</span>
                                        </div>
                                    </div>

                                    <div className="slot-right-info">
                                        <span className={`slot-badge ${slot.badgeType || 'normal'} ${isSelected ? 'active-badge' : ''}`}>
                                            {slot.badge || slot.status}
                                        </span>
                                        <div className={`slot-radio-circle ${isSelected ? 'selected' : ''} ${isFull ? 'full-radio' : ''}`}>
                                            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="new-pickup-bottom-action-bar">
                {/* Total Row Summary */}
                <div className="new-pickup-total-row">
                    <div className="total-left-group">
                        <span className="new-pickup-total-label">Total Amount</span>
                        <span className="pickup-guarantee-text">⚡ Express counter pickup</span>
                    </div>
                    <span className="new-pickup-total-value">Rs. {totalAmount.toLocaleString()}</span>
                </div>

                <button
                    className="new-pickup-place-btn"
                    onClick={handlePlacePreOrder}
                    disabled={isSubmitting || isLoading}
                    style={{ opacity: (isSubmitting || isLoading) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="spin-animate" />
                            <span>Placing Order...</span>
                        </>
                    ) : (
                        <span>Place Pre Order</span>
                    )}
                </button>

                {/* Fix #4: Show inline error on failure */}
                {submitError && (
                    <div style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        color: '#991B1B',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        textAlign: 'center',
                        lineHeight: '1.4'
                    }}>
                        ⚠️ {submitError}
                    </div>
                )}

                <button
                    className="new-pickup-cart-btn"
                    onClick={() => onNavigate && onNavigate('cart')}
                    disabled={isSubmitting}
                >
                    Back to Cart
                </button>
            </div>
        </div>
    );
}
