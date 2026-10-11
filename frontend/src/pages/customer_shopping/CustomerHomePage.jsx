import React, { useState, useEffect, useRef } from 'react';
import { Bell, Tag, ArrowRight, Sparkles, Plus, Store, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './CustomerHomePage.css';

// Global in-memory cache for instant tab switching without loading delays
let homeDataCache = null;

const defaultStores = [
    {
        id: 'default_1',
        name: 'GroceryMart',
        ownerName: 'Kamal Bandara',
        address: 'No, 39/A, Main Road, Kandy',
        location: 'Kandy',
        distance: '1.0 km',
        picture: '',
        status: 'Open • Pick up in 30m',
        storeStatus: 'open'
    },
    {
        id: 'default_2',
        name: 'LankaMart',
        ownerName: 'LankaMart Owner',
        address: 'No. 89, D.S. Senanayake Veediya, Kandy',
        location: 'Kandy',
        distance: '1.2 km',
        picture: '/logo.jpg',
        status: 'Open • Pick up in 30m',
        storeStatus: 'open'
    },
    {
        id: 'default_3',
        name: 'Green Basket Grocery',
        ownerName: 'Shop Owner',
        address: 'Colombo 03, Sri Lanka',
        location: 'Colombo 03',
        distance: '2.5 km',
        picture: '',
        status: 'Open • Pick up in 30m',
        storeStatus: 'open'
    }
];

export default function CustomerHomePage({ onNavigate, onSelectProduct, selectedStore, onSelectStore }) {
    const { user, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [popularStores, setPopularStores] = useState((homeDataCache?.stores && homeDataCache.stores.length > 0) ? homeDataCache.stores : defaultStores);
    const [recommendedProducts, setRecommendedProducts] = useState(homeDataCache?.featuredProducts || []);
    const [isLoading, setIsLoading] = useState(!homeDataCache);

    const [popularCategories, setPopularCategories] = useState(homeDataCache?.topCategories || [
        { id: 1, name: 'Vegetables', items: '24 items', image: '/veg_icon.png', color: '#E8F5E9', textColor: '#2E7D32', fallbackEmoji: '🥕' },
        { id: 2, name: 'Fruits', items: '12 items', image: '/fruit_icon.png', color: '#FFF3E0', textColor: '#E65100', fallbackEmoji: '🥑' },
        { id: 3, name: 'Dairy', items: '8 items', image: '/dairy_icon.png', color: '#E3F2FD', textColor: '#1565C0', fallbackEmoji: '🥛' },
        { id: 4, name: 'Bakery', items: '15 items', image: '/bakery_icon.png', color: '#FCE4EC', textColor: '#C2185B', fallbackEmoji: '🍞' },
    ]);

    const defaultBanner = {
        badge: '🔥 20% OFF DEALS',
        title: 'Fresh Harvest Deals',
        subtitle: 'Pick up in 15 mins at nearest grocery store',
        btnText: 'Shop Now',
        active: true,
        bannerBg: '/banner_bg.png'
    };

    const [allBanners, setAllBanners] = useState(homeDataCache?.allBanners || [defaultBanner]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const bannerTimerRef = useRef(null);

    // The currently displayed banner
    const offerBanner = allBanners[currentBannerIndex] || defaultBanner;

    // Auto-rotate banners every 4 seconds
    useEffect(() => {
        if (allBanners.length <= 1) return;
        bannerTimerRef.current = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % allBanners.length);
        }, 4000);
        return () => clearInterval(bannerTimerRef.current);
    }, [allBanners.length]);

    const API_BASE_URL = 'http://localhost:5000/api/customer-shopping';

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/home`);
                const data = await res.json();
                if (res.ok && data.success) {
                    homeDataCache = data; // Save to global cache
                    if (Array.isArray(data.stores) && data.stores.length > 0) {
                        setPopularStores(data.stores);
                    }
                    if (Array.isArray(data.featuredProducts) && data.featuredProducts.length > 0) {
                        setRecommendedProducts(data.featuredProducts);
                    }
                    if (Array.isArray(data.topCategories) && data.topCategories.length > 0) {
                        setPopularCategories(data.topCategories);
                    }
                    if (Array.isArray(data.allBanners) && data.allBanners.length > 0) {
                        setAllBanners(data.allBanners);
                        setCurrentBannerIndex(0);
                    } else if (data.activeBanner) {
                        setAllBanners([data.activeBanner]);
                    }
                }
            } catch (err) {
                console.error('Failed to load customer home data from MongoDB Atlas:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    // Intelligent matching of store against customer's Preferred Pickup Location / City
    const doesStoreMatchUserLocation = (store, userLocRaw) => {
        if (!userLocRaw || typeof userLocRaw !== 'string' || !userLocRaw.trim() || userLocRaw.trim().toLowerCase() === 'islandwide') {
            return true;
        }

        const userLoc = userLocRaw.toLowerCase().trim();
        // Remove parentheses and clean, e.g. "Colombo 03 (Colpetty)" -> base: "colombo 03", paren: "colpetty"
        const baseLoc = userLoc.replace(/\([^)]*\)/g, '').trim();
        const parenMatch = userLoc.match(/\(([^)]+)\)/);
        const parenText = parenMatch ? parenMatch[1].toLowerCase().trim() : '';

        const tokens = [userLoc, baseLoc, parenText].filter(t => t && t.length >= 3);

        // Add individual word tokens (e.g. "kandy", "colombo", "galle", "dehiwala", "kurunegala")
        baseLoc.split(/\s+/).forEach(w => {
            if (w.length >= 3 && !/^\d+$/.test(w)) {
                tokens.push(w);
            }
        });

        const uniqueTokens = [...new Set(tokens)];
        const storeHaystack = `${store.location || ''} ${store.storeAddress || ''} ${store.address || ''} ${store.name || ''}`.toLowerCase();

        return uniqueTokens.some(tok => storeHaystack.includes(tok));
    };

    const hasSpecificLocation = Boolean(
        user?.location &&
        user.location.trim().length > 0 &&
        user.location.trim().toLowerCase() !== 'islandwide'
    );
    const displayLocationName = hasSpecificLocation ? user.location.trim() : 'you';

    // Filter popular stores strictly matching customer's registered / updated Preferred Pickup Location
    const filteredStoresByLocation = popularStores.filter(st => doesStoreMatchUserLocation(st, user?.location));
    const displayStores = hasSpecificLocation ? filteredStoresByLocation : popularStores;

    // Helper to match store name safely
    const isStoreMatch = (productStore, targetStoreObj) => {
        if (!targetStoreObj) return true;
        const selName = typeof targetStoreObj === 'string' ? targetStoreObj : (targetStoreObj.name || targetStoreObj.storeName || '');
        if (!selName) return true;

        const prodStoreStr = String(productStore || '').toLowerCase().trim();
        const targetStoreStr = selName.toLowerCase().trim();
        if (!prodStoreStr) return true;

        return prodStoreStr.includes(targetStoreStr) || targetStoreStr.includes(prodStoreStr);
    };

    const displayRecommended = recommendedProducts.filter(item => isStoreMatch(item.storeName, selectedStore));
    const recListToRender = displayRecommended.length > 0 ? displayRecommended : recommendedProducts;

    const scrollStores = (direction) => {
        const grid = document.getElementById('popular-stores-grid');
        if (grid) {
            const scrollAmount = direction === 'left' ? -220 : 220;
            grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (onNavigate) onNavigate('search');
    };

    const handleCategoryClick = (catName) => {
        setSelectedCategory(catName);
        if (onNavigate) onNavigate('search', { category: catName });
    };

    const selectedStoreName = selectedStore ? (typeof selectedStore === 'string' ? selectedStore : (selectedStore.name || '')) : '';

    const handleBannerClick = (banner) => {
        const targetBanner = banner || offerBanner;
        const storeNameFromBanner = targetBanner?.storeName || (popularStores && popularStores.length > 0 ? popularStores[0].name : 'GroceryMart');

        const matchedStore = popularStores.find(s =>
            (s.name || '').toLowerCase().includes(storeNameFromBanner.toLowerCase()) ||
            storeNameFromBanner.toLowerCase().includes((s.name || '').toLowerCase())
        ) || { name: storeNameFromBanner, storeName: storeNameFromBanner };

        if (onSelectStore) onSelectStore(matchedStore);
        if (onNavigate) onNavigate('search', { store: matchedStore, storeName: storeNameFromBanner });
    };

    return (
        <div className="exact-home-container">
            {/* Main Scrollable Content Body */}
            <div className="exact-home-body">
                {/* Greeting Header */}
                <div className="exact-greeting">
                    <h2 className="exact-greeting-title">Good evening, {user?.name?.split(' ')[0] || 'Guest'}</h2>
                    <p className="exact-greeting-sub">Fresh picks ready near you</p>
                </div>

                {/* Search Bar */}
                <form className="exact-search-form" onSubmit={handleSearchSubmit}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search organic produce, dairy, bakery..."
                        className="exact-search-input"
                    />
                </form>

                {/* Multi-Store Auto-Rotating Banner Carousel */}
                {offerBanner.active !== false && (
                    <div style={{ position: 'relative' }}>
                        <div className="modern-banner-card" onClick={() => handleBannerClick(offerBanner)} style={{ cursor: 'pointer' }}>
                            <img src={offerBanner.bannerBg || '/banner_bg.png'} alt={offerBanner.title || 'Fresh Harvest Deals'} className="modern-banner-bg" />
                            <div className="modern-banner-overlay">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                    {offerBanner.storeName && (
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.22)',
                                            backdropFilter: 'blur(8px)',
                                            WebkitBackdropFilter: 'blur(8px)',
                                            border: '1px solid rgba(255, 255, 255, 0.35)',
                                            borderRadius: '20px',
                                            padding: '3px 10px'
                                        }}>
                                            <Store size={11} color="#fff" />
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', letterSpacing: '0.2px' }}>{offerBanner.storeName}</span>
                                        </div>
                                    )}
                                    <div className="modern-banner-badge">
                                        <span>{offerBanner.badge || '🔥 20% OFF DEALS'}</span>
                                    </div>
                                </div>
                                <h3 className="modern-banner-title">{offerBanner.title || 'Fresh Harvest Deals'}</h3>
                                <p className="modern-banner-subtitle">{offerBanner.subtitle || 'Pick up in 15 mins at nearest grocery store'}</p>
                                <button className="modern-banner-btn" onClick={(e) => { e.stopPropagation(); handleBannerClick(offerBanner); }}>
                                    <span>{offerBanner.btnText || 'Shop Now'}</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Carousel Dot Indicators */}
                        {allBanners.length > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                                {allBanners.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { clearInterval(bannerTimerRef.current); setCurrentBannerIndex(idx); }}
                                        style={{
                                            width: idx === currentBannerIndex ? '20px' : '7px',
                                            height: '7px',
                                            borderRadius: '4px',
                                            backgroundColor: idx === currentBannerIndex ? '#2D7B38' : '#CBD5E1',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0,
                                            transition: 'all 0.3s ease'
                                        }}
                                        aria-label={`Banner ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Popular Pickup Stores Section */}
                <div className="exact-section">
                    <div className="section-header-row">
                        <div>
                            <h3 className="exact-section-title">Popular pickup stores</h3>
                            <span className="section-see-all" style={{ fontSize: '13px', fontWeight: '700', color: '#2D7B38' }}>
                                {displayStores.length} {displayStores.length === 1 ? 'store' : 'stores'} near {displayLocationName}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                className="section-see-all"
                                style={{ fontWeight: '700', color: '#2D7B38', cursor: 'pointer' }}
                                onClick={() => onNavigate && onNavigate('stores')}
                            >
                                View all
                            </span>
                            <div className="store-scroll-arrows">
                                <button type="button" className="scroll-arrow-btn" onClick={() => scrollStores('left')} title="Scroll left">
                                    <ChevronLeft size={16} />
                                </button>
                                <button type="button" className="scroll-arrow-btn" onClick={() => scrollStores('right')} title="Scroll right">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {displayStores.length > 0 ? (
                        <div className="popular-stores-grid" id="popular-stores-grid">
                            {displayStores.map((store) => {
                                const rawPic = store.picture || store.profilePicture || store.image || store.photo || '';
                                const storePic = (rawPic && !rawPic.includes('ui-avatars.com')) ? rawPic : '';
                                return (
                                    <div
                                        key={store.id}
                                        className={`store-card ${selectedStore?.id === store.id ? 'active' : ''}`}
                                        onClick={() => {
                                            if (onSelectStore) onSelectStore(store);
                                            if (onNavigate) onNavigate('search');
                                        }}
                                    >
                                        <div className="store-card-top">
                                            <div className="store-avatar" style={{ overflow: 'hidden' }}>
                                                {storePic ? (
                                                    <img
                                                        src={storePic}
                                                        alt={store.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    style={{
                                                        display: storePic ? 'none' : 'flex',
                                                        width: '100%',
                                                        height: '100%',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Store size={18} color="#2D7B38" />
                                                </div>
                                            </div>
                                        </div>
                                        <h4 className="store-card-name">{store.name}</h4>
                                        <p className="store-card-address">{store.address}</p>
                                        <div className="store-card-footer">
                                            <span className="store-status-text">
                                                {store.storeStatus === 'closed' ? 'Closed' : (store.status || 'Open • Pick up in 30m')}
                                            </span>
                                            <span className="store-select-btn">Shop →</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1.5px dashed #CBD5E1',
                            borderRadius: '16px',
                            padding: '24px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <MapPin size={28} color="#2D7B38" />
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>
                                No pickup stores found near {displayLocationName}
                            </h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                                We don't have registered partner stores in {displayLocationName} yet.
                            </p>
                            <button
                                type="button"
                                onClick={() => onNavigate && onNavigate('stores')}
                                style={{
                                    marginTop: '4px',
                                    padding: '8px 16px',
                                    backgroundColor: '#2D7B38',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                View All Stores
                            </button>
                        </div>
                    )}
                </div>

                {/* Popular Categories Section (Strictly Max 4 Categories) */}
                <div className="exact-section">
                    <div className="section-header-row">
                        <h3 className="exact-section-title">Popular categories</h3>
                        <span className="section-see-all" onClick={() => onNavigate && onNavigate('search', { category: 'All' })}>
                            See all
                        </span>
                    </div>

                    <div className="rich-categories-grid">
                        {popularCategories.slice(0, 4).map((cat) => (
                            <div
                                key={cat.id}
                                className={`rich-cat-card ${selectedCategory === cat.name ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(cat.name)}
                            >
                                <div className="rich-cat-icon">
                                    {cat.image ? (
                                        <img
                                            src={cat.image}
                                            alt={cat.name}
                                            className="rich-cat-img"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
                                            }}
                                        />
                                    ) : null}
                                    <span style={{ fontSize: '20px', display: cat.image ? 'none' : 'inline' }}>
                                        {cat.fallbackEmoji || '📦'}
                                    </span>
                                </div>
                                <div className="rich-cat-info">
                                    <h4 className="rich-cat-name">
                                        {cat.name}
                                    </h4>
                                    <span className="rich-cat-count">{cat.items}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recommended For You Section - Filtered by Store */}
                <div className="exact-section">
                    <div className="section-header-row">
                        <h3 className="exact-section-title">
                            {selectedStoreName ? `Recommended from ${selectedStoreName}` : 'Recommended for you'}
                        </h3>
                    </div>

                    <div className="rec-products-list">
                        {recListToRender.slice(0, 4).map((item) => (
                            <div
                                key={item._id || item.id}
                                className="image2-product-card"
                                onClick={() => onSelectProduct && onSelectProduct(item)}
                                style={{ marginBottom: '10px' }}
                            >
                                <div className="product-card-thumb-wrapper">
                                    <img src={item.image || item.imageUrl || '/cat_veg.png'} alt={item.name} className="product-card-thumb-img" />
                                </div>
                                <div className="product-card-details">
                                    <h3 className="product-card-title">{item.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="exact-rec-price" style={{ color: '#2D7B38', fontWeight: '800', fontSize: '15px' }}>
                                            Rs. {item.price} / {(!item.unit || item.unit === 'item') ? '1kg' : item.unit}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <span className="instock-badge" style={{ backgroundColor: item.stock <= 0 ? '#FEE2E2' : '#DCFCE7', color: item.stock <= 0 ? '#991B1B' : '#166534', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '10px' }}>
                                            {item.stock <= 0 ? 'OUT OF STOCK' : 'IN STOCK'}
                                        </span>
                                        {item.brand && (
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#15803D', backgroundColor: '#F0FDF4', padding: '2px 7px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                                                {item.brand}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                                            • {item.storeName || selectedStoreName || 'PickFresh Super'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View Products CTA Button Matching Image 2 */}
                <div className="exact-cta-container">
                    <button
                        className="exact-view-btn"
                        onClick={() => onNavigate && onNavigate('search')}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#2D7B38',
                            color: '#FFFFFF',
                            borderRadius: '16px',
                            border: 'none',
                            fontSize: '15px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(45, 123, 56, 0.2)'
                        }}
                    >
                        View Products
                    </button>
                </div>
            </div>
        </div>
    );
}
