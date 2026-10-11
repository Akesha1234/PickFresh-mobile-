import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Package, ShoppingBag, Store, Clock, AlertTriangle, X, XCircle, CheckCircle2, Loader2, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import groceryMartImg from '../../assets/GroceryMart.jpg';
import pickfreshLogoImg from '../../assets/logo.jpg';
import './LiveTrackingPage.css';

const STEPS = [
    {
        id: 1,
        statusKey: 'Pending',
        title: 'Order received',
        subtitle: 'We got your pre-order!',
        time: 'Just now',
        icon: ShoppingBag,
    },
    {
        id: 2,
        statusKey: 'Accepted',
        title: 'Accepted by shop',
        subtitle: 'Shop confirmed your order',
        time: 'In progress',
        icon: Store,
    },
    {
        id: 3,
        statusKey: 'Preparing',
        title: 'Packing your items',
        subtitle: 'Your items are being packed by shop',
        time: 'In progress',
        icon: Package,
    },
    {
        id: 4,
        statusKey: 'Ready for Pickup',
        title: 'Ready for pickup',
        subtitle: 'Head to the store counter now!',
        time: 'Ready',
        icon: Check,
    },
    {
        id: 5,
        statusKey: 'Collected',
        title: 'Order collected',
        subtitle: 'Thank you for shopping with PickFresh!',
        time: 'Completed',
        icon: CheckCircle2,
    }
];

