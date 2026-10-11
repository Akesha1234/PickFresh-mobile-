import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, Trash2, Image as ImageIcon, Store, Loader2, UploadCloud, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearProductListCache } from './ProductListPage';
import './EditProductPage.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';

const autoExtractBrand = (productName) => {
    if (!productName || typeof productName !== 'string') return '';
    const knownBrands = [
        'Anchor', 'Highland', 'Maliban', 'Munchee', 'Keells', 'Ratthi', 'Elephant House',
        'Coca-Cola', 'Coke', 'Sunquick', 'Kist', 'Astra', 'Maggi', 'MD', 'Surf Excel',
        'Vim', 'Sunlight', 'Signal', 'Kotmale', 'Bairaha', 'Prima', 'Nestle', 'Milo',
        'Laksala', 'Pelwatte', 'Harischandra', 'McCurrie', 'Dilmah', 'Zesta', 'Watawala',
        'Sanstha', 'Cargills', 'Knorr', 'Heinz', 'Pringles', 'Lays', 'Lay\'s', 'Sprite',
        'Fanta', 'Pepsi', 'Red Bull', '7Up', 'Nescafé', 'Nescafe', 'Goldlee', 'Wijaya',
        'Ruhunu', 'Motha', 'Roar', 'Smak', 'Country Fair', 'Delmege', 'Orient'
    ];
    for (const b of knownBrands) {
        const regex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(productName)) {
            return b;
        }
    }
    return '';
};

