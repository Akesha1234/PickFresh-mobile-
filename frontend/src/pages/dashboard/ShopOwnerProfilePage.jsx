import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, LogOut, Store, Phone, Mail, MapPin, CheckCircle2, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ShopOwnerProfilePage.css';

export default function ShopOwnerProfilePage({ onNavigate }) {
    const { logout, user, updateUser, deactivateAccount } = useAuth && typeof useAuth === 'function' ? useAuth() : { logout: () => { }, user: null, updateUser: () => { }, deactivateAccount: () => { } };

    const defaultAvatar = user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.shopName || user?.name || 'Shop Owner')}&background=2D7B38&color=fff&size=150`;
    const [profileImage, setProfileImage] = useState(defaultAvatar);
    const [shopName, setShopName] = useState(user?.shopName || user?.name || '');
    const [ownerName, setOwnerName] = useState(user?.ownerName || user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');
    const [address, setAddress] = useState(user?.storeAddress || '');
    const [location, setLocation] = useState(user?.location || '');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [isOpen, setIsOpen] = useState(user?.storeStatus === 'open' || user?.storeStatus === undefined);
    const [saveToast, setSaveToast] = useState('');
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    useEffect(() => {
        if (user) {
            setShopName(user.shopName || user.name || '');
            setOwnerName(user.ownerName || user.name || '');
            setPhone(user.phone || '');
            setEmail(user.email || '');
            setLocation(user.location || '');
            setAddress(user.storeAddress || '');
            setIsOpen(user.storeStatus === 'open' || user.storeStatus === undefined);
            if (user.picture) setProfileImage(user.picture);
        }
    }, [user]);

    const fileInputRef = useRef(null);

    const citiesList = [
        "Colombo 01", "Colombo 02", "Colombo 03 (Colpetty)", "Colombo 04 (Bambalapitiya)",
        "Colombo 05 (Havelock Town)", "Colombo 06 (Wellawatte)", "Colombo 07 (Cinnamon Gardens)",
        "Colombo 08 (Borella)", "Dehiwala", "Mount Lavinia", "Moratuwa", "Nugegoda",
        "Maharagama", "Kotte", "Battaramulla", "Malabe", "Homagama", "Panadura",
        "Kandy", "Galle", "Matara", "Kurunegala", "Negombo", "Gampaha", "Anuradhapura",
        "Polonnaruwa", "Trincomalee", "Batticaloa", "Jaffna", "Ratnapura", "Kegalle",
        "Badulla", "Nuwara Eliya", "Hambantota", "Ampara"
    ];

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
                if (updateUser) updateUser({ picture: reader.result });
                setSaveToast('Store logo updated successfully!');
                setTimeout(() => setSaveToast(''), 3000);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (updateUser) {
            await updateUser({
                shopName,
                ownerName,
                name: ownerName || user?.name,
                phone,
                storeAddress: address,
                location: location,
                storeStatus: isOpen ? 'open' : 'closed'
            });
        }
        setSaveToast('Store profile updated successfully in MongoDB Atlas!');
        setTimeout(() => setSaveToast(''), 3000);
    };

    const handleLogout = () => {
        if (logout) logout();
        if (onNavigate) onNavigate('login');
    };

    const handleConfirmDeactivate = async () => {
        setIsDeactivating(true);
        try {
            if (deactivateAccount) {
                await deactivateAccount();
            }
        } catch (err) {
            console.warn('Deactivation failed:', err);
        } finally {
            setIsDeactivating(false);
            setShowDeactivateModal(false);
            if (onNavigate) onNavigate('login');
        }
    };

    return (
        <div className="so-profile-container">
            {/* Header Navigation */}
            <div className="so-profile-top-nav">
                <button
                    className="so-profile-back-btn"
                    onClick={() => onNavigate && onNavigate('dashboard')}
                    aria-label="Back to dashboard"
                >
                    <ArrowLeft size={20} />
                </button>

                <h1 className="so-profile-title">Store Profile</h1>

                <button className="so-logout-btn" onClick={handleLogout} title="Log out">
                    <LogOut size={16} /> Logout
                </button>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="so-profile-scroll-body">
                {/* Save Confirmation Toast */}
                {saveToast && (
                    <div style={{
                        backgroundColor: '#DCFCE7',
                        border: '1px solid #86EFAC',
                        color: '#166534',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        textAlign: 'center',
                        marginBottom: '16px'
                    }}>
                        {saveToast}
                    </div>
                )}

                {/* Avatar & Store Info Header */}
                <div className="so-avatar-section">
                    <div
                        className="so-avatar-wrap"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        style={{ cursor: 'pointer' }}
                        title="Click to change store logo"
                    >
                        <img
                            src={profileImage}
                            alt="Store Logo"
                            className="so-avatar-img"
                        />
                        <button type="button" className="so-camera-btn" aria-label="Change photo">
                            <Camera size={14} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <h2 className="so-store-name">{shopName || 'My Store'}</h2>
                    <span className="so-role-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={14} color="#166534" />
                        Verified Store Manager
                    </span>
                </div>

                {/* Store Operational Status Card */}
                <div className="so-status-card">
                    <div className="so-status-left">
                        <span className="so-status-title">Store Status</span>
                        <span className="so-status-sub">Receiving customer pre-orders</span>
                    </div>
                    <div
                        className="so-status-pill"
                        onClick={async () => {
                            const newStatus = !isOpen;
                            setIsOpen(newStatus);
                            if (updateUser) {
                                await updateUser({ storeStatus: newStatus ? 'open' : 'closed' });
                                setSaveToast(`Store marked as ${newStatus ? 'OPEN' : 'CLOSED'}`);
                                setTimeout(() => setSaveToast(''), 3000);
                            }
                        }}
                        style={{
                            cursor: 'pointer',
                            backgroundColor: isOpen ? '#E8F5E9' : '#FEE2E2',
                            color: isOpen ? '#2E7D32' : '#B91C1C'
                        }}
                    >
                        <div className="so-status-dot" style={{ backgroundColor: isOpen ? '#2E7D32' : '#B91C1C' }}></div>
                        <span>{isOpen ? 'STORE OPEN' : 'STORE CLOSED'}</span>
                    </div>
                </div>

                {/* Editable Profile Form */}
                <div className="so-form-group">
                    <label className="so-label">Shop / Business Name</label>
                    <input
                        type="text"
                        className="so-input"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="Enter store name"
                    />
                </div>

                <div className="so-form-group">
                    <label className="so-label">Owner / Manager Name</label>
                    <input
                        type="text"
                        className="so-input"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Owner full name"
                    />
                </div>

                <div className="so-form-group">
                    <label className="so-label">Contact Phone</label>
                    <input
                        type="tel"
                        className="so-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contact phone number"
                    />
                </div>

                <div className="so-form-group">
                    <label className="so-label">Email Address</label>
                    <input
                        type="email"
                        className="so-input"
                        value={email}
                        disabled
                        style={{ backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                    />
                </div>

                <div className="so-form-group" style={{ position: 'relative' }}>
                    <label className="so-label">Store Location / City</label>
                    <input
                        type="text"
                        className="so-input"
                        value={location}
                        onChange={(e) => {
                            setLocation(e.target.value);
                            setShowCityDropdown(true);
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                        placeholder="Search and select city (e.g. Colombo 03, Kandy)..."
                    />

                    {showCityDropdown && (
                        <div className="city-dropdown-menu" style={{
                            position: 'absolute', top: '75px', left: 0, right: 0,
                            backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
                            maxHeight: '180px', overflowY: 'auto', zIndex: 10,
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}>
                            {citiesList.filter(c => c.toLowerCase().includes(location.toLowerCase())).length > 0 ? (
                                citiesList.filter(c => c.toLowerCase().includes(location.toLowerCase())).map(city => (
                                    <div
                                        key={city}
                                        onClick={() => {
                                            setLocation(city);
                                            setShowCityDropdown(false);
                                        }}
                                        style={{
                                            padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
                                            cursor: 'pointer', fontSize: '14px', color: '#1E293B'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#F8FAFC'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        {city}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '12px 16px', color: '#64748B', fontSize: '14px' }}>No cities found</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="so-form-group">
                    <label className="so-label">Store Street Address</label>
                    <input
                        type="text"
                        className="so-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Full street address (e.g. No 45, Main Street)"
                    />
                </div>

            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="so-bottom-action-bar">
                <button className="so-btn-primary" onClick={handleSave}>
                    Update Store Profile
                </button>
                <button
                    type="button"
                    className="btn-outline-profile"
                    onClick={() => setShowDeactivateModal(true)}
                >
                    Deactivate Store Account
                </button>
            </div>

            {/* Deactivate Store Account Confirmation Modal */}
            {showDeactivateModal && (
                <div className="profile-cancel-modal-overlay" onClick={() => !isDeactivating && setShowDeactivateModal(false)}>
                    <div className="profile-cancel-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-modal-header">
                            <div className="cancel-modal-icon-box">
                                <AlertTriangle size={20} color="#DC2626" />
                            </div>
                            <div className="cancel-modal-titles">
                                <h3 className="cancel-modal-title">Deactivate Store Account?</h3>
                                <p className="cancel-modal-sub">Permanent deletion warning</p>
                            </div>
                            <button
                                className="modal-close-icon"
                                onClick={() => !isDeactivating && setShowDeactivateModal(false)}
                                disabled={isDeactivating}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="cancel-modal-body" style={{ marginBottom: '16px' }}>
                            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: '1.5' }}>
                                Are you sure you want to deactivate your store account?
                            </p>
                            <p style={{ margin: '8px 0 0 0', fontSize: '12.5px', color: '#DC2626', fontWeight: '600', lineHeight: '1.4' }}>
                                ⚠️ All store products, inventory records, and restock purchase orders will be permanently deleted from the database.
                            </p>
                        </div>
                        <div className="cancel-modal-actions">
                            <button
                                className="btn-confirm-cancel"
                                onClick={handleConfirmDeactivate}
                                disabled={isDeactivating}
                            >
                                {isDeactivating ? 'Deactivating Store...' : 'Yes, Deactivate & Delete Everything'}
                            </button>
                            <button
                                className="btn-keep-order"
                                onClick={() => setShowDeactivateModal(false)}
                                disabled={isDeactivating}
                            >
                                Keep Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
