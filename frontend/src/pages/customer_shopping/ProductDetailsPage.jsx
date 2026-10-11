import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, Store, ShieldCheck, Clock, Leaf, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import './ProductDetailsPage.css';

export default function ProductDetailsPage({ product, onNavigate, addToCart, selectedStore }) {
    const [quantity, setQuantity] = useState(1);
    const [selectedPortion, setSelectedPortion] = useState('1kg');
    const [imgSrc, setImgSrc] = useState('/cat_veg.png');
    const [storePicture, setStorePicture] = useState(selectedStore?.picture || selectedStore?.image || null);

    const activeProduct = product || {
        id: 'p0',
        name: 'Fresh Red Tomatoes',
        brand: 'Lanka Mart',
        category: 'Vegetables',
        price: 340,
        unit: '1kg',
        available: 100,
        stock: 50,
        image: '/cat_veg.png',
        useImageFile: true
    };

    const storeDisplayName = selectedStore
        ? (selectedStore.name ? selectedStore.name.split(' - ')[0] : String(selectedStore))
        : (activeProduct?.storeName || 'PickFresh Super');

    // Resolve store profile picture from selectedStore or API
    useEffect(() => {
        if (selectedStore?.picture || selectedStore?.image) {
            setStorePicture(selectedStore.picture || selectedStore.image);
            return;
        }

        const fetchStoreProfile = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/customer-shopping/stores');
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.stores)) {
                    const match = data.stores.find(st =>
                        st.name.toLowerCase().includes(storeDisplayName.toLowerCase()) ||
                        storeDisplayName.toLowerCase().includes(st.name.toLowerCase())
                    );
                    if (match && match.picture) {
                        setStorePicture(match.picture);
                    }
                }
            } catch (err) { }
        };
        fetchStoreProfile();
    }, [selectedStore, storeDisplayName]);

    // Determine initial valid image source
    useEffect(() => {
        window.scrollTo(0, 0);
        const rawImg = activeProduct?.imageUrl || activeProduct?.image;
        const catLower = (activeProduct?.category && typeof activeProduct.category === 'string') ? activeProduct.category.toLowerCase() : '';
        if (typeof rawImg === 'string' && (rawImg.startsWith('data:image') || rawImg.startsWith('/') || rawImg.startsWith('http'))) {
            setImgSrc(rawImg);
        } else if (catLower.includes('fruit')) {
            setImgSrc('/cat_fruit.png');
        } else if (catLower.includes('dairy')) {
            setImgSrc('/highland_milk.png');
        } else if (catLower.includes('grain') || catLower.includes('rice')) {
            setImgSrc('/cat_rice.png');
        } else {
            setImgSrc('/cat_veg.png');
        }
    }, [activeProduct]);

    // Portion selector (250g, 500g, 1kg) is strictly for Vegetables and Fruits produce
    const catLower = String(activeProduct?.category || '').toLowerCase().trim();
    const isWeightedProduct = (
        catLower.includes('vegetable') ||
        catLower.includes('fruit') ||
        catLower.includes('produce')
    );

    // Calculate dynamic price per selected portion if weighted product
    let portionMultiplier = 1;
    if (isWeightedProduct) {
        if (selectedPortion === '250g') portionMultiplier = 0.25;
        else if (selectedPortion === '500g') portionMultiplier = 0.5;
        else if (selectedPortion === '1kg') portionMultiplier = 1.0;
    }

    const basePrice = Number(activeProduct?.price) || 340;
    const finalPrice = isWeightedProduct ? Math.round(basePrice * portionMultiplier) : basePrice;
    const displayUnit = isWeightedProduct ? selectedPortion : (activeProduct?.unit || 'Item');

    const lowThreshold = activeProduct?.lowStockThreshold || activeProduct?.minStock || 10;
    const stockCount = activeProduct?.stock !== undefined ? activeProduct.stock : (activeProduct?.available !== undefined ? activeProduct.available : 50);
    const isOutOfStock = stockCount <= 0;
    const isLowStock = stockCount > 0 && stockCount <= lowThreshold;

    const handleAddToCart = () => {
        if (addToCart && activeProduct) {
            addToCart({
                ...activeProduct,
                name: isWeightedProduct ? `${activeProduct.name || 'Product'} (${selectedPortion})` : (activeProduct.name || 'Product'),
                price: finalPrice,
                unit: displayUnit,
                stock: stockCount,
                lowStockThreshold: lowThreshold,
                isLowStock: isLowStock || quantity > stockCount
            }, quantity);
        }
        if (onNavigate) {
            onNavigate('cart');
        }
    };

    const category = activeProduct?.category || 'Grocery';

    // Extract or infer brand from activeProduct
    let productBrand = activeProduct?.brand ? String(activeProduct.brand).trim() : '';

    // If brand wasn't explicitly provided, infer brand if product name starts with a known brand or first word
    if (!productBrand && activeProduct?.name) {
        const nameStr = String(activeProduct.name).trim();
        const firstWord = nameStr.split(' ')[0];
        const knownBrands = [
            'cic', 'dove', 'highland', 'munchee', 'maliban', 'anchor', 'kist',
            'prima', 'kotmale', 'pelwatte', 'cbl', 'harischandra', 'wijeya',
            'mcfoil', 'dilmah', 'watawala', 'zesta', 'lipton', 'nestle', 'milo',
            'maggi', 'coca-cola', 'sprite', 'fanta', 'pepsi', 'dettol', 'lux', 'sunsilk'
        ];
        if (firstWord && knownBrands.includes(firstWord.toLowerCase())) {
            productBrand = firstWord;
        } else if (nameStr.toLowerCase().startsWith('elephant house')) {
            productBrand = 'Elephant House';
        }
    }

    const hasBrand = Boolean(
        productBrand &&
        productBrand.toLowerCase() !== 'undefined' &&
        productBrand.toLowerCase() !== 'null' &&
        productBrand.toLowerCase() !== storeDisplayName.toLowerCase()
    );

    return (
        <div className="pd-modern-page">
            {/* Page Header Titles matching Search Page layout */}
            <div className="pd-titles-group-row">
                <div className="pd-titles-group">
                    <h1 className="pd-main-title">Product details</h1>
                    <p className="pd-main-sub">{storeDisplayName}</p>
                </div>
                <button
                    className="pd-page-back-arrow"
                    onClick={() => {
                        if (onNavigate) onNavigate('search');
                    }}
                    aria-label="Back to Search"
                >
                    <ArrowLeft size={20} color="#1E293B" />
                </button>
            </div>

            <div className="pd-scrollable-body">
                {/* Product Image Card Hero */}
                <div className="pd-hero-image-card">
                    <div className="pd-stock-pill" style={{
                        backgroundColor: isOutOfStock ? '#FEE2E2' : isLowStock ? '#FEF3C7' : '#DCFCE7',
                        color: isOutOfStock ? '#991B1B' : isLowStock ? '#92400E' : '#166534',
                        border: `1px solid ${isOutOfStock ? '#FCA5A5' : isLowStock ? '#FDE68A' : '#86EFAC'}`
                    }}>
                        <span className="pd-stock-dot" style={{
                            backgroundColor: isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#22C55E'
                        }}></span>
                        <span>
                            {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? `LOW STOCK (${stockCount} LEFT)` : 'IN STOCK'}
                        </span>
                    </div>

                    <div className="pd-image-container">
                        <img
                            src={imgSrc}
                            alt={activeProduct.name}
                            className="pd-hero-img"
                            onError={() => setImgSrc('/cat_veg.png')}
                        />
                    </div>
                </div>

                {/* Main Details Card */}
                <div className="pd-details-card">
                    <div className="pd-tag-row">
                        {hasBrand && (
                            <span style={{
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: '1px solid #FDE68A',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Tag size={12} color="#B45309" />
                                {productBrand}
                            </span>
                        )}
                        <span className="pd-category-chip">{category}</span>
                        <span className="pd-store-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            {storePicture ? (
                                <img
                                    src={storePicture}
                                    alt={storeDisplayName}
                                    style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            ) : (
                                <Store size={12} color="#2D7B38" />
                            )}
                            {storeDisplayName}
                        </span>
                    </div>

                    <h2 className="pd-title">{activeProduct.name}</h2>

                    <div className="pd-price-row">
                        <div className="pd-price-main">
                            <span className="pd-currency">Rs.</span>
                            <span className="pd-amount">{finalPrice}</span>
                            <span className="pd-portion-label">/ {displayUnit}</span>
                        </div>
                        {isWeightedProduct && selectedPortion !== '1kg' && (
                            <span className="pd-original-unit-price">(Base: Rs. {basePrice}/1kg)</span>
                        )}
                    </div>

                    {/* Portion Selector Grid (ONLY for Weighted / kg Products) */}
                    {isWeightedProduct && (
                        <div className="pd-portion-section">
                            <label className="pd-section-label">Select Portion / Weight:</label>
                            <div className="pd-portion-grid">
                                {['250g', '500g', '1kg'].map(portion => (
                                    <button
                                        key={portion}
                                        type="button"
                                        className={`pd-portion-btn ${selectedPortion === portion ? 'active' : ''}`}
                                        onClick={() => setSelectedPortion(portion)}
                                    >
                                        <span>{portion}</span>
                                        {selectedPortion === portion && <span className="pd-active-check">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity Selector Section */}
                    <div className="pd-quantity-section">
                        <label className="pd-section-label" style={{ margin: 0 }}>Quantity:</label>
                        <div className="pd-qty-control-box">
                            <button
                                type="button"
                                className="pd-qty-btn"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                            >
                                <Minus size={16} strokeWidth={2.5} color={quantity <= 1 ? '#94A3B8' : '#1E293B'} />
                            </button>
                            <span className="pd-qty-number">{quantity}</span>
                            <button
                                type="button"
                                className="pd-qty-btn"
                                onClick={() => setQuantity(quantity + 1)}
                            >
                                <Plus size={16} strokeWidth={2.5} color="#1E293B" />
                            </button>
                        </div>
                    </div>

                    {/* Low Stock / Smart Replacement Alert Banner (Full-Width Block below Quantity) */}
                    {(isLowStock || quantity > stockCount) && (
                        <div className="pd-smart-alert-banner" style={{
                            backgroundColor: quantity > stockCount ? '#FEF2F2' : '#FFFBEB',
                            border: `1px solid ${quantity > stockCount ? '#FCA5A5' : '#FCD34D'}`,
                            borderRadius: '12px',
                            padding: '10px 14px',
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            fontSize: '12.5px',
                            color: quantity > stockCount ? '#991B1B' : '#B45309',
                            fontWeight: '600',
                            lineHeight: '1.4'
                        }}>
                            <Sparkles size={16} color={quantity > stockCount ? '#DC2626' : '#B45309'} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                                {quantity > stockCount
                                    ? `Stock limit: Only ${stockCount} available in store. Adding to cart will trigger Smart Replacement for remaining items!`
                                    : `Low stock item (${stockCount} left). Smart Substitution available if stock runs out.`}
                            </span>
                        </div>
                    )}

                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="pd-bottom-action-bar">
                <button
                    className="pd-add-to-cart-btn"
                    onClick={handleAddToCart}
                >
                    <ShoppingBag size={18} color="#FFFFFF" />
                    <span>Add {quantity} to cart • Rs. {finalPrice * quantity}</span>
                </button>
            </div>
        </div>
    );
}
