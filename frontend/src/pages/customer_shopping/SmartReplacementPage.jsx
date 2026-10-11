import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Sparkles, Tag, PackageX } from 'lucide-react';
import './SmartReplacementPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to extract core product keywords (ignoring brand names and units)
const extractCoreKeywords = (nameStr = '') => {
    if (!nameStr) return [];
    const ignoreWords = new Set([
        'anchor', 'highland', 'maliban', 'munchee', 'keells', 'ratthi', 'elephant', 'house',
        'coca-cola', 'coke', 'sunquick', 'kist', 'astra', 'maggi', 'md', 'surf', 'excel',
        'vim', 'sunlight', 'signal', 'kotmale', 'bairaha', 'prima', 'nestle', 'milo',
        'laksala', 'pelwatte', 'harischandra', 'mccurrie', 'dilmah', 'zesta', 'watawala',
        '1kg', '500g', '250g', '100g', '1l', '500ml', 'pack', 'bottle', 'loaf', 'bag', 'liter', 'item', 'fresh', 'organic', 'salted', 'unsalted'
    ]);
    const words = nameStr.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
    const coreKeywords = words.filter(w => !ignoreWords.has(w));
    return coreKeywords.length > 0 ? coreKeywords : words;
};

export default function SmartReplacementPage({ onNavigate, onReplaceItem, itemToReplace }) {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [alternativesList, setAlternativesList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const originalName = itemToReplace ? itemToReplace.name : 'Fresh Product';
    const category = itemToReplace?.category || '';
    const currentBrand = itemToReplace?.brand || '';
    const targetStoreName = itemToReplace?.storeName || '';
    const stock = itemToReplace?.stock !== undefined ? itemToReplace?.stock : 0;
    const reqQty = itemToReplace?.quantity || 1;
    const isOutOfStock = stock <= 0;

    useEffect(() => {
        const t = setTimeout(() => setIsVisible(true), 80);

        const fetchRealDatabaseAlternatives = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/product-inventory/products`);
                const data = await res.json();

                if (data.success && Array.isArray(data.products)) {
                    const coreKeywords = extractCoreKeywords(originalName);

                    // 1. Filter store-specific real database products first
                    let storeFiltered = data.products.filter(p => {
                        const isExactSame = p.name === originalName || p._id === itemToReplace?.id || p.id === itemToReplace?.id;
                        if (isExactSame) return false;

                        if (!targetStoreName) return true;
                        const pStoreClean = (p.storeName || p.storeEmail || '').toLowerCase().replace(/\s+/g, '');
                        const tStoreClean = targetStoreName.toLowerCase().replace(/\s+/g, '');
                        return !pStoreClean || pStoreClean.includes(tStoreClean) || tStoreClean.includes(pStoreClean);
                    });

                    // If store filter yielded no candidate products, search across all store products in MongoDB
                    const candidatePool = storeFiltered.length > 0 ? storeFiltered : data.products.filter(p => p.name !== originalName && p._id !== itemToReplace?.id);

                    // 2. Score and map matching real products
                    const matchedProducts = candidatePool
                        .filter(p => {
                            const pNameLower = (p.name || '').toLowerCase();
                            const pCatLower = (p.category || '').toLowerCase();
                            const targetCatLower = category.toLowerCase();

                            const hasNameWord = coreKeywords.some(kw => pNameLower.includes(kw));
                            const hasSameCat = targetCatLower && (pCatLower.includes(targetCatLower) || targetCatLower.includes(pCatLower));

                            return hasNameWord || hasSameCat;
                        })
                        .map(p => {
                            const pNameLower = (p.name || '').toLowerCase();
                            const matchedWord = coreKeywords.find(kw => pNameLower.includes(kw));
                            const hasNameWord = Boolean(matchedWord);

                            return {
                                id: p.id || p._id,
                                name: p.name,
                                brand: p.brand || (p.name ? p.name.split(' ')[0] : 'Store Product'),
                                category: p.category || category || 'Store Inventory',
                                price: p.price,
                                stock: p.stock !== undefined ? p.stock : (p.available !== undefined ? p.available : 50),
                                matchPercentage: hasNameWord ? 98 : 92,
                                image: p.image || p.imageUrl || '/cat_veg.png',
                                priceNote: matchedWord ? `Same Type: "${matchedWord.toUpperCase()}"` : (p.brand ? `Brand: ${p.brand}` : 'Same Category'),
                                storeName: p.storeName || targetStoreName || 'PickFresh Super'
                            };
                        });

                    // Sort by highest match percentage first
                    matchedProducts.sort((a, b) => b.matchPercentage - a.matchPercentage);
                    setAlternativesList(matchedProducts);
                } else {
                    setAlternativesList([]);
                }
            } catch (err) {
                console.warn('Backend database connection error:', err);
                setAlternativesList([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealDatabaseAlternatives();
        return () => clearTimeout(t);
    }, [itemToReplace, category, currentBrand, originalName, targetStoreName]);

    const handleUseAlternative = () => {
        if (alternativesList.length === 0) return;
        const chosen = alternativesList[selectedIndex];
        if (onReplaceItem) {
            onReplaceItem(chosen, itemToReplace?.id);
        }
        if (onNavigate) {
            onNavigate('cart');
        }
    };

    const handleKeepOriginal = () => {
        if (onNavigate) {
            onNavigate('cart');
        }
    };

    const coreKwDisplay = extractCoreKeywords(originalName)[0] || category || 'product';

    return (
        <div className={`sr-container ${isVisible ? 'sr-visible' : ''}`}>
            {/* Header */}
            <div className="sr-header">
                <div className="sr-title-group">
                    <h1 className="sr-title">Smart replacement</h1>
                    <span className="sr-subtitle">Substitute unavailable items with top-rated brands</span>
                </div>
                <button
                    className="sr-back-btn"
                    onClick={handleKeepOriginal}
                    aria-label="Go Back to Cart"
                >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
            </div>

            {/* Unavailable / Low Stock Alert Card */}
            <div className="sr-alert" style={{
                backgroundColor: isOutOfStock ? '#FEF2F2' : '#FFFBEB',
                borderColor: isOutOfStock ? '#FCA5A5' : '#FCD34D'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sparkles size={18} color={isOutOfStock ? '#DC2626' : '#B45309'} />
                    <h3 className="sr-alert-title" style={{ color: isOutOfStock ? '#991B1B' : '#92400E' }}>
                        {isOutOfStock
                            ? `${originalName} is Out of Stock`
                            : `Low Stock Shortage: ${originalName}`}
                    </h3>
                </div>
                <p className="sr-alert-desc" style={{ color: isOutOfStock ? '#7F1D1D' : '#78350F' }}>
                    {isOutOfStock
                        ? `Fetching live store inventory alternatives matching "${coreKwDisplay}" from database:`
                        : `You requested ${reqQty} items, but only ${stock} are in stock. Select a real store alternative matching "${coreKwDisplay}" below:`}
                </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="sr-loading-container">
                    <div className="sr-spinner"></div>
                    <p className="sr-loading-text">Loading real store alternatives from database...</p>
                </div>
            ) : alternativesList.length === 0 ? (
                /* Empty State - No Mock Data */
                <div className="sr-empty-state">
                    <PackageX size={42} color="#94A3B8" />
                    <h4 className="sr-empty-title">No Alternative Products Found</h4>
                    <p className="sr-empty-desc">There are currently no alternative products matching "{originalName}" in this store's live inventory.</p>
                </div>
            ) : (
                /* Real Product List from Database */
                <div className="sr-products-list">
                    {alternativesList.map((item, idx) => (
                        <div
                            key={item.id || idx}
                            className={`sr-product-card ${selectedIndex === idx ? 'sr-selected' : ''}`}
                            onClick={() => setSelectedIndex(idx)}
                        >
                            {/* Selection indicator */}
                            <div className="sr-select-indicator">
                                <div className={`sr-radio ${selectedIndex === idx ? 'sr-radio-active' : ''}`}>
                                    {selectedIndex === idx && <CheckCircle2 size={20} />}
                                </div>
                            </div>

                            {/* Product Image */}
                            <div className="sr-product-img-wrap">
                                <img
                                    src={typeof item.image === 'string' && (item.image.startsWith('data:') || item.image.startsWith('/') || item.image.startsWith('http')) ? item.image : '/cat_veg.png'}
                                    alt={item.name}
                                    className="sr-product-img"
                                    onError={(e) => { e.target.src = '/cat_veg.png'; }}
                                />
                            </div>

                            {/* Product Details */}
                            <div className="sr-product-details">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    {item.brand && (
                                        <span style={{
                                            backgroundColor: '#F0FDF4', color: '#166534', fontSize: '10px',
                                            fontWeight: '800', padding: '2px 8px', borderRadius: '10px', border: '1px solid #BBF7D0',
                                            display: 'inline-flex', alignItems: 'center', gap: '3px'
                                        }}>
                                            <Tag size={11} color="#166534" />
                                            {item.brand}
                                        </span>
                                    )}
                                </div>
                                <h2 className="sr-product-name">{item.name}</h2>
                                <span className="sr-product-meta">{item.category} • {item.priceNote}</span>

                                <div className="sr-price-row">
                                    <span className="sr-price">Rs. {item.price.toLocaleString()}</span>
                                </div>

                                <div className="sr-badge-row">
                                    <span className="sr-match-badge">{item.matchPercentage}% MATCH</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="sr-actions">
                {alternativesList.length > 0 && (
                    <button
                        className="sr-use-btn"
                        onClick={handleUseAlternative}
                        disabled={isLoading}
                    >
                        Use selected alternative
                    </button>
                )}

                <button
                    className="sr-keep-btn"
                    onClick={handleKeepOriginal}
                >
                    Keep original request
                </button>
            </div>
        </div>
    );
}
