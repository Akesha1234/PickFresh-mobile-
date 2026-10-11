import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Store, Plus, Edit3, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EditProductPage from './EditProductPage';
import AddProductPage from './AddProductPage';
import DeleteProductModal from './DeleteProductModal';
import './ProductListPage.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';

let productListCache = null;

export const clearProductListCache = () => {
    productListCache = null;
};

export default function ProductListPage({ onNavigate }) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [currentScreen, setCurrentScreen] = useState('list');
    const [isLoading, setIsLoading] = useState(!productListCache);
    const [products, setProducts] = useState(productListCache || []);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const catBarRef = useRef(null);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        productListCache = null;
        fetchProductsFromBackend();
        fetchCategoriesFromBackend().finally(() => {
            setTimeout(() => setIsRefreshing(false), 600);
        });
    };

    const [categories, setCategories] = useState(['All', 'Low Stock']);

    const scrollCatBar = (direction) => {
        if (catBarRef.current) {
            const scrollAmount = direction === 'left' ? -150 : 150;
            catBarRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Fetch Products & Categories from Backend API (MongoDB Atlas)
    const fetchProductsFromBackend = async () => {
        if (!user || !user.email) return; // Wait for user to be loaded

        if (!productListCache) {
            setIsLoading(true);
        }
        try {
            const endpoint = `${API_BASE_URL}/products?storeEmail=${encodeURIComponent(user.email)}&_t=${Date.now()}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.products)) {
                productListCache = data.products;
                setProducts(data.products);
                if (data.products.length > 0) {
                    setSelectedProductId(data.products[0].id || data.products[0]._id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch products from MongoDB Atlas:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategoriesFromBackend = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/categories`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                const fetchedNames = data.categories
                    .map(c => (typeof c === 'string' ? c : (c.name || '')))
                    .filter(Boolean);
                const merged = Array.from(new Set(['All', 'Low Stock', ...fetchedNames]));
                setCategories(merged);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    useEffect(() => {
        fetchProductsFromBackend();
        fetchCategoriesFromBackend();
    }, [user?.email]);

    const filteredProducts = products.filter(p => {
        const storeNameStr = p.storeName || 'Lanka Mart';
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            storeNameStr.toLowerCase().includes(searchTerm.toLowerCase());

        if (selectedCategory === 'All') return matchesSearch;
        if (selectedCategory === 'Low Stock') return matchesSearch && (p.stock <= (p.minStock || 10));
        return matchesSearch && p.category === selectedCategory;
    });

    const handleEditProduct = (prod, e) => {
        if (e) e.stopPropagation();
        setEditingProduct(prod);
        if (onNavigate) {
            onNavigate('edit_product', { product: prod });
        } else {
            setCurrentScreen('edit');
        }
    };

    const handleDeleteClick = (prod, e) => {
        if (e) e.stopPropagation();
        setDeletingProduct(prod);
    };

    const handleConfirmDelete = async (productId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                clearProductListCache();
                setProducts(prev => prev.filter(p => (p.id || p._id) !== productId));
                setDeletingProduct(null);
            }
        } catch (err) {
            console.error('Error deleting product:', err);
        }
    };

    const handleAddNew = () => {
        if (onNavigate) {
            onNavigate('add_product');
        } else {
            setCurrentScreen('add');
        }
    };

    if (currentScreen === 'edit') {
        return <EditProductPage onNavigate={() => { setCurrentScreen('list'); fetchProductsFromBackend(); }} product={editingProduct} />;
    }

    if (currentScreen === 'add') {
        return <AddProductPage onNavigate={() => { setCurrentScreen('list'); fetchProductsFromBackend(); }} />;
    }

    return (
        <div className="pi-plist-page-container">
            {/* Delete Modal */}
            <DeleteProductModal
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleConfirmDelete}
                product={deletingProduct}
            />

            {/* Scrollable Main Content */}
            <div className="pi-plist-scroll-content">
                {/* Title & Top Action Row */}
                <div className="pi-plist-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h1 className="pi-plist-page-title" style={{ margin: 0 }}>Products</h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Refresh Icon Button */}
                        <button
                            type="button"
                            onClick={handleManualRefresh}
                            title="Refresh products from database"
                            style={{
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#F8FAFC',
                                color: '#334155',
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <RefreshCw size={17} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                        </button>

                        {/* Top "+ Add Product" Quick Action Button */}
                        <button
                            type="button"
                            onClick={handleAddNew}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#166534',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(22, 101, 52, 0.25)'
                            }}
                        >
                            <Plus size={16} /> Add Product
                        </button>

                        {/* Back Arrow Button on Right */}
                        <button
                            type="button"
                            className="pi-plist-back-arrow"
                            onClick={() => onNavigate && onNavigate('home')}
                            aria-label="Back to home"
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                            }}
                        >
                            <ArrowLeft size={20} color="#0F172A" />
                        </button>
                    </div>
                </div>

                {/* Search Input Box */}
                <div className="pi-plist-search-wrapper">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pi-plist-search-input"
                    />
                </div>

                {/* Category Filter Pills Bar with Scroll Controls matching Image 1 */}
                <div className="pi-plist-cat-wrapper">
                    <button
                        type="button"
                        className="pi-plist-scroll-arrow"
                        onClick={() => scrollCatBar('left')}
                        aria-label="Scroll categories left"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="pi-plist-cat-bar" ref={catBarRef}>
                        {categories.map(cat => {
                            const catName = typeof cat === 'string' ? cat : (cat?.name || '');
                            if (!catName) return null;
                            const isActive = selectedCategory === catName;
                            return (
                                <button
                                    key={catName}
                                    className={`pi-plist-cat-pill ${isActive ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(catName)}
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

                {/* Product Cards Stack - Direct Action Buttons */}
                <div className="pi-plist-cards-stack">
                    {isLoading ? (
                        /* Loading State */
                        <div style={{ textAlign: 'center', padding: '52px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '48px', height: '48px', border: '3px solid #E2E8F0',
                                borderTopColor: '#166534', borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748B' }}>Loading your products...</span>
                        </div>
                    ) : products.length === 0 ? (
                        /* No Products In DB For This Store */
                        <div style={{
                            textAlign: 'center', padding: '40px 24px',
                            backgroundColor: '#F8FAFC', borderRadius: '20px',
                            border: '2px dashed #CBD5E1', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', gap: '10px',
                            marginTop: '8px'
                        }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                backgroundColor: '#EFF6FF', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', marginBottom: '4px'
                            }}>
                                <Store size={30} color="#2563EB" />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                                No products added yet
                            </h3>
                            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5, maxWidth: '240px' }}>
                                Your store doesn't have any products in the database. Add your first product to get started.
                            </p>
                            <button
                                onClick={handleAddNew}
                                style={{
                                    marginTop: '8px',
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    backgroundColor: '#166534', color: '#FFFFFF',
                                    border: 'none', padding: '11px 22px',
                                    borderRadius: '12px', fontSize: '13px', fontWeight: '800',
                                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 101, 52, 0.3)'
                                }}
                            >
                                <Plus size={16} /> Add Your First Product
                            </button>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        /* Products exist but none match current filter */
                        <div style={{
                            textAlign: 'center', padding: '36px 20px',
                            backgroundColor: '#FFFBEB', borderRadius: '16px',
                            border: '1px dashed #FDE68A', marginTop: '4px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                        }}>
                            <span style={{ fontSize: '28px' }}>🔍</span>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#92400E', margin: 0 }}>
                                No products found
                            </h3>
                            <p style={{ fontSize: '12px', color: '#B45309', margin: 0 }}>
                                No products match <strong>"{selectedCategory !== 'All' ? selectedCategory : searchTerm}"</strong>. Try a different filter or search term.
                            </p>
                            <button
                                onClick={() => { setSelectedCategory('All'); setSearchTerm(''); }}
                                style={{
                                    marginTop: '6px', backgroundColor: '#D97706', color: '#FFFFFF',
                                    border: 'none', padding: '8px 18px', borderRadius: '10px',
                                    fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                                }}
                            >
                                Show All Products
                            </button>
                        </div>
                    ) : (
                        filteredProducts.map(product => {
                            const pId = product.id || product._id;
                            let badgeClass = 'in-stock';
                            const minStockVal = product.minStock || 10;
                            if (product.stock === 0) badgeClass = 'out-of-stock';
                            else if (product.stock <= minStockVal) badgeClass = 'low-stock';

                            return (
                                <div
                                    key={pId}
                                    className="pi-plist-card"
                                    style={{ position: 'relative' }}
                                >
                                    {/* Product Thumbnail */}
                                    <div className="pi-plist-card-img-wrap">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="pi-plist-card-img"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: product.image ? 'none' : 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '28px',
                                            backgroundColor: product.bgColor || '#F8FAFC'
                                        }}>
                                            {product.fallbackEmoji || '📦'}
                                        </div>
                                    </div>

                                    {/* Product Info & Action Buttons */}
                                    <div className="pi-plist-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                                        <div>
                                            {/* Header Row: Title & Price */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                                <h3 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0F172A', margin: 0, lineHeight: 1.25, flex: 1, wordBreak: 'break-word' }}>
                                                    {product.name}
                                                </h3>
                                                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#166534', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    Rs. {Number(product.price).toLocaleString()} <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>/ {(!product.unit || product.unit === 'item') ? '1kg' : product.unit}</span>
                                                </span>
                                            </div>

                                            {/* Store Name & Optional Brand Badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                {product.brand && (
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#15803D', backgroundColor: '#F0FDF4', padding: '1px 6px', borderRadius: '5px', border: '1px solid #DCFCE7', letterSpacing: '0.2px' }}>
                                                        {product.brand}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {(product.storeIcon || (product.ownerEmail === user?.email ? user?.picture : null)) ? (
                                                        <img
                                                            src={product.storeIcon || user?.picture}
                                                            alt="Store Profile"
                                                            style={{ width: '13px', height: '13px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #CBD5E1' }}
                                                        />
                                                    ) : (
                                                        <Store size={12} color="#166534" />
                                                    )}
                                                    {product.storeName || user?.shopName || 'Lanka Mart'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Stock Badge (Left) & Actions (Right) */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '8px' }}>
                                            {(() => {
                                                const statusLabel = product.stock === 0 ? 'Out of Stock' : product.stock <= minStockVal ? 'Low Stock' : 'In Stock';
                                                let badgeText = statusLabel;

                                                if (product.stock > 0) {
                                                    const unitStr = String(product.unit || '1kg').toLowerCase();
                                                    if (unitStr.includes('250g')) {
                                                        badgeText = `${statusLabel} • ${product.stock} kg (${Math.round(product.stock * 4)} packs)`;
                                                    } else if (unitStr.includes('500g')) {
                                                        badgeText = `${statusLabel} • ${product.stock} kg (${Math.round(product.stock * 2)} packs)`;
                                                    } else if (unitStr.includes('100g')) {
                                                        badgeText = `${statusLabel} • ${product.stock} kg (${Math.round(product.stock * 10)} packs)`;
                                                    } else if (unitStr.includes('kg')) {
                                                        badgeText = `${statusLabel} • ${product.stock} kg`;
                                                    } else {
                                                        badgeText = `${statusLabel} • ${product.stock} ${product.unit || 'items'}`;
                                                    }
                                                }

                                                return (
                                                    <span
                                                        className={`pi-plist-badge ${badgeClass}`}
                                                        style={{
                                                            fontSize: '10.5px',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            whiteSpace: 'nowrap',
                                                            fontWeight: '700',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {badgeText}
                                                    </span>
                                                );
                                            })()}

                                            {/* Edit & Delete Buttons */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleEditProduct(product, e)}
                                                    style={{
                                                        border: '1px solid #E2E8F0',
                                                        backgroundColor: '#FFFFFF',
                                                        color: '#2563EB',
                                                        padding: '4px 9px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    title="Edit product"
                                                >
                                                    <Edit3 size={12} /> Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteClick(product, e)}
                                                    style={{
                                                        border: '1px solid #FEE2E2',
                                                        backgroundColor: '#FEF2F2',
                                                        color: '#EF4444',
                                                        padding: '4px 7px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    title="Delete product"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