export default function LiveTrackingPage({ onNavigate, orderDetails }) {
    const { user } = useAuth && typeof useAuth === 'function' ? useAuth() : { user: null };
    const [liveOrder, setLiveOrder] = useState(orderDetails || null);
    const [isLoading, setIsLoading] = useState(!orderDetails);

    const [completedUpTo, setCompletedUpTo] = useState(2);
    const [orderStatus, setOrderStatus] = useState(orderDetails?.status || 'Processing');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showCallStoreModal, setShowCallStoreModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('Ordered by mistake');
    const [isCancelling, setIsCancelling] = useState(false);

    // Dynamic order identifier
    const targetOrderId = liveOrder?._id || liveOrder?.id;

    // Ultra-fast real-time backend sync: Polling MongoDB Atlas every 500ms (0.5s) + Instant tab focus trigger
    useEffect(() => {
        let isMounted = true;

        const fetchLatestOrderStatus = async () => {
            try {
                if (targetOrderId) {
                    const res = await fetch(`http://localhost:5000/api/orders/${targetOrderId}`);
                    const data = await res.json();
                    if (res.ok && data.success && data.order && isMounted) {
                        setLiveOrder(data.order);
                        updateStepsFromStatus(data.order.status);
                    }
                } else {
                    // Fallback: fetch only this customer's orders to avoid cross-customer leakage
                    const queryParams = new URLSearchParams();
                    if (user?.email) queryParams.append('customerEmail', user.email);
                    if (user?._id || user?.id) queryParams.append('customerId', user._id || user.id);
                    if (user?.name || user?.fullName) queryParams.append('customerName', user.name || user.fullName);
                    const fallbackUrl = `http://localhost:5000/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
                    const res = await fetch(fallbackUrl);
                    const data = await res.json();
                    if (res.ok && data.success && Array.isArray(data.orders) && data.orders.length > 0 && isMounted) {
                        // Sort by latest order date descending, show the most recent active order
                        const sorted = [...data.orders].sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
                        const latest = sorted[0];
                        setLiveOrder(latest);
                        updateStepsFromStatus(latest.status);
                    }
                }
            } catch (err) {
                console.warn('Live tracking polling error:', err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchLatestOrderStatus();

        // Fix #5: 3s polling (tab-focus trigger handles instant refresh on return)
        const interval = setInterval(fetchLatestOrderStatus, 3000);

        const handleFocus = () => {
            fetchLatestOrderStatus();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [targetOrderId]);

    const updateStepsFromStatus = (statusStr) => {
        const normalized = (statusStr || '').toLowerCase();
        setOrderStatus(statusStr);

        if (normalized === 'cancelled') {
            setCompletedUpTo(0);
        } else if (normalized === 'pending') {
            setCompletedUpTo(1);
        } else if (normalized === 'accepted') {
            setCompletedUpTo(2);
        } else if (normalized === 'preparing' || normalized === 'processing' || normalized === 'packing') {
            setCompletedUpTo(3);
        } else if (normalized === 'ready for pickup' || normalized === 'ready') {
            setCompletedUpTo(4);
        } else if (normalized === 'collected' || normalized === 'completed') {
            setCompletedUpTo(5);
        } else {
            setCompletedUpTo(2);
        }
    };

    const normStatus = (orderStatus || '').toLowerCase();
    const isCancelled = normStatus === 'cancelled';
    const isAllDone = completedUpTo >= STEPS.length && !isCancelled;
    const canSelfCancel = ['pending', 'accepted'].includes(normStatus);
    const isPreparingOrReady = ['preparing', 'processing', 'packing', 'ready for pickup', 'ready'].includes(normStatus);

    const handleConfirmCancel = async () => {
        if (!liveOrder) return;
        setIsCancelling(true);

        const orderId = liveOrder._id || liveOrder.id;
        try {
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled', cancellationReason: cancelReason, isCustomer: true })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setOrderStatus('Cancelled');
                setShowCancelModal(false);
            } else {
                alert(data.message || 'Cannot cancel this order at the current stage.');
                setShowCancelModal(false);
            }
        } catch (err) {
            setOrderStatus('Cancelled');
            setShowCancelModal(false);
        } finally {
            setIsCancelling(false);
        }
    };

    const orderNumberDisplay = liveOrder?.orderNumber ? liveOrder.orderNumber.replace('#', '') : (liveOrder?._id ? String(liveOrder._id).slice(-6).toUpperCase() : '');
    const pickupStoreDisplay = liveOrder?.pickupStore || 'PickFresh Super';
    const pickupTimeDisplay = liveOrder?.pickupTimeSlot || liveOrder?.pickupSlot || 'Today';

    const [storePicture, setStorePicture] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchStorePic = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/customer-shopping/stores');
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.stores) && isMounted) {
                    const storeNameClean = (pickupStoreDisplay || '').toLowerCase();
                    const matched = data.stores.find(s => {
                        const sName = (s.name || '').toLowerCase();
                        return storeNameClean.includes(sName) || sName.includes(storeNameClean.split('•')[0].trim());
                    });
                    if (matched && matched.picture) {
                        setStorePicture(matched.picture);
                    }
                }
            } catch (err) {
                console.warn('Store picture fetch error:', err.message);
            }
        };
        fetchStorePic();
        return () => { isMounted = false; };
    }, [pickupStoreDisplay]);

    const storeLogoUrl = storePicture || liveOrder?.storeImage || liveOrder?.storePicture || liveOrder?.storeLogo || (
        (pickupStoreDisplay || '').toLowerCase().includes('grocerymart') ? groceryMartImg :
            (pickupStoreDisplay || '').toLowerCase().includes('pickfresh') ? pickfreshLogoImg :
                (pickupStoreDisplay || '').toLowerCase().includes('tnw') ? groceryMartImg : null
    );

    // Render loading indicator while fetching real database order
    if (isLoading && !liveOrder) {
        return (
            <div className="lt-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', gap: '16px' }}>
                <Loader2 size={36} className="spin-animate" color="#2D7B38" />
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: '0 0 4px 0' }}>Loading live order status...</h3>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Syncing with MongoDB database</p>
                </div>
            </div>
        );
    }

    // Render empty state if no real order exists
    if (!isLoading && !liveOrder) {
        return (
            <div className="lt-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', gap: '16px', padding: '24px', textAlign: 'center' }}>
                <ShoppingBag size={48} color="#94A3B8" />
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1E293B', margin: '0 0 6px 0' }}>No Active Order Found</h3>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Place a pre-order from cart to start live tracking.</p>
                </div>
                <button
                    className="lt-cta-btn"
                    style={{ marginTop: '12px', width: 'auto', padding: '12px 24px' }}
                    onClick={() => onNavigate && onNavigate('home')}
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="lt-container">

            {/* Header Row */}
            <div className="lt-header-row">
                <div>
                    <h1 className="lt-title">Live tracking</h1>
                    {!isAllDone && !isCancelled && (
                        <div className="lt-live-badge">
                            <span className="lt-live-dot" />
                            LIVE SYNC
                        </div>
                    )}
                </div>
                <button
                    className="lt-back-btn"
                    onClick={() => onNavigate && onNavigate('home')}
                    aria-label="Go back"
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </button>
            </div>

            {/* Order Info Card */}
            <div className={`lt-order-card ${isCancelled ? 'lt-card-cancelled' : ''}`}>
                <div className="lt-order-top-row">
                    <div className="lt-store-avatar-wrapper">
                        {storeLogoUrl ? (
                            <img
                                src={storeLogoUrl}
                                alt={pickupStoreDisplay}
                                className="lt-store-avatar-img"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="lt-store-avatar-icon" style={{ display: storeLogoUrl ? 'none' : 'flex' }}>
                            <Store size={22} color="#2D7B38" />
                        </div>
                    </div>

                    <div className="lt-order-details-col">
                        <div className="lt-order-id-row">
                            <h2 className="lt-order-id">Order #{orderNumberDisplay}</h2>
                            <div className={`lt-status-pill ${isCancelled ? 'cancelled' : (isAllDone ? 'done' : 'processing')}`}>
                                {isCancelled ? '✕ Cancelled' : (isAllDone ? '✓ Ready' : `● ${orderStatus || 'Processing'}`)}
                            </div>
                        </div>

                        <div className="lt-store-name-line">
                            <MapPin size={13} color="#2D7B38" style={{ flexShrink: 0 }} />
                            <span className="lt-store-name">{pickupStoreDisplay}</span>
                        </div>

                        <div className="lt-pickup-time-line">
                            <Clock size={13} color="#64748B" style={{ flexShrink: 0 }} />
                            <span>Pickup: {pickupTimeDisplay}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="lt-progress-track">
                    <div
                        className={`lt-progress-fill ${isCancelled ? 'cancelled-fill' : ''}`}
                        style={{ width: isCancelled ? '100%' : `${(completedUpTo / STEPS.length) * 100}%` }}
                    />
                </div>
                <div className="lt-progress-labels">
                    <span>{isCancelled ? 'Order reservation cancelled' : `${completedUpTo} of ${STEPS.length} steps completed`}</span>
                    <span>{isCancelled ? 'Cancelled' : `${Math.round((completedUpTo / STEPS.length) * 100)}%`}</span>
                </div>
            </div>

            {/* Stepper */}
            {!isCancelled && (
                <div className="lt-stepper">
                    {STEPS.map((step, index) => {
                        const isDone = index < completedUpTo;
                        const isCurrent = index === completedUpTo - 1 && !isAllDone;
                        const isPending = index >= completedUpTo;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="lt-step-row">
                                {/* Left column: node + connector */}
                                <div className="lt-step-left">
                                    <div
                                        className={`lt-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
                                    >
                                        {isDone ? (
                                            <Check size={16} color="#fff" strokeWidth={3} />
                                        ) : (
                                            <Icon size={15} color={isCurrent ? '#fff' : '#94A3B8'} />
                                        )}
                                        {isCurrent && <span className="lt-pulse-ring" />}
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`lt-connector ${isDone ? 'done' : 'pending'}`}>
                                            {isDone && <div className="lt-connector-fill" />}
                                        </div>
                                    )}
                                </div>

                                {/* Right column: text */}
                                <div className="lt-step-right">
                                    <div className="lt-step-info">
                                        <div>
                                            <p className={`lt-step-title ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}>
                                                {step.title}
                                            </p>
                                            <p className={`lt-step-sub ${isPending ? 'muted' : ''}`}>
                                                {isCurrent ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} color="#D97706" />
                                                        Shop is processing this step...
                                                    </span>
                                                ) : step.subtitle}
                                            </p>
                                        </div>
                                        {isDone && (
                                            <span className="lt-step-time">
                                                <Clock size={10} style={{ marginRight: 3 }} />
                                                Updated
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span className="lt-step-time current-time">Now</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Estimated Ready Box or Cancelled Box */}
            {isCancelled ? (
                <div className="lt-eta-box cancelled-eta">
                    <div className="lt-eta-icon-container cancelled">
                        <XCircle size={22} color="#DC2626" />
                    </div>
                    <div>
                        <p className="lt-eta-label" style={{ color: '#991B1B' }}>Order has been cancelled</p>
                        <p className="lt-eta-value" style={{ color: '#7F1D1D' }}>Reservation released in MongoDB Atlas database.</p>
                    </div>
                </div>
            ) : (
                <div className={`lt-eta-box ${isAllDone ? 'ready' : ''}`}>
                    {isAllDone ? (
                        <>
                            <div className="lt-eta-icon-container ready">
                                <CheckCircle2 size={22} color="#166534" />
                            </div>
                            <div>
                                <p className="lt-eta-label">Order is ready for pickup!</p>
                                <p className="lt-eta-value">Head to {pickupStoreDisplay} pickup counter</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="lt-eta-icon-container">
                                <Clock size={22} color="#2D7B38" />
                            </div>
                            <div>
                                <p className="lt-eta-label">Status updated live</p>
                                <p className="lt-eta-value">Estimated pickup: {pickupTimeDisplay}</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Action Buttons Group */}
            <div className="lt-actions-group">
                {!isCancelled ? (
                    <>
                        <button
                            className="lt-cta-btn"
                            onClick={() => onNavigate && onNavigate('home')}
                        >
                            Back to Home
                        </button>

                        {!isAllDone && canSelfCancel && (
                            <button
                                className="lt-cancel-action-btn"
                                onClick={() => setShowCancelModal(true)}
                            >
                                Cancel Order
                            </button>
                        )}

                        {!isAllDone && !canSelfCancel && isPreparingOrReady && (
                            <button
                                className="lt-secondary-btn"
                                style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: '600' }}
                                onClick={() => setShowCallStoreModal(true)}
                            >
                                Call Store to Cancel
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button
                            className="lt-cta-btn"
                            onClick={() => onNavigate && onNavigate('history')}
                        >
                            View in Past Orders
                        </button>
                        <button
                            className="lt-secondary-btn"
                            onClick={() => onNavigate && onNavigate('home')}
                        >
                            Back to Home
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Spacer to ensure full visibility above fixed bottom nav bar */}
            <div style={{ height: '70px', minHeight: '70px', width: '100%', flexShrink: 0 }} />

            {/* Cancellation Modal Sheet */}
            {showCancelModal && (
                <div className="profile-cancel-modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="profile-cancel-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-modal-header">
                            <div className="cancel-modal-icon-box">
                                <AlertTriangle size={22} color="#DC2626" />
                            </div>
                            <div className="cancel-modal-titles">
                                <h3 className="cancel-modal-title">Cancel Order #{orderNumberDisplay}?</h3>
                                <p className="cancel-modal-sub">Are you sure you want to cancel this order in database?</p>
                            </div>
                            <button className="modal-close-icon" onClick={() => setShowCancelModal(false)}>
                                <X size={18} color="#64748B" />
                            </button>
                        </div>

                        <div className="cancel-modal-body">
                            <label className="cancel-reason-label">Select reason for cancellation:</label>
                            <div className="cancel-reasons-list">
                                {[
                                    'Ordered by mistake',
                                    'Selected wrong pickup slot/time',
                                    'Changed my mind',
                                    'Other reason'
                                ].map((reason, i) => (
                                    <label key={i} className={`cancel-reason-option ${cancelReason === reason ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="cancelReason"
                                            value={reason}
                                            checked={cancelReason === reason}
                                            onChange={() => setCancelReason(reason)}
                                        />
                                        <span>{reason}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="cancel-modal-actions">
                            <button className="btn-confirm-cancel" onClick={handleConfirmCancel} disabled={isCancelling}>
                                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                            </button>
                            <button className="btn-keep-order" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>
                                Keep Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Call Store Custom Mobile Modal Overlay Sheet */}
            {showCallStoreModal && (
                <div className="profile-cancel-modal-overlay" onClick={() => setShowCallStoreModal(false)}>
                    <div className="profile-cancel-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-modal-header">
                            <div className="cancel-modal-icon-box" style={{ backgroundColor: '#FEF3C7' }}>
                                <Phone size={22} color="#D97706" />
                            </div>
                            <div className="cancel-modal-titles">
                                <h3 className="cancel-modal-title">Order Items Being Packed</h3>
                                <p className="cancel-modal-sub">Order #{orderNumberDisplay} in progress at store</p>
                            </div>
                            <button className="modal-close-icon" onClick={() => setShowCallStoreModal(false)}>
                                <X size={18} color="#64748B" />
                            </button>
                        </div>

                        <div className="cancel-modal-body" style={{ padding: '16px 0' }}>
                            <div style={{
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '14px',
                                padding: '14px',
                                color: '#92400E',
                                fontSize: '13.5px',
                                lineHeight: '1.5'
                            }}>
                                <strong>Items Packing Notice:</strong> Store staff has already started picking and packing your items for pickup. To request a cancellation or change, please contact the store counter directly.
                            </div>

                            <div style={{
                                marginTop: '14px',
                                padding: '14px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '14px',
                                border: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', display: 'block' }}>Store Counter Contact</span>
                                    <strong style={{ fontSize: '14px', color: '#1E293B' }}>{pickupStoreDisplay}</strong>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#27672D' }}>{liveOrder?.storePhone || '077 123 4567'}</span>
                            </div>
                        </div>

                        <div className="cancel-modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                            <a
                                href={`tel:${liveOrder?.storePhone || '0771234567'}`}
                                className="btn-confirm-cancel"
                                style={{
                                    backgroundColor: '#27672D',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '14px',
                                    borderRadius: '14px',
                                    fontWeight: '700'
                                }}
                            >
                                <Phone size={16} />
                                Call Store Counter ({liveOrder?.storePhone || '077 123 4567'})
                            </a>
                            <button
                                className="btn-keep-order"
                                onClick={() => setShowCallStoreModal(false)}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
