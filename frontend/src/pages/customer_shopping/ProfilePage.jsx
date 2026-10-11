import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Home, Search, ShoppingCart, User, Package, Clock, ChevronRight, MapPin, Camera, XCircle, AlertTriangle, X, Loader2, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ProfilePage.css';

export default function ProfilePage({ onNavigate }) {
    const { user, logout, updateUser, deactivateAccount } = useAuth && typeof useAuth === 'function' ? useAuth() : { user: null, logout: () => { }, updateUser: () => { }, deactivateAccount: () => { } };

    const getInitials = (fullName) => {
        if (!fullName || typeof fullName !== 'string') return '';
        const clean = fullName.trim();
        if (!clean) return '';
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

    const [profileImage, setProfileImage] = useState(user?.picture || '');
    const [imageLoadError, setImageLoadError] = useState(false);
    const [name, setName] = useState(user?.name || user?.fullName || 'Kiara Fernando');
    const [email, setEmail] = useState(user?.email || 'kiara.fernando@gmail.com');
    const [phone, setPhone] = useState(user?.phone || '0772345445');
    const [location, setLocation] = useState(user?.location || 'Colombo 03');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);

    // Live Orders State from MongoDB Atlas
    const [liveOrders, setLiveOrders] = useState([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [activeOrder, setActiveOrder] = useState(null);

    // Order Cancellation State
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showCallStoreModal, setShowCallStoreModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('Ordered by mistake');
    const [isCancelling, setIsCancelling] = useState(false);

    const fileInputRef = useRef(null);

    // Sync profile state with user auth context
    useEffect(() => {
        if (user) {
            setName(user.name || user.fullName || '');
            if (user.email) setEmail(user.email);
            if (user.phone) setPhone(user.phone);
            if (user.location) setLocation(user.location);
            if (user.picture) {
                setProfileImage(user.picture);
                setImageLoadError(false);
            } else {
                setProfileImage('');
            }
        }
    }, [user]);

    // Fetch live customer orders from MongoDB Atlas backend API with 500ms ultra-fast polling & focus sync
    useEffect(() => {
        let isMounted = true;
        const fetchBackendOrders = async () => {
            try {
                const queryParams = new URLSearchParams();
                if (user?.email) queryParams.append('customerEmail', user.email);
                if (user?._id || user?.id) queryParams.append('customerId', user._id || user.id);
                if (user?.name || user?.fullName) queryParams.append('customerName', user.name || user.fullName);

                const ordersUrl = `http://localhost:5000/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
                const res = await fetch(ordersUrl);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.orders) && isMounted) {
                    setLiveOrders(data.orders);
                    if (data.orders.length > 0) {
                        // Sort by most recent
                        const sorted = [...data.orders].sort((a, b) =>
                            new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
                        );
                        // Filter for in-progress active orders (Pending, Accepted, Preparing, Ready for Pickup)
                        // Once an order is Collected, Completed, or Cancelled, it is moved to Order History!
                        const ongoingActiveOrders = sorted.filter(ord => {
                            const st = (ord.status || '').toLowerCase().trim();
                            return !['collected', 'completed', 'cancelled', 'canceled'].includes(st);
                        });
                        setActiveOrder(ongoingActiveOrders.length > 0 ? ongoingActiveOrders[0] : null);
                    } else {
                        setActiveOrder(null);
                    }
                }
            } catch (err) {
                console.warn('Backend orders fetch error:', err.message);
            } finally {
                if (isMounted) setIsLoadingOrders(false);
            }
        };

        fetchBackendOrders();

        // Fix #5: 3s polling — tab-focus trigger handles instant refresh on return
        const interval = setInterval(fetchBackendOrders, 3000);

        const handleFocus = () => {
            fetchBackendOrders();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [user?.email, user?.name, user?._id]);

    const citiesList = [
        "Colombo 01", "Colombo 02", "Colombo 03 (Colpetty)", "Colombo 04 (Bambalapitiya)",
        "Colombo 05 (Havelock Town)", "Colombo 06 (Wellawatte)", "Colombo 07 (Cinnamon Gardens)",
        "Colombo 08 (Borella)", "Dehiwala", "Mount Lavinia", "Moratuwa", "Nugegoda",
        "Maharagama", "Kotte", "Battaramulla", "Malabe", "Homagama", "Panadura",
        "Kandy", "Galle", "Matara", "Kurunegala", "Negombo", "Gampaha", "Anuradhapura",
        "Polonnaruwa", "Trincomalee", "Batticaloa", "Jaffna", "Ratnapura", "Kegalle",
        "Badulla", "Nuwara Eliya", "Hambantota", "Ampara"
    ];

    const handleConfirmCancel = async () => {
        if (!activeOrder) return;
        setIsCancelling(true);

        try {
            const orderId = activeOrder._id || activeOrder.id;
            const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled', cancellationReason: cancelReason })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setActiveOrder(null);
                setSaveMessage(`Order #${activeOrder.orderNumber} cancelled successfully in backend!`);
            } else {
                setActiveOrder(null);
                setSaveMessage(`Order #${activeOrder.orderNumber} cancelled.`);
            }
        } catch (err) {
            console.warn('Backend cancel error:', err);
            setActiveOrder(null);
            setSaveMessage(`Order #${activeOrder.orderNumber} status updated.`);
        } finally {
            setIsCancelling(false);
            setShowCancelModal(false);
            setTimeout(() => setSaveMessage(''), 4000);
        }
    };

    const handleLogout = () => {
        if (logout) logout();
        if (onNavigate) onNavigate('login');
    };

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                setImageLoadError(false);
                setProfileImage(reader.result);
                if (updateUser) await updateUser({ picture: reader.result });
                setSaveMessage('Profile picture updated & synced with backend database!');
                setTimeout(() => setSaveMessage(''), 3000);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            if (updateUser) {
                await updateUser({ name, email, phone, location, picture: profileImage });
            }
            setSaveMessage('Profile details & location updated successfully in database!');
            setTimeout(() => setSaveMessage(''), 3500);
        } catch (err) {
            setSaveMessage('Failed to update profile details.');
            setTimeout(() => setSaveMessage(''), 3500);
        }
    };

    const handleConfirmDeactivate = async () => {
        setShowDeactivateModal(false);
        if (deactivateAccount) {
            await deactivateAccount();
        }
        if (onNavigate) {
            onNavigate('login');
        }
    };

    return (
        <div className="profile-wrapper">
            {/* Header */}
            <div className="profile-header-top">
                <h1 className="profile-main-title">My profile</h1>
                <button className="logout-icon-btn" onClick={handleLogout} aria-label="Log out">
                    <LogOut size={24} color="#ef4444" />
                </button>
            </div>

            <div className="scroll-area-profile">
                {saveMessage && (
                    <div className="profile-toast-message">
                        <span>{saveMessage}</span>
                    </div>
                )}

                {/* Profile Picture with Change/Upload Option */}
                <div className="profile-pic-container">
                    <div
                        className="profile-pic-wrapper"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        title="Click to change profile picture"
                    >
                        <div className="profile-pic">
                            {profileImage && !imageLoadError ? (
                                <img
                                    src={profileImage}
                                    alt=""
                                    onError={() => setImageLoadError(true)}
                                />
                            ) : (
                                <div className="profile-avatar-fallback">
                                    {getInitials(name || user?.name || user?.fullName) ? (
                                        <span className="profile-avatar-initials">
                                            {getInitials(name || user?.name || user?.fullName)}
                                        </span>
                                    ) : (
                                        <User size={48} color="#FFFFFF" strokeWidth={2.2} />
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="camera-badge-btn"
                            aria-label="Change photo"
                        >
                            <Camera size={18} color="#FFFFFF" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <span
                        className="change-photo-text"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                        Tap photo to change
                    </span>
                </div>

                {/* Form Elements */}
                <div className="profile-form-group">
                    <label className="profile-label">Full name</label>
                    <input
                        type="text"
                        className="profile-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                    />
                </div>

                <div className="profile-form-group">
                    <label className="profile-label">Email address</label>
                    <input
                        type="email"
                        className="profile-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                    />
                </div>

                <div className="profile-form-group">
                    <label className="profile-label">Phone number</label>
                    <input
                        type="tel"
                        className="profile-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 077 123 4567"
                    />
                </div>

                <div className="profile-form-group" style={{ position: 'relative' }}>
                    <label className="profile-label">Preferred Pickup Location / City</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="profile-input"
                            value={location}
                            onChange={(e) => {
                                setLocation(e.target.value);
                                setShowCityDropdown(true);
                            }}
                            onFocus={() => setShowCityDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCityDropdown(false), 250)}
                            placeholder="Search & select city..."
                            style={{ paddingRight: '40px' }}
                        />
                        <div style={{ position: 'absolute', right: '14px', top: '14px', pointerEvents: 'none' }}>
                            <MapPin size={16} color="#2D7B38" />
                        </div>
                    </div>

                    {showCityDropdown && (
                        <div className="city-dropdown-menu" style={{
                            position: 'absolute', top: '75px', left: 0, right: 0,
                            backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
                            maxHeight: '200px', overflowY: 'auto', zIndex: 10,
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}>
                            {citiesList.filter(c => c.toLowerCase().includes(location.toLowerCase())).length > 0 ? (
                                citiesList.filter(c => c.toLowerCase().includes(location.toLowerCase())).map(city => (
                                    <div
                                        key={city}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setLocation(city);
                                            setShowCityDropdown(false);
                                        }}
                                        onClick={() => {
                                            setLocation(city);
                                            setShowCityDropdown(false);
                                        }}
                                        style={{
                                            padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
                                            cursor: 'pointer', fontSize: '14px', color: '#1E293B', fontWeight: '600'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#F8FAFC'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        {city}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '12px 16px', color: '#64748B', fontSize: '14px' }}>No matching cities found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Orders Section Synced with Live MongoDB Atlas Database */}
                <div className="profile-orders-section">
                    <h3 className="section-title">My Orders</h3>

                    {isLoadingOrders ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Loader2 size={18} className="spin-animate" color="#2D7B38" />
                            <span>Loading live orders from database...</span>
                        </div>
                    ) : activeOrder ? (
                        /* Active Live Order Card — Only shown when an order is actively in progress */
                        <div className="active-order-card">
                            <div className="ao-header">
                                <div className="ao-status-badge">
                                    <span className="ao-dot"></span> {activeOrder.status || 'Processing'}
                                </div>
                                <span className="ao-order-num">#{activeOrder.orderNumber || 'PF-0001'}</span>
                            </div>

                            <div className="ao-body">
                                <div className="ao-info">
                                    <span className="ao-store">{activeOrder.pickupStore || 'TNW Stores'}</span>
                                    <span className="ao-time">Pickup: {activeOrder.pickupDate || 'Today'}, {activeOrder.pickupTimeSlot || '4:30 PM'}</span>
                                </div>
                                <Package size={28} color="#cc7a00" className="opacity-80" />
                            </div>

                            <div className="ao-actions-row">
                                <button className="ao-track-btn" onClick={() => onNavigate && onNavigate('track', activeOrder)}>
                                    Track Order
                                </button>
                                {['pending', 'accepted'].includes((activeOrder.status || '').toLowerCase()) ? (
                                    <button className="ao-cancel-btn" onClick={() => setShowCancelModal(true)}>
                                        Cancel Order
                                    </button>
                                ) : (
                                    <button className="ao-cancel-btn" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: '600' }} onClick={() => setShowCallStoreModal(true)}>
                                        Call Store
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* My Orders Menu Item */}
                    <div className="past-orders-item" onClick={() => onNavigate && onNavigate('history')}>
                        <div className="po-icon-bg">
                            <Clock size={20} color="#347d39" />
                        </div>
                        <div className="po-text">
                            <span className="po-title">My Orders</span>
                            <span className="po-sub">View your order history</span>
                        </div>
                        <ChevronRight size={20} color="#94a3b8" />
                    </div>
                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="profile-bottom-action-bar">
                <button className="btn-primary-profile" onClick={handleUpdateProfile}>
                    Update profile
                </button>
                <button className="btn-outline-profile" onClick={() => setShowDeactivateModal(true)}>
                    Deactivate account
                </button>
            </div>

            {/* Deactivate Account Confirmation Modal */}
            {showDeactivateModal && (
                <div className="profile-cancel-modal-overlay" onClick={() => setShowDeactivateModal(false)}>
                    <div className="profile-cancel-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-modal-header">
                            <div className="cancel-modal-icon-box" style={{ background: '#FEE2E2' }}>
                                <AlertTriangle size={22} color="#DC2626" />
                            </div>
                            <div className="cancel-modal-titles">
                                <h3 className="cancel-modal-title">Deactivate Account?</h3>
                                <p className="cancel-modal-sub">This will permanently remove your PickFresh customer account from the database.</p>
                            </div>
                            <button className="modal-close-icon" onClick={() => setShowDeactivateModal(false)}>
                                <X size={18} color="#64748B" />
                            </button>
                        </div>

                        <div className="cancel-modal-actions" style={{ marginTop: '16px' }}>
                            <button className="btn-confirm-cancel" style={{ background: '#DC2626' }} onClick={handleConfirmDeactivate}>
                                Yes, Deactivate Account
                            </button>
                            <button className="btn-keep-order" onClick={() => setShowDeactivateModal(false)}>
                                Keep My Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Order Confirmation Modal */}
            {showCancelModal && (
                <div className="profile-cancel-modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="profile-cancel-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-modal-header">
                            <div className="cancel-modal-icon-box">
                                <AlertTriangle size={22} color="#DC2626" />
                            </div>
                            <div className="cancel-modal-titles">
                                <h3 className="cancel-modal-title">Cancel Order #{activeOrder?.orderNumber || 'PF-0001'}?</h3>
                                <p className="cancel-modal-sub">Are you sure you want to cancel this order in the database?</p>
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
                                {isCancelling ? 'Cancelling in Database...' : 'Yes, Cancel Order'}
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
                                <p className="cancel-modal-sub">Order #{activeOrder?.orderNumber || 'PF-1028'} in progress</p>
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
                                    <strong style={{ fontSize: '14px', color: '#1E293B' }}>{activeOrder?.pickupStore || 'PickFresh Super'}</strong>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#27672D' }}>{activeOrder?.storePhone || '077 123 4567'}</span>
                            </div>
                        </div>

                        <div className="cancel-modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                            <a
                                href={`tel:${activeOrder?.storePhone || '0771234567'}`}
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
                                Call Store Counter ({activeOrder?.storePhone || '077 123 4567'})
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
