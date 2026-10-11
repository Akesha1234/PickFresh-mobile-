import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Store, Truck, User, AlertCircle, MapPin, Globe, X, Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { triggerGoogleAuth } from '../../utils/googleAuth';
import GoogleAuthModal from '../../components/auth/GoogleAuthModal';
import AppleAuthModal from '../../components/auth/AppleAuthModal';
import { CITIES_LIST } from '../../utils/cities';
import { SUPPLY_CATEGORIES } from '../../utils/categories';
import './SignUpPage.css';

export default function SignUpPage({ onNavigate, selectedRole }) {
    const { register, loginWithGoogle } = useAuth();
    const role = selectedRole || 'customer';
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [showAppleModal, setShowAppleModal] = useState(false);

    // State fields for all role types
    const [fullName, setFullName] = useState('');
    const [shopName, setShopName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [selectedSupplyCategories, setSelectedSupplyCategories] = useState([]);
    const [selectedSupplyRegions, setSelectedSupplyRegions] = useState(["Colombo 03 (Colpetty)"]);
    const [citySearch, setCitySearch] = useState('');
    const [location, setLocation] = useState('Colombo 03');
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    const citiesList = CITIES_LIST;
    const [categoriesList, setCategoriesList] = useState(SUPPLY_CATEGORIES);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/product-inventory/categories');
                const data = await res.json();
                if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                    const dynamicNames = data.categories.map(c => c.name).filter(Boolean);
                    setCategoriesList(dynamicNames);
                    if (dynamicNames.length > 0 && selectedSupplyCategories.length === 0) {
                        setSelectedSupplyCategories([dynamicNames[0]]);
                    }
                }
            } catch (err) {
                console.error('Failed to load dynamic database categories:', err.message);
            }
        };
        fetchCategories();
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateSignUpForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // Sri Lankan phone format validation: 10 digits starting with 07 or +947
        const phoneRegex = /^(?:\+94|0)?7[0-9]{8}$/;

        // Role specific validations
        if (role === 'customer') {
            if (!fullName.trim()) {
                errors.fullName = 'Full name is required';
            } else if (fullName.trim().length < 2) {
                errors.fullName = 'Name must be at least 2 characters';
            }
        } else if (role === 'shop_owner') {
            if (!shopName.trim()) errors.shopName = 'Shop name is required';
            if (!ownerName.trim()) errors.ownerName = 'Owner name is required';
            if (!storeAddress.trim()) errors.storeAddress = 'Store address is required';
        } else if (role === 'supplier') {
            if (!supplierName.trim()) errors.supplierName = 'Supplier business name is required';
            if (!contactPerson.trim()) errors.contactPerson = 'Contact person name is required';
            if (selectedSupplyCategories.length === 0) errors.supplyCategory = 'At least one supply category is required';
        }

        // Common validations
        if (!email.trim()) {
            errors.email = 'Email address is required';
        } else if (!emailRegex.test(email.trim())) {
            errors.email = 'Enter a valid email address (e.g. name@domain.com)';
        }

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
        }

        if (!phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(phone.trim())) {
            errors.phone = 'Enter a valid 10-digit phone number (e.g. 0771234567)';
        }

        if (!agreedTerms) {
            errors.agreedTerms = 'You must agree to the Terms of Service & Privacy Policy';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateSignUpForm();
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!validateSignUpForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const regionStr = selectedSupplyRegions.join(', ') || 'Colombo 03 (Colpetty)';
            const categoryStr = selectedSupplyCategories.join(', ') || 'Fresh Produce (Vegetables & Fruits)';
            const userData = {
                role,
                email: email.trim(),
                password,
                phone: phone.trim(),
                fullName,
                location: role === 'supplier' ? regionStr : location,
                shopName,
                ownerName,
                storeAddress,
                supplierName,
                contactPerson,
                supplyCategory: categoryStr,
                supplyCategories: selectedSupplyCategories,
                supplyRegions: selectedSupplyRegions,
                supplyRegion: regionStr
            };

            await register(userData);
            setIsLoading(false);
            if (onNavigate) {
                onNavigate('home');
            }
        } catch (error) {
            setIsLoading(false);
            setErrorMsg(error.message || 'Registration failed. Please try again.');
        }
    };

    const handleGoogleSignUp = () => {
        setIsLoading(true);
        setErrorMsg('');
        triggerGoogleAuth({
            role: role || 'customer',
            onSuccess: async (googleUser) => {
                try {
                    await loginWithGoogle({ ...googleUser, role });
                    setIsLoading(false);
                    if (onNavigate) onNavigate('home');
                } catch (err) {
                    setIsLoading(false);
                    setErrorMsg(err.message || 'Registration with Google failed.');
                }
            },
            onError: (err) => {
                setIsLoading(false);
                setErrorMsg(typeof err === 'string' ? err : 'Google registration was cancelled or encountered an error.');
            }
        });
    };

    // Role-specific Header Titles
    const getRoleTitle = () => {
        if (role === 'shop_owner') return 'Shop Owner Registration';
        if (role === 'supplier') return 'Supplier Registration';
        return 'Create account';
    };

    const getRoleSubtitle = () => {
        if (role === 'shop_owner') return 'Register your store & start receiving customer pre-orders';
        if (role === 'supplier') return 'Register your supply business & manage restock requests';
        return 'Get started with your 14-day free trial';
    };

    return (
        <div className="signup-page-container">
            {/* Top Back Arrow Navigation */}
            <div className="signup-top-nav">
                <button
                    type="button"
                    onClick={() => onNavigate('roleselect')}
                    className="signup-back-btn"
                    aria-label="Back to role selection"
                >
                    <ArrowLeft size={22} />
                </button>

                {/* Role Badge Indicator */}
                <div style={{
                    marginLeft: 'auto',
                    backgroundColor: '#E8F5E9',
                    color: '#2E7D32',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {role === 'customer' && <><User size={12} /> Customer</>}
                    {role === 'shop_owner' && <><Store size={12} /> Shop Owner</>}
                    {role === 'supplier' && <><Truck size={12} /> Supplier</>}
                </div>
            </div>

            {/* Centered Top Logo Card */}
            <div className="signup-logo-card">
                <img
                    src="/logo.jpg"
                    alt="PickFresh Logo"
                    className="signup-logo-img"
                />
            </div>

            {/* Title & Subtitle */}
            <div className="signup-header-text">
                <h1 className="signup-title">{getRoleTitle()}</h1>
                <p className="signup-subtitle">{getRoleSubtitle()}</p>
            </div>

            {/* Premium Error Alert Card */}
            {errorMsg && (
                <div className="signup-error-card">
                    <div className="error-card-icon-wrap">
                        <AlertCircle size={18} color="#DC2626" />
                    </div>
                    <div className="error-card-body">
                        <span className="error-card-title">Registration Error</span>
                        <span className="error-card-message">{errorMsg}</span>
                    </div>
                </div>
            )}

            {/* Main Sign Up Form */}
            <form onSubmit={handleSignUp} className="signup-form" noValidate>

                {/* DYNAMIC FIELDS PER ROLE */}

                {/* 1. CUSTOMER ROLE FIELDS */}
                {role === 'customer' && (
                    <>
                        <div className="signup-field-group">
                            <label className="signup-label">Full Name</label>
                            <div className={`signup-input-wrapper ${fieldErrors.fullName && touched.fullName ? 'input-has-error' : ''}`}>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (fieldErrors.fullName) validateSignUpForm();
                                    }}
                                    onBlur={() => handleBlur('fullName')}
                                    placeholder="Jane Doe"
                                    className="signup-input"
                                />
                            </div>
                            {fieldErrors.fullName && touched.fullName && (
                                <span className="inline-field-error">
                                    <AlertCircle size={12} />
                                    <span>{fieldErrors.fullName}</span>
                                </span>
                            )}
                        </div>

                        <div className="signup-field-group" style={{ position: 'relative' }}>
                            <label className="signup-label">Preferred Pickup Location / City</label>
                            <div className="signup-input-wrapper">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        setShowCityDropdown(true);
                                    }}
                                    onFocus={() => setShowCityDropdown(true)}
                                    // slight delay before hiding to allow click event on dropdown item
                                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                    placeholder="Search and select city..."
                                    className="signup-input"
                                    style={{ backgroundColor: '#FFFFFF', paddingRight: '40px' }}
                                />
                                <div style={{ position: 'absolute', right: '14px', top: '14px', pointerEvents: 'none' }}>
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
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
                    </>
                )}

                {/* 2. SHOP OWNER ROLE FIELDS */}
                {role === 'shop_owner' && (
                    <>
                        <div className="signup-field-group">
                            <label className="signup-label">Shop Name</label>
                            <div className={`signup-input-wrapper ${fieldErrors.shopName && touched.shopName ? 'input-has-error' : ''}`}>
                                <input
                                    type="text"
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                    onBlur={() => handleBlur('shopName')}
                                    placeholder="e.g. Green Basket Grocery"
                                    className="signup-input"
                                />
                            </div>
                            {fieldErrors.shopName && touched.shopName && (
                                <span className="inline-field-error"><AlertCircle size={12} /><span>{fieldErrors.shopName}</span></span>
                            )}
                        </div>

                        <div className="signup-field-group">
                            <label className="signup-label">Owner / Manager Name</label>
                            <div className={`signup-input-wrapper ${fieldErrors.ownerName && touched.ownerName ? 'input-has-error' : ''}`}>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    onBlur={() => handleBlur('ownerName')}
                                    placeholder="e.g. Kamal Perera"
                                    className="signup-input"
                                />
                            </div>
                            {fieldErrors.ownerName && touched.ownerName && (
                                <span className="inline-field-error"><AlertCircle size={12} /><span>{fieldErrors.ownerName}</span></span>
                            )}
                        </div>

                        <div className="signup-field-group" style={{ position: 'relative' }}>
                            <label className="signup-label">Store Location / City</label>
                            <div className="signup-input-wrapper">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        setShowCityDropdown(true);
                                    }}
                                    onFocus={() => setShowCityDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                    placeholder="Search and select city..."
                                    className="signup-input"
                                    style={{ backgroundColor: '#FFFFFF', paddingRight: '40px' }}
                                />
                                <div style={{ position: 'absolute', right: '14px', top: '14px', pointerEvents: 'none' }}>
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
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

                        <div className="signup-field-group">
                            <label className="signup-label">Store Street Address</label>
                            <div className={`signup-input-wrapper ${fieldErrors.storeAddress && touched.storeAddress ? 'input-has-error' : ''}`}>
                                <input
                                    type="text"
                                    value={storeAddress}
                                    onChange={(e) => setStoreAddress(e.target.value)}
                                    onBlur={() => handleBlur('storeAddress')}
                                    placeholder="e.g. No. 45, Main Street"
                                    className="signup-input"
                                />
                            </div>
                            {fieldErrors.storeAddress && touched.storeAddress && (
                                <span className="inline-field-error"><AlertCircle size={12} /><span>{fieldErrors.storeAddress}</span></span>
                            )}
                        </div>
                    </>
                )}

                {/* 3. SUPPLIER ROLE FIELDS */}
                {role === 'supplier' && (
                    <>
                        <div className="signup-field-group">
                            <label className="signup-label">Supplier / Business Name</label>
                            <div className={`signup-input-wrapper ${fieldErrors.supplierName && touched.supplierName ? 'input-has-error' : ''}`}>
                                <input
                                    type="text"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    onBlur={() => handleBlur('supplierName')}
                                    placeholder="e.g. Nuwara Eliya Organic Farms"
                                    className="signup-input"
                                />
                            </div>
                            {fieldErrors.supplierName && touched.supplierName && (
                                <span className="inline-field-error"><AlertCircle size={12} /><span>{fieldErrors.supplierName}</span></span>
                            )}
                        </div>

                        <div className="signup-field-group">
                            <label className="signup-label">Contact Person Name</label>
                            <div className={`signup-input-wrapper ${fieldErrors.contactPerson && touched.contactPerson ? 'input-has-error' : ''}`}>
                                <input
                                    type="text"
                                    value={contactPerson}
                                    onChange={(e) => setContactPerson(e.target.value)}
                                    onBlur={() => handleBlur('contactPerson')}
                                    placeholder="e.g. Sunith Silva"
                                    className="signup-input"
                                />
                            </div>
                            {fieldErrors.contactPerson && touched.contactPerson && (
                                <span className="inline-field-error"><AlertCircle size={12} /><span>{fieldErrors.contactPerson}</span></span>
                            )}
                        </div>

                        {/* Multi-Select Supply Categories Section - Interactive Tag Pill Grid */}
                        <div className="signup-field-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label className="signup-label" style={{ margin: 0 }}>
                                    Supply Categories / Product Lines ({selectedSupplyCategories.length})
                                </label>
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Tap to select</span>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: '#F8FAFC',
                                border: fieldErrors.supplyCategory ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                                borderRadius: '16px'
                            }}>
                                {categoriesList.map(cat => {
                                    const isSelected = selectedSupplyCategories.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedSupplyCategories(selectedSupplyCategories.filter(c => c !== cat));
                                                } else {
                                                    setSelectedSupplyCategories([...selectedSupplyCategories, cat]);
                                                }
                                                if (fieldErrors.supplyCategory) validateSignUpForm();
                                            }}
                                            style={{
                                                backgroundColor: isSelected ? '#DCFCE7' : '#FFFFFF',
                                                color: isSelected ? '#15803D' : '#334155',
                                                border: `1.5px solid ${isSelected ? '#86EFAC' : '#CBD5E1'}`,
                                                borderRadius: '20px',
                                                padding: '8px 14px',
                                                fontSize: '12.5px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                                                boxShadow: isSelected ? '0 2px 8px rgba(22, 101, 52, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
                                            }}
                                        >
                                            {isSelected ? <Check size={14} color="#15803D" /> : <Plus size={14} color="#64748B" />}
                                            <span>{cat}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {fieldErrors.supplyCategory && (
                                <span className="inline-field-error" style={{ marginTop: '4px' }}>
                                    <AlertCircle size={12} />
                                    <span>{fieldErrors.supplyCategory}</span>
                                </span>
                            )}
                        </div>

                        {/* Multi-Select Cities Section */}
                        <div className="signup-field-group" style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className="signup-label" style={{ margin: 0 }}>
                                    Supply Regions / Cities ({selectedSupplyRegions.length})
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
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Globe size={12} color={selectedSupplyRegions.includes("Islandwide") ? '#15803D' : '#475569'} />
                                    {selectedSupplyRegions.includes("Islandwide") ? '✓ Islandwide Selected' : '+ Select Islandwide'}
                                </button>
                            </div>

                            {/* Selected City Chips Box */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                marginBottom: '8px',
                                minHeight: '36px',
                                padding: '8px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px'
                            }}>
                                {selectedSupplyRegions.length === 0 ? (
                                    <span style={{ fontSize: '12px', color: '#94A3B8', padding: '2px 4px' }}>
                                        No cities selected. Search and add cities below or pick Islandwide.
                                    </span>
                                ) : (
                                    selectedSupplyRegions.map(city => {
                                        const isIslandwide = city.includes('Islandwide');
                                        return (
                                            <span
                                                key={city}
                                                style={{
                                                    backgroundColor: isIslandwide ? '#DCFCE7' : '#E0F2FE',
                                                    color: isIslandwide ? '#166534' : '#0369A1',
                                                    border: `1px solid ${isIslandwide ? '#86EFAC' : '#7DD3FC'}`,
                                                    borderRadius: '16px',
                                                    padding: '4px 10px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {isIslandwide ? <Globe size={12} /> : <MapPin size={12} />}
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
                                                        color: isIslandwide ? '#166534' : '#0369A1'
                                                    }}
                                                    title="Remove city"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        );
                                    })
                                )}
                            </div>

                            {/* Search & Add City Input Dropdown */}
                            <div className="signup-input-wrapper">
                                <input
                                    type="text"
                                    value={citySearch}
                                    onChange={(e) => {
                                        setCitySearch(e.target.value);
                                        setShowCityDropdown(true);
                                    }}
                                    onFocus={() => setShowCityDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                    placeholder="+ Search and add more cities (e.g. Gampola, Weligama, Kandy)..."
                                    className="signup-input"
                                    style={{ backgroundColor: '#FFFFFF', paddingRight: '40px' }}
                                />
                                <div style={{ position: 'absolute', right: '14px', top: '14px', pointerEvents: 'none' }}>
                                    <Plus size={16} color="#64748B" />
                                </div>
                            </div>

                            {showCityDropdown && (
                                <div className="city-dropdown-menu" style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
                                    maxHeight: '200px', overflowY: 'auto', zIndex: 20,
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
                    </>
                )}

                {/* COMMON FIELDS ACROSS ALL ROLES */}

                {/* Email Address Field */}
                <div className="signup-field-group">
                    <label className="signup-label">Email Address</label>
                    <div className={`signup-input-wrapper ${fieldErrors.email && touched.email ? 'input-has-error' : ''}`}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (fieldErrors.email) validateSignUpForm();
                            }}
                            onBlur={() => handleBlur('email')}
                            placeholder="name@company.com"
                            className="signup-input"
                        />
                    </div>
                    {fieldErrors.email && touched.email && (
                        <span className="inline-field-error">
                            <AlertCircle size={12} />
                            <span>{fieldErrors.email}</span>
                        </span>
                    )}
                </div>

                {/* Password Field */}
                <div className="signup-field-group">
                    <label className="signup-label">Password</label>
                    <div className={`signup-input-wrapper ${fieldErrors.password && touched.password ? 'input-has-error' : ''}`}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (fieldErrors.password) validateSignUpForm();
                            }}
                            onBlur={() => handleBlur('password')}
                            placeholder="Minimum 8 characters"
                            className="signup-input"
                            style={{ paddingRight: '44px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="signup-password-toggle"
                            aria-label="Toggle Password Visibility"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {fieldErrors.password && touched.password && (
                        <span className="inline-field-error">
                            <AlertCircle size={12} />
                            <span>{fieldErrors.password}</span>
                        </span>
                    )}
                </div>

                {/* Phone Field */}
                <div className="signup-field-group">
                    <label className="signup-label">Phone Number</label>
                    <div className={`signup-input-wrapper ${fieldErrors.phone && touched.phone ? 'input-has-error' : ''}`}>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                if (fieldErrors.phone) validateSignUpForm();
                            }}
                            onBlur={() => handleBlur('phone')}
                            placeholder="07XXXXXXXX"
                            className="signup-input"
                        />
                    </div>
                    {fieldErrors.phone && touched.phone && (
                        <span className="inline-field-error">
                            <AlertCircle size={12} />
                            <span>{fieldErrors.phone}</span>
                        </span>
                    )}
                </div>

                {/* Terms and Privacy Checkbox */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="signup-checkbox-row">
                        <input
                            type="checkbox"
                            checked={agreedTerms}
                            onChange={(e) => {
                                setAgreedTerms(e.target.checked);
                                if (fieldErrors.agreedTerms) validateSignUpForm();
                            }}
                            className="signup-checkbox-input"
                        />
                        <span className="signup-checkbox-label">
                            I agree to the <span className="signup-terms-link">Terms of Service</span> and{' '}
                            <span className="signup-terms-link">Privacy Policy</span>
                        </span>
                    </label>
                    {fieldErrors.agreedTerms && touched.agreedTerms && (
                        <span className="inline-field-error" style={{ marginTop: '2px' }}>
                            <AlertCircle size={12} />
                            <span>{fieldErrors.agreedTerms}</span>
                        </span>
                    )}
                </div>

                {/* Submit Create Account Button */}
                <button
                    type="submit"
                    className="signup-submit-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>

            {/* Or Divider */}
            <div className="signup-divider">
                <div className="signup-divider-line" />
                <span className="signup-divider-text">or</span>
                <div className="signup-divider-line" />
            </div>

            {/* Social Logins */}
            <div className="signup-social-group">
                {/* Google Button */}
                <button
                    type="button"
                    className="signup-social-btn"
                    onClick={() => setShowGoogleModal(true)}
                >
                    <svg className="signup-social-icon" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                {/* Apple Button */}
                <button
                    type="button"
                    className="signup-social-btn"
                    onClick={() => setShowAppleModal(true)}
                >
                    <svg className="signup-social-icon" viewBox="0 0 24 24" fill="#000000">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.81 1.13-1.94 1-3.07-.98.04-2.18.65-2.88 1.47-.63.73-1.18 1.89-1.03 3.01 1.1.09 2.23-.55 2.91-1.41z" />
                    </svg>
                    <span>Continue with Apple</span>
                </button>
            </div>

            {/* Bottom Footer */}
            <div className="signup-footer-text">
                <span>Already have an account?</span>
                <span
                    className="signup-signin-link"
                    onClick={() => onNavigate('login')}
                >
                    Sign in
                </span>
            </div>

            {/* Google Mobile Auth Modal */}
            <GoogleAuthModal
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onSuccess={async (googleUser) => {
                    await loginWithGoogle({ ...googleUser, role });
                    if (onNavigate) onNavigate('home');
                }}
                role={role}
            />

            {/* Apple Mobile Auth Modal */}
            <AppleAuthModal
                isOpen={showAppleModal}
                onClose={() => setShowAppleModal(false)}
                onSuccess={(appleUser) => {
                    loginWithGoogle({ ...appleUser, role });
                    if (onNavigate) onNavigate('home');
                }}
                role={role}
            />
        </div>
    );
}
