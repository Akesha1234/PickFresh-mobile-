import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowLeft, X, Bell, Store, MapPin, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ProductCard from './ProductCard';
import './SearchPage.css';

// Global in-memory cache for Search Page instant rendering
let searchDataCache = null;

// Helper to determine accurate category image if no product image uploaded
const getCategoryImageFallback = (catName = '', prodName = '') => {
    const combined = `${catName} ${prodName}`.toLowerCase();
    if (combined.includes('milk') || combined.includes('dairy') || combined.includes('cheese') || combined.includes('egg')) return '/cat_dairy.png';
    if (combined.includes('fruit') || combined.includes('avocado') || combined.includes('apple') || combined.includes('strawberry')) return '/cat_fruits.png';
    if (combined.includes('bread') || combined.includes('bakery') || combined.includes('bun')) return '/cat_bakery.png';
    if (combined.includes('drink') || combined.includes('beverage') || combined.includes('coke') || combined.includes('juice')) return '/cat_beverages.png';
    return '/cat_veg.png';
};

export default function SearchPage({ onNavigate, onSelectProduct, addToCart, selectedStore, onSelectStore, initialCategory = 'All' }) {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(initialCategory || 'All');

    const defaultCategories = ['All', 'Soft Drinks', 'Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Grocery', 'Beverages', 'Snacks', 'Grains'];
    const [products, setProducts] = useState(searchDataCache?.products || []);
    const [isLoading, setIsLoading] = useState(!searchDataCache || searchDataCache?.products?.length === 0);
    const catBarRef = useRef(null);
    const [showAllProducts, setShowAllProducts] = useState(false);

    const [categoriesList, setCategoriesList] = useState(searchDataCache?.categoriesList || defaultCategories);
    const [storeProfilesMap, setStoreProfilesMap] = useState(searchDataCache?.storeProfilesMap || {});

    // Reset pagination to 12 items when search query, active category, or store filter changes
    useEffect(() => {
        setShowAllProducts(false);
    }, [query, activeCategory, selectedStore]);

    const scrollCatBar = (direction) => {
        if (catBarRef.current) {
            const scrollAmount = direction === 'left' ? -150 : 150;
            catBarRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (initialCategory) {
            setActiveCategory(initialCategory === 'Low Stock' ? 'All' : initialCategory);
        }
    }, [initialCategory]);

    // Fetch live MongoDB Atlas data (Products, Categories, Store Profiles) in parallel concurrently
    useEffect(() => {
        let isMounted = true;

        const fetchSearchPageData = async () => {
            if (!searchDataCache || !searchDataCache.products || searchDataCache.products.length === 0) setIsLoading(true);
            try {
                const [prodRes, catRes, storeRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/product-inventory/products`).catch(() => null),
                    fetch(`http://localhost:5000/api/product-inventory/categories`).catch(() => null),
                    fetch(`http://localhost:5000/api/customer-shopping/stores`).catch(() => null)
                ]);

                let fetchedProducts = searchDataCache?.products || [];
                let fetchedCats = searchDataCache?.categoriesList || defaultCategories;
                let fetchedMap = searchDataCache?.storeProfilesMap || {};

                if (prodRes && prodRes.ok) {
                    const prodData = await prodRes.json();
                    if (prodData.success && Array.isArray(prodData.products) && isMounted) {
                        fetchedProducts = prodData.products.map(p => {
                            const imgUrl = p.imageUrl || p.image || '';
                            const fallbackImg = getCategoryImageFallback(p.category, p.name);
                            const hasValidImg = imgUrl && (imgUrl.startsWith('data:') || imgUrl.startsWith('http') || imgUrl.startsWith('/'));
                            return {
                                id: p._id || p.id,
                                name: p.name,
                                brand: p.brand || '',
                                category: p.category || 'Grocery',
                                price: p.price,
                                unit: p.unit || '1kg',
                                stock: p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10),
                                storeName: p.storeName || p.brand || 'Lanka Mart',
                                image: hasValidImg ? imgUrl : fallbackImg,
                                useImageFile: !imgUrl.startsWith('data:')
                            };
                        });
                        setProducts(fetchedProducts);
                    }
                }

                if (catRes && catRes.ok) {
                    const catData = await catRes.json();
                    if (catData.success && Array.isArray(catData.categories) && isMounted) {
                        const fetchedNames = catData.categories
                            .map(c => (typeof c === 'string' ? c : (c.name || '')))
                            .filter(c => c && c !== 'Low Stock');
                        const productCats = fetchedProducts.map(p => p.category).filter(Boolean);
                        const combinedCats = Array.from(new Set([...fetchedNames, ...productCats]));
                        fetchedCats = combinedCats.length > 0 ? ['All', ...combinedCats] : defaultCategories;
                        setCategoriesList(fetchedCats);
                    }
                }

                if (storeRes && storeRes.ok) {
                    const storeData = await storeRes.json();
                    if (storeData.success && Array.isArray(storeData.stores) && isMounted) {
                        const map = {};
                        storeData.stores.forEach(s => {
                            const nameKey = s.name ? s.name.split(' - ')[0].replace(/\s+/g, '').trim().toLowerCase() : '';
                            if (nameKey) {
                                map[nameKey] = s.picture || s.image || s.storeIcon || null;
                            }
                        });
                        fetchedMap = map;
                        setStoreProfilesMap(map);
                    }
                }

                searchDataCache = {
                    products: fetchedProducts,
                    categoriesList: fetchedCats,
                    storeProfilesMap: fetchedMap
                };
            } catch (err) {
                console.warn('Error loading SearchPage data from backend database:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchSearchPageData();
    }, []);

    // Helper to match store name safely (normalized whitespace & case insensitive)
    const isStoreMatch = (productStore, targetStoreObj) => {
        if (!targetStoreObj) return true; // No store selected -> match all stores
        const selName = typeof targetStoreObj === 'string' ? targetStoreObj : (targetStoreObj.name || targetStoreObj.storeName || '');
        if (!selName) return true;

        const selLower = selName.toLowerCase().trim();
        if (selLower.includes('all nearby') || selLower.includes('all store') || selLower === 'all') {
            return true; // Match ALL products in MongoDB 'products' collection when "All Nearby Stores" is selected
        }

        const prodStoreClean = String(productStore || '').toLowerCase().replace(/\s+/g, '').trim();
        const targetStoreClean = selLower.split('-')[0].split('(')[0].replace(/\s+/g, '').trim();

        if (!prodStoreClean || !targetStoreClean) return true;

        return prodStoreClean.includes(targetStoreClean) || targetStoreClean.includes(prodStoreClean);
    };

    const rawStoreName = selectedStore ? (typeof selectedStore === 'string' ? selectedStore : (selectedStore.name || selectedStore.storeName || '')) : '';
    const isAllStoresSelected = !rawStoreName || rawStoreName.toLowerCase().includes('all nearby') || rawStoreName.toLowerCase().includes('all store');
    const selectedStoreName = isAllStoresSelected ? '' : rawStoreName;

    const filtered = products.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pBrand = (p.brand || '').toLowerCase();
        const q = query.toLowerCase().trim();

        const matchesQuery = !q || pName.includes(q) || pCat.includes(q) || pBrand.includes(q);

        const matchesCat = (() => {
            if (!activeCategory || activeCategory === 'All') return true;
            const actLower = activeCategory.toLowerCase().trim();
            const catLower = pCat.trim();
            if (catLower === actLower) return true;
            if (catLower.includes(actLower) || actLower.includes(catLower)) return true;
            const actWords = actLower.split(/[\s&,/]+/).filter(w => w.length > 2);
            const catWords = catLower.split(/[\s&,/]+/).filter(w => w.length > 2);
            return actWords.some(w => catLower.includes(w)) || catWords.some(w => actLower.includes(w));
        })();

        const matchesStore = isStoreMatch(p.storeName, selectedStore);

        return matchesQuery && matchesCat && matchesStore;
    });

    return (
        <div className="search-page-container">
            {/* Store Selection Header Banner - Sleek & Modern */}
            <div className="search-store-badge-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F0FDF4', borderRadius: '14px', border: '1px solid #DCFCE7', marginBottom: '14px' }}>
                <div className="store-badge-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: '#DCFCE7', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={18} color="#2D7B38" />
                    </div>
                    <div className="store-badge-text-col" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="store-badge-label" style={{ fontSize: '10px', fontWeight: '800', color: '#166534', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                            {selectedStoreName ? 'STORE SELECTED' : 'STORE FILTER'}
                        </span>
                        <span className="store-badge-name" style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginTop: '1px' }}>
                            {selectedStoreName ? selectedStoreName : 'All Nearby Stores'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedStoreName && onSelectStore && (
                        <button
                            onClick={() => onSelectStore(null)}
                            style={{
                                backgroundColor: '#E2E8F0',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '7px 11px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            All Stores
                        </button>
                    )}
                    <button
                        className="change-store-link-btn"
                        onClick={() => onNavigate && onNavigate('stores')}
                        style={{
                            backgroundColor: '#2D7B38',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '7px 13px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(45, 123, 56, 0.15)'
                        }}
                    >
                        {selectedStoreName ? 'Change' : 'Select Store'}
                    </button>
                </div>
            </div>

            {/* Page Header Titles with Back Arrow */}
            <div className="search-titles-group-row">
                <div className="search-titles-group">
                    <h1 className="search-main-title">Products</h1>
                    <p className="search-main-sub">
                        {selectedStoreName ? `Showing produce for ${selectedStoreName}` : (activeCategory !== 'All' ? `Showing ${activeCategory}` : 'Browse available groceries')}
                    </p>
                </div>
                <button className="search-page-back-arrow" onClick={() => onNavigate && onNavigate('home')} aria-label="Back to home">
                    <ArrowLeft size={20} color="#1E293B" />
                </button>
            </div>

            {/* Search Input Box */}
            <div className="search-input-box">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products..."
                    className="exact-search-field"
                />
                {query && (
                    <button className="search-clear-x-btn" onClick={() => setQuery('')}>
                        <X size={16} color="#64748B" />
                    </button>
                )}
            </div>

            {/* Category Filter Chips Bar with Scroll Arrow Controls matching Image 1 */}
            <div className="pi-plist-cat-wrapper" style={{ marginBottom: '14px' }}>
                <button
                    type="button"
                    className="pi-plist-scroll-arrow"
                    onClick={() => scrollCatBar('left')}
                    aria-label="Scroll categories left"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="pi-plist-cat-bar" ref={catBarRef}>
                    {categoriesList.map(cat => {
                        const catName = typeof cat === 'string' ? cat : (cat?.name || '');
                        if (!catName) return null;
                        const isActive = activeCategory === catName;
                        return (
                            <button
                                key={catName}
                                className={`pi-plist-cat-pill ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveCategory(catName)}
                            >
                                {catName}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    className="pi-plist-scroll-arrow"
                    onClick={() => scrollCatBar('right')}
                    aria-label="Scroll categories right"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* 2-Column Product Cards Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <Loader2 size={28} className="spin-animate" color="#2D7B38" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>Loading products directly from database...</span>
                </div>
            ) : filtered.length > 0 ? (
                <div className="image3-product-grid">
                    {(showAllProducts ? filtered : filtered.slice(0, 12)).map((product) => {
                        const sName = product.storeName || selectedStoreName || 'PickFresh Store';
                        const sNameKey = sName.split(' - ')[0].trim().toLowerCase();
                        const storePic = product.storeIcon || product.storePicture || storeProfilesMap[sNameKey] || (selectedStore && (selectedStore.picture || selectedStore.image));

                        return (
                            <div
                                key={product.id}
                                className="image3-grid-card"
                                onClick={() => onSelectProduct && onSelectProduct(product)}
                            >
                                <div className="image3-card-img-box">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="image3-card-img"
                                        onError={(e) => { e.target.src = '/cat_veg.png'; }}
                                    />
                                </div>
                                <div className="image3-card-info">
                                    <span style={{
                                        fontSize: '9.5px',
                                        fontWeight: '800',
                                        color: '#15803D',
                                        backgroundColor: '#F0FDF4',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        border: '1px solid #BBF7D0',
                                        marginBottom: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {storePic ? (
                                            <img
                                                src={storePic}
                                                alt={sName}
                                                style={{ width: '13px', height: '13px', borderRadius: '50%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <Store size={11} color="#15803D" />
                                        )}
                                        <span>{sName.split(' - ')[0]}</span>
                                    </span>
                                    <h3 className="image3-card-name">{product.name}</h3>
                                    <span className="image3-card-price">Rs. {product.price} / {(!product.unit || product.unit === 'item') ? '1kg' : product.unit}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1', margin: '20px 0' }}>
                    <Store size={36} color="#94A3B8" style={{ marginBottom: '10px' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>No Products Found</h3>
                    <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                        {selectedStoreName ? `No items available for "${selectedStoreName}" under "${activeCategory}"` : 'No products match your search.'}
                    </p>
                    {selectedStoreName && onSelectStore && (
                        <button
                            onClick={() => onSelectStore(null)}
                            style={{
                                backgroundColor: '#2D7B38',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Show products from all stores
                        </button>
                    )}
                </div>
            )}

            {/* Bottom View All Products Button with Remaining Count */}
            {!showAllProducts && filtered.length > 12 ? (
                <div className="search-bottom-action-container">
                    <button
                        className="view-all-products-soft-btn"
                        onClick={() => setShowAllProducts(true)}
                    >
                        View all products (+{filtered.length - 12} more)
                    </button>
                </div>
            ) : showAllProducts && filtered.length > 12 ? (
                <div className="search-bottom-action-container">
                    <button
                        className="view-all-products-soft-btn"
                        style={{ backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}
                        onClick={() => {
                            setShowAllProducts(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                        Showing all {filtered.length} products
                    </button>
                </div>
            ) : null}
        </div>
    );
}
