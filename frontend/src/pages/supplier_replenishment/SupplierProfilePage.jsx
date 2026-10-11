import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, LogOut, Truck, Phone, Mail, MapPin, CheckCircle2, ShieldCheck, Tag, Building, Globe, X, Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CITIES_LIST } from '../../utils/cities';
import { SUPPLY_CATEGORIES } from '../../utils/categories';
import './SupplierProfilePage.css';

export default function SupplierProfilePage({ onNavigate }) {
    const { logout, user, updateUser, deactivateAccount } = useAuth && typeof useAuth === 'function' ? useAuth() : { logout: () => { }, user: null, updateUser: () => { }, deactivateAccount: () => { } };

    const defaultAvatar = user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.supplierName || user?.name || 'Supplier')}&background=15803D&color=fff&size=150`;
    const [profileImage, setProfileImage] = useState(defaultAvatar);
    const [supplierName, setSupplierName] = useState(user?.supplierName || user?.name || '');
    const [contactPerson, setContactPerson] = useState(user?.contactPerson || '');
    const [selectedSupplyCategories, setSelectedSupplyCategories] = useState([]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [selectedSupplyRegions, setSelectedSupplyRegions] = useState([]);
    const [citySearch, setCitySearch] = useState('');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [saveToast, setSaveToast] = useState('');
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const defaultFleet = [
        { id: '1', name: 'Kamal Wijekoon', phone: '0771234567', vehicleNo: 'WP-GA-4521', status: 'Active' },
        { id: '2', name: 'Nimal Perera', phone: '0719876543', vehicleNo: 'WP-GB-8812', status: 'Active' }
    ];

    const [driversList, setDriversList] = useState(user?.driversList || defaultFleet);
    const [showAddDriverModal, setShowAddDriverModal] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', phone: '', vehicleNo: '' });
    const [editingDriver, setEditingDriver] = useState(null);
    const [driverName, setDriverName] = useState(user?.driverName || user?.defaultDriverName || 'Kamal Wijekoon');
    const [vehicleNo, setVehicleNo] = useState(user?.vehicleNo || user?.defaultVehicleNo || 'WP-GA-4521');

    useEffect(() => {
        if (user) {
            setSupplierName(user.supplierName || user.name || '');
            setContactPerson(user.contactPerson || '');
            setDriverName(user.driverName || user.defaultDriverName || 'Kamal Wijekoon');
            setVehicleNo(user.vehicleNo || user.defaultVehicleNo || 'WP-GA-4521');
            if (user.driversList && Array.isArray(user.driversList)) {
                setDriversList(user.driversList);
            }

            let initialCategories = [];
            if (Array.isArray(user.supplyCategories) && user.supplyCategories.length > 0) {
                initialCategories = user.supplyCategories;
            } else if (user.supplyCategory) {
                initialCategories = user.supplyCategory.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                initialCategories = ["Fresh Produce (Vegetables & Fruits)"];
            }
            setSelectedSupplyCategories(initialCategories);

            let initialRegions = [];
            if (Array.isArray(user.supplyRegions) && user.supplyRegions.length > 0) {
                initialRegions = user.supplyRegions;
            } else if (user.supplyRegion) {
                initialRegions = user.supplyRegion.split(',').map(s => s.trim()).filter(Boolean);
            } else if (user.location) {
                initialRegions = [user.location];
            } else {
                initialRegions = ["Colombo 03 (Colpetty)"];
            }
            setSelectedSupplyRegions(initialRegions);
            setPhone(user.phone || '');
            setEmail(user.email || '');
            if (user.picture) setProfileImage(user.picture);
        }
    }, [user]);

    const handleAddDriver = async (e) => {
        e.preventDefault();
        if (!newDriver.name || !newDriver.vehicleNo) return;

        const driverObj = {
            id: String(Date.now()),
            name: newDriver.name,
            phone: newDriver.phone || '0770000000',
            vehicleNo: newDriver.vehicleNo,
            status: 'Active'
        };

        const updatedFleet = [...driversList, driverObj];
        setDriversList(updatedFleet);
        setNewDriver({ name: '', phone: '', vehicleNo: '' });
        setShowAddDriverModal(false);

        if (updateUser) {
            await updateUser({ driversList: updatedFleet });
        }
        setSaveToast(`Driver ${driverObj.name} added to fleet in MongoDB! 🚛`);
        setTimeout(() => setSaveToast(''), 3000);
    };

    const handleUpdateDriver = async (e) => {
        e.preventDefault();
        if (!editingDriver || !editingDriver.name || !editingDriver.vehicleNo) return;

        const updatedFleet = driversList.map(d => d.id === editingDriver.id ? editingDriver : d);
        setDriversList(updatedFleet);
        setEditingDriver(null);

        if (updateUser) {
            await updateUser({ driversList: updatedFleet });
        }
        setSaveToast(`Driver ${editingDriver.name} updated in fleet in MongoDB! 🚛`);
        setTimeout(() => setSaveToast(''), 3000);
    };

    const handleRemoveDriver = async (id) => {
        const updatedFleet = driversList.filter(d => d.id !== id);
        setDriversList(updatedFleet);
        if (updateUser) {
            await updateUser({ driversList: updatedFleet });
        }
        setSaveToast('Driver removed from fleet in MongoDB.');
        setTimeout(() => setSaveToast(''), 3000);
    };

    const fileInputRef = useRef(null);

    const citiesList = CITIES_LIST;
    const [categoriesList, setCategoriesList] = useState(SUPPLY_CATEGORIES);

    useEffect(() => {
        fetch('http://localhost:5000/api/product-inventory/categories')
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.categories)) {
                    const names = data.categories.map(c => c.name).filter(Boolean);
                    if (names.length > 0) setCategoriesList(names);
                }
            })
            .catch(err => console.warn('Failed to fetch live categories for profile:', err));
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
                if (updateUser) updateUser({ picture: reader.result });
                setSaveToast('Supplier logo updated successfully!');
                setTimeout(() => setSaveToast(''), 3000);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        const formattedRegionStr = selectedSupplyRegions.length > 0 ? selectedSupplyRegions.join(', ') : 'Colombo 03 (Colpetty)';
        const formattedCategoryStr = selectedSupplyCategories.length > 0 ? selectedSupplyCategories.join(', ') : 'Fresh Produce (Vegetables & Fruits)';
        if (updateUser) {
            await updateUser({
                supplierName,
                contactPerson,
                driverName,
                defaultDriverName: driverName,
                vehicleNo,
                defaultVehicleNo: vehicleNo,
                driversList,
                name: supplierName || user?.name,
                phone,
                supplyCategories: selectedSupplyCategories,
                supplyCategory: formattedCategoryStr,
                supplyRegions: selectedSupplyRegions,
                supplyRegion: formattedRegionStr,
                location: formattedRegionStr
            });
        }
        setSaveToast('Supplier profile & driver fleet details updated successfully in MongoDB Atlas!');
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
        <div className="supp-profile-container">
            {/* Header Navigation */}
            <div className="supp-profile-top-nav">
                <h1 className="supp-profile-title">Supplier Profile</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="supp-logout-btn" onClick={handleLogout} title="Log out">
                        <LogOut size={16} /> Logout
                    </button>

                    <button
                        className="supplier-back-btn-right"
                        onClick={() => onNavigate && onNavigate('home')}
                        aria-label="Back to dashboard"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} color="#1E293B" />
                    </button>
                </div>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="supp-profile-scroll-body">
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

                {/* Avatar & Supplier Info Header */}
                <div className="supp-avatar-section">
                    <div
                        className="supp-avatar-wrap"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        style={{ cursor: 'pointer' }}
                        title="Click to change logo"
                    >
                        <img
                            src={profileImage}
                            alt="Supplier Logo"
                            className="supp-avatar-img"
                        />
                        <button type="button" className="supp-camera-btn" aria-label="Change photo">
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
                    <h2 className="supp-business-name">{supplierName || 'My Supplier Business'}</h2>
                    <span className="supp-role-badge">
                        <ShieldCheck size={14} color="#15803D" />
                        Verified Supply Partner
                    </span>
                </div>

                {/* Premium Supplier Verification Card */}
                <div className="supp-status-card">
                    <div className="supp-status-left">
                        <span className="supp-status-title">
                            <CheckCircle2 size={17} color="#059669" /> Supply Account Active
                        </span>
                    </div>
                    <div className="supp-status-pill">
                        <div className="supp-status-dot"></div>
                        <span>ACTIVE PARTNER</span>
                    </div>
                </div>

                {/* Form Fields Stack */}
                <div className="supp-form-group">
                    <label className="supp-label">
                        <Building size={14} /> Supplier / Business Name
                    </label>
                    <input
                        type="text"
                        className="supp-input"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="e.g. Nuwara Eliya Organic Farms"
                    />
                </div>

                <div className="supp-form-group">
                    <label className="supp-label">
                        <Truck size={14} /> Contact Person Name
                    </label>
                    <input
                        type="text"
                        className="supp-input"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Contact person full name"
                    />
                </div>



                {/* Multi-Category Supply Selector Component */}
                <div className="supp-form-group" style={{ position: 'relative' }}>
                    <label className="supp-label">
                        <Tag size={14} /> Supply Categories ({selectedSupplyCategories.length})
                    </label>

                    {/* Displayed Selected Categories Badges */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '8px',
                        minHeight: '38px',
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px'
                    }}>
                        {selectedSupplyCategories.length === 0 ? (
                            <span style={{ fontSize: '12px', color: '#94A3B8', padding: '2px 4px' }}>
                                No categories selected. Click below to add supply categories.
                            </span>
                        ) : (
                            selectedSupplyCategories.map(cat => (
                                <span
                                    key={cat}
                                    style={{
                                        backgroundColor: '#FEF3C7',
                                        color: '#B45309',
                                        border: '1px solid #FDE68A',
                                        borderRadius: '16px',
                                        padding: '4px 10px',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Tag size={12} />
                                    {cat}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSupplyCategories(selectedSupplyCategories.filter(c => c !== cat))}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: 0,
                                            color: '#B45309'
                                        }}
                                        title="Remove category"
                                    >
                                        <X size={13} />
                                    </button>
                                </span>
                            ))
                        )}
                    </div>

                    {/* Add Category Dropdown Button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            className="supp-input"
                            style={{
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: selectedSupplyCategories.length > 0 ? '#1E293B' : '#94A3B8'
                            }}
                        >
                            <span>+ Select and Add Supply Categories...</span>
                            <Plus size={16} color="#64748B" />
                        </button>

                        {showCategoryDropdown && (
                            <div className="city-dropdown-menu" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
                                maxHeight: '190px', overflowY: 'auto', zIndex: 40,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginTop: '4px'
                            }}>
                                {categoriesList.filter(c => !selectedSupplyCategories.includes(c)).length > 0 ? (
                                    categoriesList
                                        .filter(c => !selectedSupplyCategories.includes(c))
                                        .map(cat => (
                                            <div
                                                key={cat}
                                                onClick={() => {
                                                    setSelectedSupplyCategories([...selectedSupplyCategories, cat]);
                                                    setShowCategoryDropdown(false);
                                                }}
                                                style={{
                                                    padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
                                                    cursor: 'pointer', fontSize: '13.5px', color: '#1E293B',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#FEF3C7'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                            >
                                                <span>{cat}</span>
                                                <Plus size={14} color="#B45309" />
                                            </div>
                                        ))
                                ) : (
                                    <div style={{ padding: '12px 16px', color: '#64748B', fontSize: '13px' }}>
                                        All categories selected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Multi-City Supply Region Selector Component */}
                <div className="supp-form-group" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="supp-label" style={{ margin: 0 }}>
                            <MapPin size={14} /> Supply Regions / Cities ({selectedSupplyRegions.length})
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const islandwideStr = "Islandwide";
                                if (selectedSupplyRegions.includes(islandwideStr)) {
                                    setSelectedSupplyRegions(selectedSupplyRegions.filter(c => c !== islandwideStr));
                                } else {
                                    setSelectedSupplyRegions([islandwideStr, ...selectedSupplyRegions]);
                                }
                            }}
                            style={{
                                border: 'none',
                                background: selectedSupplyRegions.includes("Islandwide") ? '#DCFCE7' : '#F1F5F9',
                                color: selectedSupplyRegions.includes("Islandwide") ? '#15803D' : '#475569',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Globe size={13} color={selectedSupplyRegions.includes("Islandwide") ? '#15803D' : '#475569'} />
                            {selectedSupplyRegions.includes("Islandwide") ? '✓ Islandwide Active' : '+ Islandwide Option'}
                        </button>
                    </div>

                    {/* Displayed Selected Cities Badges */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '8px',
                        minHeight: '38px',
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px'
                    }}>
                        {selectedSupplyRegions.length === 0 ? (
                            <span style={{ fontSize: '12px', color: '#94A3B8', padding: '2px 4px' }}>
                                No cities added. Use the input below to search and add multiple cities or select Islandwide.
                            </span>
                        ) : (
                            selectedSupplyRegions.map(city => {
                                const isIslandwide = city.includes('Islandwide');
                                return (
                                    <span
                                        key={city}
                                        style={{
                                            backgroundColor: isIslandwide ? '#DCFCE7' : '#E8F5E9',
                                            color: isIslandwide ? '#166534' : '#15803D',
                                            border: `1px solid ${isIslandwide ? '#86EFAC' : '#BBF7D0'}`,
                                            borderRadius: '16px',
                                            padding: '4px 10px',
                                            fontSize: '12.5px',
                                            fontWeight: '700',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {isIslandwide ? <Globe size={13} /> : <MapPin size={13} />}
                                        {city}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSupplyRegions(selectedSupplyRegions.filter(c => c !== city))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: 0,
                                                color: isIslandwide ? '#166534' : '#15803D'
                                            }}
                                            title="Remove city"
                                        >
                                            <X size={13} />
                                        </button>
                                    </span>
                                );
                            })
                        )}
                    </div>

                    {/* Add City Input & Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="supp-input"
                            value={citySearch}
                            onChange={(e) => {
                                setCitySearch(e.target.value);
                                setShowCityDropdown(true);
                            }}
                            onFocus={() => setShowCityDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                            placeholder="+ Add more cities (e.g. Gampola, Weligama, Nuwara Eliya, Kandy)..."
                        />

                        {showCityDropdown && (
                            <div className="city-dropdown-menu" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
                                maxHeight: '190px', overflowY: 'auto', zIndex: 30,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginTop: '4px'
                            }}>
                                {citiesList
                                    .filter(c => !selectedSupplyRegions.includes(c))
                                    .filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).length > 0 ? (
                                    citiesList
                                        .filter(c => !selectedSupplyRegions.includes(c))
                                        .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                                        .map(city => (
                                            <div
                                                key={city}
                                                onClick={() => {
                                                    setSelectedSupplyRegions([...selectedSupplyRegions, city]);
                                                    setCitySearch('');
                                                    setShowCityDropdown(false);
                                                }}
                                                style={{
                                                    padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
                                                    cursor: 'pointer', fontSize: '13.5px', color: '#1E293B',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#F8FAFC'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {city.includes('Islandwide') ? <Globe size={14} color="#15803D" /> : <MapPin size={14} color="#64748B" />}
                                                    {city}
                                                </span>
                                                <Plus size={14} color="#15803D" />
                                            </div>
                                        ))
                                ) : (
                                    <div style={{ padding: '12px 16px', color: '#64748B', fontSize: '13px' }}>
                                        {selectedSupplyRegions.length === citiesList.length
                                            ? 'All available cities added'
                                            : 'No matching cities found'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="supp-form-group">
                    <label className="supp-label">
                        <Phone size={14} /> Contact Phone Number
                    </label>
                    <input
                        type="tel"
                        className="supp-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contact phone (e.g. 0771234567)"
                    />
                </div>

                <div className="supp-form-group">
                    <label className="supp-label">
                        <Mail size={14} /> Email Address
                    </label>
                    <input
                        type="email"
                        className="supp-input"
                        value={email}
                        disabled
                        style={{ backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                    />
                </div>

            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="supp-bottom-action-bar">
                <button className="supp-btn-primary" onClick={handleSave}>
                    Save & Update Profile
                </button>
                <button
                    type="button"
                    className="btn-outline-profile"
                    onClick={() => setShowDeactivateModal(true)}
                >
                    Deactivate Supplier Account
                </button>
            </div>

            {/* Deactivate Supplier Account Confirmation Modal */}
            {showDeactivateModal && (
                <div className="profile-cancel-modal-overlay" onClick={() => !isDeactivating && setShowDeactivateModal(false)}>
                    <div className="profile-cancel-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-modal-header">
                            <div className="cancel-modal-icon-box">
                                <AlertTriangle size={20} color="#DC2626" />
                            </div>
                            <div className="cancel-modal-titles">
                                <h3 className="cancel-modal-title">Deactivate Supplier Account?</h3>
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
                                Are you sure you want to deactivate your supplier account?
                            </p>
                            <p style={{ margin: '8px 0 0 0', fontSize: '12.5px', color: '#DC2626', fontWeight: '600', lineHeight: '1.4' }}>
                                ⚠️ Your supplier business, wholesale catalog products, restock delivery records, and alerts will be permanently deleted from the database.
                            </p>
                        </div>
                        <div className="cancel-modal-actions">
                            <button
                                className="btn-confirm-cancel"
                                onClick={handleConfirmDeactivate}
                                disabled={isDeactivating}
                            >
                                {isDeactivating ? 'Deactivating Supplier...' : 'Yes, Deactivate & Delete Everything'}
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