export default function EditProductPage({ onNavigate, product }) {
    const { user } = useAuth();

    // Default initial data matching screenshot
    const initialProduct = product || {
        id: 2,
        name: 'Coca-Cola 1.5L',
        storeName: 'Lanka Mart',
        category: 'Soft Drinks',
        price: 520,
        stock: 5,
        minStock: 10,
        image: '/coca_cola.png',
        fallbackEmoji: '🥤'
    };

    // Auto-detect store name
    const storeName = initialProduct.storeName || user?.shopName || user?.name || 'Lanka Mart';

    const [name, setName] = useState(initialProduct.name);
    const [brand, setBrand] = useState(initialProduct.brand || autoExtractBrand(initialProduct.name || ''));
    const [category, setCategory] = useState(initialProduct.category || 'Soft Drinks');
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
    const [price, setPrice] = useState(
        typeof initialProduct.price === 'number' ? initialProduct.price : String(initialProduct.price).replace(/[^0-9.]/g, '')
    );
    const [unit, setUnit] = useState(initialProduct.unit || '1kg');
    const [stock, setStock] = useState(initialProduct.stock);
    const [minStock, setMinStock] = useState(initialProduct.minStock);
    const [supplierName, setSupplierName] = useState(initialProduct.supplierName || '');
    const [suppliersList, setSuppliersList] = useState(initialProduct.supplierName ? [initialProduct.supplierName] : []);
    const [imagePreview, setImagePreview] = useState(initialProduct.image || null);
    const [bannerStatus, setBannerStatus] = useState(null); // 'saved' | 'removed'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionType, setActionType] = useState(null); // 'saving' | 'removing'
    const [errorMsg, setErrorMsg] = useState('');

    const fileInputRef = useRef(null);

    const [categories, setCategories] = useState(['Soft Drinks', 'Beverages', 'Dairy', 'Vegetables', 'Fruits', 'Grocery', 'Bakery', 'Snacks', 'Grains']);
    const [rawCategories, setRawCategories] = useState([]);
    const unitsList = ['1kg', '500g', '250g', 'pack', 'bottle', 'loaf', 'bag', 'liter', 'item'];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/categories`);
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                    setRawCategories(data.categories);
                    setCategories(data.categories.map(c => c.name));
                }
            } catch (err) {
                console.error('Failed to fetch categories in edit page:', err);
            }
        };

        const fetchSuppliers = async () => {
            try {
                const storeEmail = user?.email || '';
                const emailParam = storeEmail ? `?storeEmail=${encodeURIComponent(storeEmail)}&onlyLinked=true` : '?onlyLinked=true';
                const res = await fetch(`${API_BASE_URL}/suppliers${emailParam}`);
                const data = await res.json();
                if (data.success && Array.isArray(data.suppliers)) {
                    const linkedSuppliers = data.suppliers.filter(s => s.isLinkedToCurrentStore !== false);
                    let names = linkedSuppliers.map(s => s.name);
                    if (initialProduct.supplierName && !names.includes(initialProduct.supplierName)) {
                        names = [initialProduct.supplierName, ...names];
                    }
                    if (names.length > 0) {
                        setSuppliersList(names);
                        if (!supplierName || !names.includes(supplierName)) {
                            setSupplierName(names[0]);
                        }
                    } else {
                        setSuppliersList(initialProduct.supplierName ? [initialProduct.supplierName] : []);
                        if (initialProduct.supplierName) setSupplierName(initialProduct.supplierName);
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch suppliers in edit page:', err);
            }
        };

        fetchCategories();
        fetchSuppliers();
    }, []);

    // Convert picked image file to Base64 data URL
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result); // Base64 data URL
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionType('saving');

        const updatedPayload = {
            name,
            brand: brand.trim(),
            category,
            price: Number(price) || 0,
            unit: unit || '1kg',
            stock: Number(stock) || 0,
            minStock: Number(minStock) || 10,
            supplierName: supplierName || (suppliersList.length > 0 ? suppliersList[0] : 'Central Food City'),
            storeName,
            image: imagePreview || ''
        };

        try {
            const productIdToUpdate = initialProduct._id || initialProduct.id;
            const res = await fetch(`${API_BASE_URL}/products/${productIdToUpdate}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                clearProductListCache();
                setBannerStatus('saved');
                setTimeout(() => {
                    if (onNavigate) onNavigate('product_list');
                }, 1000);
                return;
            }
            throw new Error(data.message || 'Failed to update product in MongoDB Atlas');
        } catch (err) {
            console.error('Backend API update error:', err.message);
            setErrorMsg(err.message || 'Failed to update product');
        } finally {
            setIsSubmitting(false);
            setActionType(null);
        }
    };

    const handleRemove = async () => {
        setIsSubmitting(true);
        setActionType('removing');
        try {
            const productIdToDelete = initialProduct._id || initialProduct.id;
            const res = await fetch(`${API_BASE_URL}/products/${productIdToDelete}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                clearProductListCache();
                setBannerStatus('removed');
                setTimeout(() => {
                    if (onNavigate) onNavigate('product_list');
                }, 1000);
                return;
            }
            throw new Error(data.message || 'Failed to delete product from MongoDB Atlas');
        } catch (err) {
            console.error('Backend API delete error:', err.message);
            setErrorMsg(err.message || 'Failed to delete product');
        } finally {
            setIsSubmitting(false);
            setActionType(null);
        }
    };

    return (
        <div className="edit-product-container">
            {/* Header Title Row */}
            <div className="edit-product-title-row">
                <h1 className="edit-product-page-title">Edit product</h1>
                <button
                    className="edit-product-back-btn"
                    onClick={() => onNavigate && onNavigate('product_list')}
                    aria-label="Back to products"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {bannerStatus === 'saved' && (
                <div className="edit-product-banner success">
                    <Check size={18} /> Changes saved to Database for {storeName}! Redirecting...
                </div>
            )}

            {bannerStatus === 'removed' && (
                <div className="edit-product-banner danger">
                    <Trash2 size={18} /> Product removed from Database. Redirecting...
                </div>
            )}

            {/* Form Fields Stack */}
            <form onSubmit={handleSave} className="edit-product-form">
                {/* Store Name Auto-filled */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Store name</label>
                    <div className="store-name-display-box">
                        <Store size={18} color="#27672D" />
                        <span className="store-name-text">{storeName}</span>
                        <span className="store-auto-badge">Auto</span>
                    </div>
                </div>

                {/* Product name */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Product name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="edit-product-input"
                        required
                    />
                </div>

                {/* Custom Category Selector with Circular Image Badges */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Category</label>
                    <div style={{ position: 'relative' }}>
                        <div
                            onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                            className="edit-product-select"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                padding: '10px 14px',
                                backgroundColor: '#FFFFFF'
                            }}
                        >
                            {(() => {
                                const selectedCatObj = rawCategories.find(c => c.name === category);
                                const catImg = selectedCatObj?.image;
                                const catEmoji = selectedCatObj?.fallbackEmoji || '📦';
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: '#F1F5F9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justify: 'center',
                                            overflow: 'hidden',
                                            border: '1px solid #CBD5E1',
                                            flexShrink: 0
                                        }}>
                                            {catImg ? (
                                                <img
                                                    src={catImg}
                                                    alt={category}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <span style={{ fontSize: '13px', display: catImg ? 'none' : 'flex' }}>
                                                {catEmoji}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '14px' }}>{category || 'Select Category'}</span>
                                    </div>
                                );
                            })()}
                            <ChevronDown size={18} color="#64748B" style={{ transform: isCatDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </div>

                        {isCatDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                                zIndex: 50,
                                maxHeight: '220px',
                                overflowY: 'auto',
                                padding: '6px'
                            }}>
                                {(rawCategories.length > 0 ? rawCategories : categories.map(n => ({ name: n }))).map(c => {
                                    const isSel = c.name === category;
                                    return (
                                        <div
                                            key={c._id || c.name}
                                            onClick={() => {
                                                setCategory(c.name);
                                                setIsCatDropdownOpen(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                backgroundColor: isSel ? '#F0FDF4' : 'transparent',
                                                color: isSel ? '#166534' : '#334155',
                                                fontWeight: isSel ? '700' : '500',
                                                fontSize: '13.5px',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                        >
                                            <div style={{
                                                width: '26px',
                                                height: '26px',
                                                borderRadius: '50%',
                                                backgroundColor: '#F1F5F9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justify: 'center',
                                                overflow: 'hidden',
                                                border: '1px solid #CBD5E1',
                                                flexShrink: 0
                                            }}>
                                                {c.image ? (
                                                    <img
                                                        src={c.image}
                                                        alt={c.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <span style={{ fontSize: '13px', display: c.image ? 'none' : 'flex' }}>
                                                    {c.fallbackEmoji || '📦'}
                                                </span>
                                            </div>
                                            <span style={{ flex: 1 }}>{c.name}</span>
                                            {isSel && <Check size={16} color="#166534" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Brand (Optional) */}
                <div className="edit-product-field-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label className="edit-product-label" style={{ margin: 0 }}>Brand</label>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Optional</span>
                    </div>
                    <input
                        type="text"
                        placeholder="e.g. Highland, Anchor, Keells, Munchee"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="edit-product-input"
                    />
                </div>

                {/* Enhanced Image Field with Thumbnail Box */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Image</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        className="edit-product-image-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="edit-product-thumb-container">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Product Thumbnail"
                                    className="edit-product-preview-img"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <UploadCloud size={20} color="#64748B" />
                            )}
                        </div>
                        <div className="edit-product-image-meta">
                            <span className="edit-product-image-title">
                                {imagePreview ? 'Change Image' : 'Upload Image'}
                            </span>
                            <span className="edit-product-image-subtitle">
                                {imagePreview ? 'Click to replace product image' : 'Select JPEG, PNG, or WebP'}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Price */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Price (Rs.)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="edit-product-input"
                        required
                    />
                </div>

                {/* Unit */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Product Unit</label>
                    <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="edit-product-select"
                    >
                        {unitsList.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>

                {/* Stock quantity */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Stock quantity</label>
                    <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="edit-product-input"
                    />
                </div>

                {/* Low-stock threshold */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Low-stock threshold</label>
                    <input
                        type="number"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                        className="edit-product-input"
                    />
                </div>

                {/* Preferred Supplier Selection */}
                <div className="edit-product-field-group">
                    <label className="edit-product-label">Preferred Supplier</label>
                    <select
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="edit-product-select"
                    >
                        {suppliersList.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons Stack with Rotating Loader Animations */}
                <div className="edit-product-actions">
                    <button type="submit" className="edit-product-save-btn" disabled={isSubmitting}>
                        {isSubmitting && actionType === 'saving' ? (
                            <>
                                <Loader2 size={18} className="spinner-icon" />
                                <span>Saving changes...</span>
                            </>
                        ) : (
                            'Save changes'
                        )}
                    </button>

                    <button
                        type="button"
                        className="edit-product-remove-btn"
                        onClick={handleRemove}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && actionType === 'removing' ? (
                            <>
                                <Loader2 size={18} className="spinner-icon" />
                                <span>Removing...</span>
                            </>
                        ) : (
                            'Remove product'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
