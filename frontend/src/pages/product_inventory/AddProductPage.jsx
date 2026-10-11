import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Image as ImageIcon, Check, Store, Loader2, UploadCloud, Plus, X, Trash2, Edit, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearProductListCache } from './ProductListPage';
import './AddProductPage.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';

const defaultRawCategories = [
    { name: 'Dairy', fallbackEmoji: '🥛', image: '/dairy_icon.png' },
    { name: 'Beverages', fallbackEmoji: '🥤', image: '' },
    { name: 'Grocery', fallbackEmoji: '🛒', image: '' },
    { name: 'Bakery', fallbackEmoji: '🍞', image: '/bakery_icon.png' },
    { name: 'Vegetables', fallbackEmoji: '🥕', image: '/veg_icon.png' },
    { name: 'Fruits', fallbackEmoji: '🍎', image: '/fruit_icon.png' },
    { name: 'Snacks', fallbackEmoji: '🍿', image: '' },
    { name: 'Grains', fallbackEmoji: '🌾', image: '' }
];

let globalRawCategoriesCache = defaultRawCategories;
let globalCategoriesListCache = defaultRawCategories.map(c => c.name);
let globalSuppliersListCache = [];

export default function AddProductPage({ onNavigate }) {
    const { user } = useAuth();

    // Auto-detect store name from logged in user or default to Lanka Mart
    const storeName = user?.shopName || user?.name || 'Lanka Mart';

    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [categoriesList, setCategoriesList] = useState(globalCategoriesListCache);
    const [rawCategories, setRawCategories] = useState(globalRawCategoriesCache);
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('1kg');
    const [stock, setStock] = useState('0');
    const [minStock, setMinStock] = useState('10');
    const [supplierName, setSupplierName] = useState(globalSuppliersListCache[0] || '');
    const [suppliersList, setSuppliersList] = useState(globalSuppliersListCache);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Typeahead States
    const [supplierCatalogCache, setSupplierCatalogCache] = useState([]);
    const [existingProducts, setExistingProducts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef(null);
    // Modal state for adding/editing a Category
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('📦');
    const [newCatImage, setNewCatImage] = useState(null);
    const [editingCat, setEditingCat] = useState(null);
    const [isAddingCat, setIsAddingCat] = useState(false);

    const fileInputRef = useRef(null);
    const catFileInputRef = useRef(null);

    const unitsList = ['1kg', '500g', '250g', 'pack', 'bottle', 'loaf', 'bag', 'liter', 'item'];

    // Fetch suppliers & categories dynamically from backend (MongoDB Atlas)
    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/categories`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
                globalRawCategoriesCache = data.categories;
                globalCategoriesListCache = data.categories.map(c => c.name);
                setRawCategories(data.categories);
                setCategoriesList(globalCategoriesListCache);
            }
        } catch (err) {
            console.error('Failed to fetch categories from MongoDB:', err);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const storeEmail = user?.email || '';
            const emailParam = storeEmail ? `?storeEmail=${encodeURIComponent(storeEmail)}&onlyLinked=true` : '?onlyLinked=true';
            const res = await fetch(`${API_BASE_URL}/suppliers${emailParam}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.suppliers)) {
                // Filter only suppliers linked to the current store owner
                const linkedSuppliers = data.suppliers.filter(s => s.isLinkedToCurrentStore !== false);
                if (linkedSuppliers.length > 0) {
                    const names = linkedSuppliers.map(s => s.name);
                    globalSuppliersListCache = names;
                    setSuppliersList(names);
                    setSupplierName(prev => (prev && names.includes(prev) ? prev : names[0]));
                } else {
                    globalSuppliersListCache = [];
                    setSuppliersList([]);
                    setSupplierName('');
                }
            }
        } catch (err) {
            console.warn('Failed to fetch suppliers for AddProductPage:', err);
        }
    };

    useEffect(() => {
        // Instant pre-fill from global suppliers cache if available
        if (globalSuppliersListCache.length > 0) {
            setSuppliersList(globalSuppliersListCache);
            setSupplierName(prev => (prev && globalSuppliersListCache.includes(prev) ? prev : globalSuppliersListCache[0]));
        }
        fetchCategories();
        fetchSuppliers();
    }, [user?.email]);

    useEffect(() => {
        if (user?.email) {
            // Fetch shop's existing products to check if already added
            fetch(`${API_BASE_URL}/products?storeEmail=${encodeURIComponent(user.email)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.products)) {
                        setExistingProducts(data.products);
                    }
                })
                .catch(err => console.warn('Failed to fetch existing products:', err));
        }
    }, [user?.email]);

    // Fetch Supplier Catalog for Typeahead
    useEffect(() => {
        if (supplierName) {
            fetch(`http://localhost:5000/api/supplier-replenishment/catalog?supplierName=${encodeURIComponent(supplierName)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.products)) {
                        setSupplierCatalogCache(data.products);
                    }
                })
                .catch(err => console.warn('Failed to fetch supplier catalog for auto-suggest:', err));
        } else {
            setSupplierCatalogCache([]);
        }
    }, [supplierName]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Delete category from backend
    const handleDeleteCategory = async (catIdOrName, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!catIdOrName) return;

        try {
            // Optimistic update to immediately hide from UI
            setRawCategories(prev => prev.filter(c => c._id !== catIdOrName && c.name !== catIdOrName));
            setCategoriesList(prev => prev.filter(n => n !== catIdOrName));

            const res = await fetch(`${API_BASE_URL}/categories/${encodeURIComponent(catIdOrName)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                await fetchCategories();
            } else {
                console.error('Failed to delete category:', data.message);
                await fetchCategories();
            }
        } catch (err) {
            console.error('Failed to delete category:', err);
            await fetchCategories();
        }
    };

    // Compress high-res smartphone images to lightweight 600px JPEGs (~25KB) for ultra-fast saving & loading
    const compressImage = (file, maxWidth = 600, quality = 0.75) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = () => resolve(event.target.result);
            };
            reader.onerror = () => resolve(null);
        });
    };

    // Convert & compress picked product image file
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file, 600, 0.75);
            if (compressed) {
                setImagePreview(compressed);
            }
        }
    };

    // Convert picked category image file to Base64 data URL
    const handleCatImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file, 400, 0.75);
            if (compressed) {
                setNewCatImage(compressed);
            }
        }
    };

    const handleStartEditCategory = (c) => {
        setEditingCat({
            id: c._id || c.name,
            originalName: c.name
        });
        setNewCatName(c.name);
        setNewCatEmoji(c.fallbackEmoji || '📦');
        setNewCatImage(c.image || null);
    };

    const handleCancelEditCategory = () => {
        setEditingCat(null);
        setNewCatName('');
        setNewCatEmoji('📦');
        setNewCatImage(null);
    };

    // Submit new or edited category to backend
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        setIsAddingCat(true);
        try {
            if (editingCat) {
                const targetId = encodeURIComponent(editingCat.id);
                const res = await fetch(`${API_BASE_URL}/categories/${targetId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCatName.trim(),
                        fallbackEmoji: newCatEmoji,
                        image: newCatImage || ''
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    await fetchCategories();
                    if (category === editingCat.originalName) {
                        setCategory(newCatName.trim());
                    }
                    handleCancelEditCategory();
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCatName.trim(),
                        fallbackEmoji: newCatEmoji,
                        image: newCatImage || ''
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    await fetchCategories();
                    setCategory(newCatName.trim());
                    setShowAddCatModal(false);
                    setNewCatName('');
                    setNewCatEmoji('📦');
                    setNewCatImage(null);
                }
            }
        } catch (err) {
            console.error('Failed to save category:', err);
        } finally {
            setIsAddingCat(false);
        }
    };

    const getFallbackEmoji = (catName) => {
        switch (catName) {
            case 'Dairy': return '🥛';
            case 'Beverages': return '🥤';
            case 'Vegetables': return '🥕';
            case 'Fruits': return '🥑';
            case 'Grains': return '🌾';
            case 'Bakery': return '🍞';
            case 'Snacks': return '🍿';
            default: return newCatEmoji || '📦';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        // Form Validations
        if (!name || name.trim().length < 2) {
            setErrorMsg('Product name must be at least 2 characters.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!category) {
            setErrorMsg('Please select a category for this product.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const numericPrice = Number(price);
        if (!price || isNaN(numericPrice) || numericPrice <= 0) {
            setErrorMsg('Please enter a valid price greater than Rs. 0.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const numericStock = Number(stock);
        if (stock === '' || isNaN(numericStock) || numericStock < 0) {
            setErrorMsg('Stock quantity must be 0 or greater.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const numericMinStock = Number(minStock);
        if (minStock === '' || isNaN(numericMinStock) || numericMinStock < 0) {
            setErrorMsg('Low-stock threshold must be 0 or greater.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);

        const newProductPayload = {
            name,
            brand: brand.trim(),
            category,
            price: Number(price) || 0,
            unit,
            stock: Number(stock) || 0,
            minStock: Number(minStock) || 10,
            supplierName: supplierName || (suppliersList.length > 0 ? suppliersList[0] : 'Central Food City'),
            storeName,
            storeEmail: user?.email || '',
            storeIcon: user?.picture || '',
            image: imagePreview || '', // Base64 or URL saved into DB
            fallbackEmoji: getFallbackEmoji(category),
            bgColor: '#EFF6FF'
        };

        try {
            const res = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProductPayload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                clearProductListCache();
                setIsSaved(true);
                setTimeout(() => {
                    if (onNavigate) onNavigate('product_list');
                }, 200);
            } else {
                setErrorMsg(data.message || 'Failed to save product');
            }
        } catch (err) {
            setErrorMsg('Server connection failed. Ensure backend is running.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="add-product-container" style={{ position: 'relative' }}>
            {/* Success Toast */}
            {isSaved && (
                <div className="add-product-success-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} />
                    <span>Product saved successfully! Redirecting...</span>
                </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px' }}>
                    {errorMsg}
                </div>
            )}

            {/* Top Navigation */}
            <div className="add-product-title-row">
                <h1 className="add-product-page-title">Add product</h1>
                <button
                    className="add-product-back-btn"
                    onClick={() => onNavigate && onNavigate('product_list')}
                    aria-label="Back to products"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="add-product-form">
                {/* Preferred Supplier Selection */}
                <div className="add-product-field-group">
                    <label className="add-product-label">Preferred Supplier</label>
                    {suppliersList.length > 0 ? (
                        <select
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            className="add-product-select"
                        >
                            {suppliersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{
                            border: '1px dashed #CBD5E1',
                            borderRadius: '14px',
                            padding: '12px 16px',
                            backgroundColor: '#F8FAFC',
                            color: '#94A3B8',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>🏪</span>
                            <span>No suppliers linked to your store yet. Add suppliers from the <strong style={{ color: '#27672D' }}>Suppliers</strong> tab first.</span>
                        </div>
                    )}
                </div>
                {/* Product Name with Smart Typeahead Auto-Suggest */}
                <div className="add-product-field-group" style={{ position: 'relative' }} ref={suggestionsRef}>
                    <label className="add-product-label">Product name</label>
                    <input
                        type="text"
                        placeholder="e.g. Fresh Milk 1L"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="add-product-input"
                        required
                    />
                    {/* Auto-suggest Dropdown Container */}
                    {showSuggestions && name.length >= 1 && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto', marginTop: '6px'
                        }}>
                            {(() => {
                                const matched = supplierCatalogCache.filter(c => (c.name || '').toLowerCase().includes((name || '').toLowerCase()));
                                if (matched.length === 0) return <div style={{ padding: '12px', fontSize: '13px', color: '#94A3B8', textAlign: 'center', fontWeight: '500' }}>No matching products from this supplier</div>;
                                return matched.map(p => {
                                    const isAdded = existingProducts.some(ep => (ep.name || '').toLowerCase() === (p.name || '').toLowerCase());
                                    return (
                                        <div key={p._id || p.name}
                                            onClick={() => {
                                                if (isAdded) return;
                                                setName(p.name);
                                                setCategory(p.category);
                                                if (p.price) setPrice(p.price.toString());
                                                if (p.unit) setUnit(p.unit);
                                                if (p.brand) setBrand(p.brand);
                                                setShowSuggestions(false);
                                            }}
                                            style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', cursor: isAdded ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', transition: 'background-color 0.15s', opacity: isAdded ? 0.7 : 1 }}
                                            onMouseOver={e => { if (!isAdded) e.currentTarget.style.backgroundColor = '#F8FAFC' }}
                                            onMouseOut={e => { if (!isAdded) e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '14.5px', fontWeight: '700', color: '#0F172A' }}>{p.name}</span>
                                                    {isAdded && <span style={{ fontSize: '10px', fontWeight: '800', color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Added</span>}
                                                </div>
                                                {p.brand && !isAdded && <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>{p.brand}</span>}
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', fontWeight: '500' }}>
                                                {p.category} &nbsp;•&nbsp; Rs. {p.price} &nbsp;•&nbsp; {p.unit}
                                            </span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>

                {/* Category with Inline Add Option */}
                <div className="add-product-field-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label className="add-product-label" style={{ margin: 0 }}>Category</label>
                        <button
                            type="button"
                            onClick={() => {
                                handleCancelEditCategory();
                                setShowAddCatModal(true);
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#166534',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}
                        >
                            <Plus size={14} /> Add new category
                        </button>
                    </div>
                    {/* Custom Category Selector with Circular Image Badges */}
                    <div style={{ position: 'relative' }}>
                        <div
                            onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                            className="add-product-select"
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
                                        {category ? (
                                            <>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#F1F5F9',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
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
                                                <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '14px' }}>{category}</span>
                                            </>
                                        ) : (
                                            <span style={{ fontWeight: '500', color: '#94A3B8', fontSize: '14px' }}>Select Category</span>
                                        )}
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
                                {(rawCategories.length > 0 ? rawCategories : categoriesList.map(n => ({ name: n }))).map(c => {
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
                <div className="add-product-field-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label className="add-product-label" style={{ margin: 0 }}>Brand</label>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Optional</span>
                    </div>
                    <input
                        type="text"
                        placeholder="e.g. Highland, Anchor, Keells, Munchee"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="add-product-input"
                    />
                </div>

                {/* Price */}
                <div className="add-product-field-group">
                    <label className="add-product-label">Price (Rs.)</label>
                    <input
                        type="number"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="add-product-input"
                        required
                        min="1"
                        step="0.01"
                    />
                </div>

                {/* Unit */}
                <div className="add-product-field-group">
                    <label className="add-product-label">Product Unit</label>
                    <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="add-product-select"
                    >
                        {unitsList.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>

                {/* Enhanced Image Upload with Small Thumbnail Preview */}
                <div className="add-product-field-group">
                    <label className="add-product-label">Product Image</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        className="add-product-image-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="add-product-thumb-container">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="add-product-preview-thumb" />
                            ) : (
                                <UploadCloud size={20} color="#64748B" />
                            )}
                        </div>
                        <div className="add-product-image-meta">
                            <span className="add-product-image-title">
                                {imagePreview ? 'Image Selected' : 'Choose Product Image'}
                            </span>
                            <span className="add-product-image-subtitle">
                                {imagePreview ? 'Click to change image file' : 'PNG, JPG, WebP up to 5MB'}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Stock quantity */}
                <div className="add-product-field-group">
                    <label className="add-product-label">Stock quantity</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="add-product-input"
                        min="0"
                        required
                    />
                </div>

                {/* Low-stock threshold */}
                <div className="add-product-field-group">
                    <label className="add-product-label">Low-stock threshold</label>
                    <input
                        type="number"
                        placeholder="10"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                        className="add-product-input"
                        min="0"
                        required
                    />
                </div>


                {/* Submit Action Button with Smooth Rotating Spinner */}
                <button type="submit" className="add-product-create-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="spinner-icon" />
                            <span>Saving product...</span>
                        </>
                    ) : (
                        'Create product'
                    )}
                </button>
            </form>

            {/* Modal Popup: Create & Manage Categories */}
            {showAddCatModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.70)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '24px',
                        padding: '20px',
                        width: '100%',
                        maxWidth: '320px',
                        maxHeight: '90%',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                        border: '1px solid #E2E8F0',
                        zIndex: 100000
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>Category Manager</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handleCancelEditCategory}
                                    style={{
                                        border: 'none',
                                        backgroundColor: editingCat ? '#DCFCE7' : '#F1F5F9',
                                        color: editingCat ? '#166534' : '#475569',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                    title="Click to add a new category"
                                >
                                    <Plus size={12} /> Add New
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddCatModal(false)}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Existing Categories List with Edit and Delete Buttons */}
                        <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Existing Categories ({categoriesList.length}) - Click to edit
                            </span>
                            <div style={{
                                marginTop: '8px',
                                maxHeight: '130px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                padding: '8px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0'
                            }}>
                                {rawCategories.map((c) => {
                                    const isBeingEdited = editingCat && (editingCat.id === (c._id || c.name));
                                    return (
                                        <div
                                            key={c._id || c.name}
                                            onClick={() => handleStartEditCategory(c)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                backgroundColor: isBeingEdited ? '#F0FDF4' : '#FFFFFF',
                                                border: isBeingEdited ? '2px solid #166534' : '1px solid #CBD5E1',
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: isBeingEdited ? '#166534' : '#334155',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Click to edit category"
                                        >
                                            <div style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                backgroundColor: '#F1F5F9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                border: '1px solid #E2E8F0'
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
                                                <span style={{ fontSize: '12px', display: c.image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {c.fallbackEmoji || '📦'}
                                                </span>
                                            </div>
                                            <span>{c.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartEditCategory(c);
                                                }}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: '#2563EB',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginLeft: '2px'
                                                }}
                                                title="Edit category"
                                            >
                                                <Edit size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteCategory(c._id || c.name, e)}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: '#EF4444',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                title="Delete category"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Add / Edit Category Form */}
                        <form onSubmit={handleCreateCategory} style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: editingCat ? '#166534' : '#1E293B' }}>
                                    {editingCat ? '✏️ Edit Category' : '+ Add New Category'}
                                </span>
                                {editingCat && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEditCategory}
                                        style={{ border: 'none', background: 'transparent', color: '#64748B', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>

                            <div className="add-product-field-group" style={{ marginBottom: '10px' }}>
                                <label className="add-product-label" style={{ fontSize: '12px' }}>Category Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Organic Juices"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    className="add-product-input"
                                    style={{ padding: '8px 12px', fontSize: '13px' }}
                                    required
                                />
                            </div>

                            <div className="add-product-field-group" style={{ marginBottom: '10px' }}>
                                <label className="add-product-label" style={{ fontSize: '12px' }}>Fallback Emoji (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 🧃"
                                    value={newCatEmoji}
                                    onChange={(e) => setNewCatEmoji(e.target.value)}
                                    className="add-product-input"
                                    style={{ padding: '8px 12px', fontSize: '13px' }}
                                />
                            </div>

                            <div className="add-product-field-group" style={{ marginBottom: '16px' }}>
                                <label className="add-product-label" style={{ fontSize: '12px' }}>Category Image / Icon</label>
                                <input
                                    type="file"
                                    ref={catFileInputRef}
                                    onChange={handleCatImageChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="add-product-image-btn"
                                    onClick={() => catFileInputRef.current?.click()}
                                    style={{ padding: '8px 12px' }}
                                >
                                    <div className="add-product-thumb-container" style={{ width: '32px', height: '32px' }}>
                                        {newCatImage ? (
                                            <img src={newCatImage} alt="Preview" className="add-product-preview-thumb" />
                                        ) : (
                                            <UploadCloud size={16} color="#64748B" />
                                        )}
                                    </div>
                                    <div className="add-product-image-meta">
                                        <span className="add-product-image-title" style={{ fontSize: '12px' }}>
                                            {newCatImage ? 'Image Selected' : 'Upload Category Image'}
                                        </span>
                                    </div>
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleCancelEditCategory();
                                        setShowAddCatModal(false);
                                    }}
                                    className="merchant-action-btn outline-green"
                                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="merchant-action-btn solid-green"
                                    disabled={isAddingCat}
                                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    {isAddingCat ? <Loader2 size={14} className="spinner-icon" /> : (editingCat ? 'Update Category' : 'Save Category')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
