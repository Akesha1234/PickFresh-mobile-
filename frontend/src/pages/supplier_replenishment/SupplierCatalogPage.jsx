import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Edit2, Trash2, X, Check, AlertCircle, RefreshCw, Tag, DollarSign, Image as ImageIcon, Upload, Filter, Search, ChevronLeft, ChevronRight, ArrowLeft, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './SupplierCatalogPage.css';

// Helper to auto-extract brand from product name if brand is blank
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

export default function SupplierCatalogPage({ onNavigate }) {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState(['All']);
    const [categoryObjects, setCategoryObjects] = useState([]);
    const catBarRef = useRef(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Category Manager Modal State
    const [showCatManager, setShowCatManager] = useState(false);
    const [editingCatId, setEditingCatId] = useState(null);
    const [editingCatName, setEditingCatName] = useState('');

    // Custom Category Inline State
    const [isAddingNewCat, setIsAddingNewCat] = useState(false);
    const [newCatInput, setNewCatInput] = useState('');

    // Delete Confirmation Modal State
    const [deletingId, setDeletingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: 'Dairy',
        price: '',
        minOrderQty: '10',
        unit: '1kg pack',
        image: '',
        status: 'Available'
    });

    const [mySupplyCategories, setMySupplyCategories] = useState([]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/product-inventory/categories`);
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                setCategoryObjects(data.categories);
                const masterCatNames = data.categories.map(c => c.name).filter(Boolean);
                const merged = ['All', ...new Set(masterCatNames)];
                setCategories(merged);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchSupplierProfile = async () => {
        if (!user?.email) return;
        try {
            const res = await fetch(`http://localhost:5000/api/auth/user-details?email=${encodeURIComponent(user.email)}`);
            const data = await res.json();
            if (data.success && data.user) {
                if (Array.isArray(data.user.supplyCategories) && data.user.supplyCategories.length > 0) {
                    setMySupplyCategories(data.user.supplyCategories);
                }
            }
        } catch (err) {
            console.warn('Failed to load supplier profile categories:', err);
        }
    };

    const fetchCatalog = async () => {
        setLoading(true);
        setError(null);
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `http://localhost:5000/api/supplier-replenishment/catalog?supplierEmail=${encodeURIComponent(supplierEmail)}&supplierName=${encodeURIComponent(supplierName)}`;

            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                setProducts(data.products);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('Fetch catalog error:', err);
            setError('Failed to load catalog products. Please check server connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchSupplierProfile();
        fetchCatalog();
    }, [user?.email]);

    const scrollCatBar = (direction) => {
        if (catBarRef.current) {
            const scrollAmount = direction === 'left' ? -150 : 150;
            catBarRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const handleToggleSupplierCategory = async (catName) => {
        const isIncluded = mySupplyCategories.includes(catName);
        const updated = isIncluded
            ? mySupplyCategories.filter(c => c !== catName)
            : [...mySupplyCategories, catName];

        setMySupplyCategories(updated);

        try {
            await fetch('http://localhost:5000/api/auth/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    supplyCategories: updated
                })
            });
        } catch (err) {
            console.error('Failed to save updated supply categories:', err);
        }
    };

    const handleAddNewCategory = async (e) => {
        if (e) e.preventDefault();
        const trimmed = newCatInput.trim();
        if (!trimmed) {
            alert('Please enter a category name');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/product-inventory/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed })
            });
            const data = await res.json();
            if (data.success) {
                await fetchCategories();
                await handleToggleSupplierCategory(trimmed);
                setFormData(prev => ({ ...prev, category: trimmed }));
                setNewCatInput('');
                setIsAddingNewCat(false);
            } else {
                alert(data.message || 'Failed to add category');
            }
        } catch (err) {
            console.error('Error adding category:', err);
            alert('Network error while saving category to backend');
        }
    };

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        const defaultCat = categories.find(c => c !== 'All') || 'Dairy & Eggs';
        setFormData({
            name: '',
            brand: '',
            category: defaultCat,
            price: '',
            minOrderQty: '10',
            unit: '1kg pack',
            image: '',
            status: 'Available'
        });
        setIsAddingNewCat(false);
        setNewCatInput('');
        setShowModal(true);
    };

    const handleOpenEditModal = (prod) => {
        setEditingProduct(prod);
        const resolvedBrand = (prod.brand || '').trim() || autoExtractBrand(prod.name || '');
        setFormData({
            name: prod.name || '',
            brand: resolvedBrand,
            category: prod.category || 'Dairy & Eggs',
            price: prod.price !== undefined ? String(prod.price) : '',
            minOrderQty: prod.minOrderQty !== undefined ? String(prod.minOrderQty) : '1',
            unit: prod.unit || '1kg',
            image: prod.image || '',
            status: prod.status || 'Available'
        });
        setIsAddingNewCat(false);
        setNewCatInput('');
        setShowModal(true);
    };

    const handleImageFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Please upload an image smaller than 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Please enter a product name');
            return;
        }

        setSubmitting(true);
        try {
            const supplierEmail = user?.email || '';
            const supplierName = user?.supplierName || user?.name || 'Supplier';

            let finalBrand = formData.brand.trim();
            if (!finalBrand) {
                finalBrand = autoExtractBrand(formData.name);
            }

            const payload = {
                supplierEmail,
                supplierName,
                name: formData.name.trim(),
                brand: finalBrand,
                category: formData.category,
                price: Number(formData.price) || 0,
                minOrderQty: Number(formData.minOrderQty) || 1,
                unit: formData.unit || 'unit',
                image: formData.image || '',
                status: formData.status
            };

            let endpoint = 'http://localhost:5000/api/supplier-replenishment/catalog';
            let method = 'POST';

            if (editingProduct) {
                endpoint = `http://localhost:5000/api/supplier-replenishment/catalog/${editingProduct._id}`;
                method = 'PUT';
            }

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                fetchCatalog();
            } else {
                alert(data.message || 'Operation failed');
            }
        } catch (err) {
            console.error('Submit catalog error:', err);
            alert('Network error while saving product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/supplier-replenishment/catalog/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setDeletingId(null);
                fetchCatalog();
            } else {
                alert(data.message || 'Failed to delete product');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Network error while deleting product');
        }
    };

    // Filter products by selected category and search term
    const filteredProducts = products.filter(p => {
        const matchesCat = selectedCategory === 'All' ? true : (p.category === selectedCategory);
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <div className="supplier-catalog-container">
            {/* Header Section */}
            <div className="supplier-catalog-header">
                <h2 className="supplier-catalog-title">
                    My Products Catalog
                </h2>
                <button
                    className="supplier-back-btn-right"
                    onClick={() => onNavigate && onNavigate('home')}
                    aria-label="Back to dashboard"
                    title="Back to Dashboard"
                >
                    <ArrowLeft size={18} color="#1E293B" />
                </button>
            </div>

            {/* Search Input Box */}
            <div className="supplier-catalog-search-wrapper">
                <Search size={18} color="#94A3B8" className="supplier-search-icon" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="supplier-search-input"
                />
            </div>

            {/* Add Product & Manage Categories Actions Row */}
            <div className="supplier-catalog-actions-row">
                <button
                    type="button"
                    className="supplier-catalog-manage-cats-btn"
                    onClick={() => setShowCatManager(true)}
                    title="Manage Supply Categories (Add, Edit, Delete)"
                >
                    <Settings size={15} />
                    <span>Manage</span>
                </button>
                <button
                    className="supplier-add-product-btn"
                    onClick={handleOpenAddModal}
                >
                    <Plus size={16} />
                    <span>Add Product</span>
                </button>
            </div>

            {/* Category Filter Horizontal Scrollbar Chips with arrows */}
            <div className="supplier-catalog-cat-wrapper">
                <button
                    type="button"
                    className="supplier-catalog-scroll-arrow"
                    onClick={() => scrollCatBar('left')}
                    aria-label="Scroll categories left"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="supplier-catalog-categories-bar" ref={catBarRef}>
                    {categories.map(cat => {
                        const count = cat === 'All'
                            ? products.length
                            : products.filter(p => p.category === cat).length;

                        return (
                            <button
                                key={cat}
                                className={`supplier-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                <span>{cat}</span>
                                <span className="chip-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    className="supplier-catalog-scroll-arrow"
                    onClick={() => scrollCatBar('right')}
                    aria-label="Scroll categories right"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className="supplier-catalog-loading">
                    <RefreshCw className="spin-icon" size={24} color="#27672D" />
                    <span>Loading catalog items...</span>
                </div>
            ) : error ? (
                <div className="supplier-catalog-error">
                    <AlertCircle size={20} color="#DC2626" />
                    <span>{error}</span>
                    <button onClick={fetchCatalog}>Retry</button>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="supplier-catalog-empty">
                    <Package size={48} color="#94A3B8" />
                    <h3>No Products in this Category</h3>
                    <p>There are no products listed under "{selectedCategory}". Add a new product or select another category.</p>
                    <button className="supplier-add-product-btn" onClick={handleOpenAddModal}>
                        <Plus size={18} /> Add New Product
                    </button>
                </div>
            ) : (
                <div className="supplier-catalog-grid">
                    {filteredProducts.map(item => (
                        <div key={item._id} className="supplier-product-card">
                            <div className="supplier-product-card-top">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span className="supplier-product-cat-pill">
                                        <Tag size={12} />
                                        {item.category}
                                    </span>
                                    {(item.brand || autoExtractBrand(item.name)) && (
                                        <span className="supplier-product-brand-pill">
                                            {item.brand || autoExtractBrand(item.name)}
                                        </span>
                                    )}
                                </div>
                                <span className={`supplier-product-status-pill ${item.status === 'Available' ? 'available' : 'out-of-stock'}`}>
                                    {item.status}
                                </span>
                            </div>

                            <div className="supplier-product-content-row">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="supplier-product-img-thumb" />
                                ) : (
                                    <div className="supplier-product-img-fallback">
                                        <Package size={24} color="#166534" />
                                    </div>
                                )}

                                <div className="supplier-product-title-box">
                                    <h3 className="supplier-product-name">{item.name}</h3>
                                </div>
                            </div>

                            <div className="supplier-product-details-row">
                                <div className="supplier-product-price-tag">
                                    <span className="price-label">Wholesale Price</span>
                                    <span className="price-val">Rs. {Number(item.price || item.wholesalePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="supplier-product-qty-tag">
                                    <span className="qty-label">Min Order Qty</span>
                                    <span className="qty-val">{item.minOrderQty} {item.unit || 'unit'}</span>
                                </div>
                            </div>

                            <div className="supplier-product-actions">
                                <button
                                    className="supplier-catalog-edit-btn"
                                    onClick={() => handleOpenEditModal(item)}
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button
                                    className="supplier-catalog-delete-btn"
                                    onClick={() => setDeletingId(item._id)}
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Bottom spacer for comfortable scrolling above bottom bar */}
            <div style={{ height: '36px', minHeight: '36px', width: '100%', flexShrink: 0 }} />

            {/* Add / Edit Product Modal */}
            {showModal && (
                <div className="catalog-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="catalog-modal-header">
                            <h3>{editingProduct ? 'Edit Catalog Product' : 'Add Product to Catalog'}</h3>
                            <button className="catalog-modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="catalog-form">
                            {/* Product Image Section */}
                            <div className="catalog-form-group">
                                <label>Product Image</label>
                                <div className="catalog-image-box">
                                    <div className="catalog-img-preview-col">
                                        {formData.image ? (
                                            <div className="catalog-img-preview-wrap">
                                                <img src={formData.image} alt="Preview" className="catalog-img-preview" />
                                                <button
                                                    type="button"
                                                    className="remove-img-btn"
                                                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                                                    title="Remove image"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="catalog-img-upload-prompt">
                                                <ImageIcon size={24} color="#94A3B8" />
                                                <span>No Image</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="catalog-img-inputs-col">
                                        <input
                                            type="text"
                                            placeholder="Paste image URL here..."
                                            value={formData.image}
                                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                            className="catalog-img-url-input"
                                        />

                                        <label className="catalog-file-upload-lbl">
                                            <Upload size={14} />
                                            <span>Upload Image File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageFileUpload}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="catalog-form-group">
                                <label>Product Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Nuwara Eliya Carrots 1kg"
                                    value={formData.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            name: val,
                                            brand: prev.brand ? prev.brand : autoExtractBrand(val)
                                        }));
                                    }}
                                    required
                                />
                            </div>

                            <div className="catalog-form-group">
                                <label>Brand <span style={{ fontWeight: '500', color: '#94A3B8', fontSize: '12px' }}>(Optional)</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Highland, Anchor, Maliban"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>

                            {/* Supply Category Section with Add Custom Option */}
                            <div className="catalog-form-group">
                                <div className="catalog-cat-header-row">
                                    <label>Supply Category *</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {!isAddingNewCat ? (
                                            <button
                                                type="button"
                                                className="catalog-add-cat-btn"
                                                onClick={() => setIsAddingNewCat(true)}
                                            >
                                                + Add New
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="catalog-add-cat-btn cancel"
                                                onClick={() => { setIsAddingNewCat(false); setNewCatInput(''); }}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="catalog-add-cat-btn manage"
                                            onClick={() => setShowCatManager(true)}
                                        >
                                            ⚙️ Manage
                                        </button>
                                    </div>
                                </div>

                                {!isAddingNewCat ? (
                                    <select
                                        value={formData.category}
                                        onChange={(e) => {
                                            if (e.target.value === '__ADD_NEW__') {
                                                setIsAddingNewCat(true);
                                            } else {
                                                setFormData({ ...formData, category: e.target.value });
                                            }
                                        }}
                                    >
                                        {categories.filter(c => c !== 'All').map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__ADD_NEW__">+ Add Custom Category...</option>
                                    </select>
                                ) : (
                                    <div className="catalog-new-cat-inline-row">
                                        <input
                                            type="text"
                                            placeholder="Enter new category name..."
                                            value={newCatInput}
                                            onChange={(e) => setNewCatInput(e.target.value)}
                                            autoFocus
                                            className="catalog-new-cat-input"
                                        />
                                        <button
                                            type="button"
                                            className="catalog-save-cat-btn"
                                            onClick={handleAddNewCategory}
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="catalog-form-row">
                                <div className="catalog-form-group">
                                    <label>Wholesale Price (Rs.) *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 350"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>

                                <div className="catalog-form-group">
                                    <label>Min Order Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 10"
                                        value={formData.minOrderQty}
                                        onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="catalog-form-row">
                                <div className="catalog-form-group">
                                    <label>Packaging Unit</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1kg pack, 400g pack, bottle"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    />
                                </div>

                                <div className="catalog-form-group">
                                    <label>Availability Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Out of Stock">Out of Stock</option>
                                    </select>
                                </div>
                            </div>

                            <div className="catalog-modal-footer">
                                <button
                                    type="button"
                                    className="catalog-cancel-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="catalog-save-btn"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add to Catalog'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="catalog-modal-overlay" onClick={() => setDeletingId(null)}>
                    <div className="catalog-modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: 0, color: '#0F172A', fontSize: '18px', fontWeight: '800' }}>Confirm Deletion</h3>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: '8px 0 16px 0' }}>
                            Are you sure you want to remove this product from your catalog? Store owners will no longer see it under your product list.
                        </p>
                        <div className="catalog-modal-footer">
                            <button className="catalog-cancel-btn" onClick={() => setDeletingId(null)}>
                                Cancel
                            </button>
                            <button className="catalog-delete-confirm-btn" onClick={() => handleDeleteProduct(deletingId)}>
                                Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Manager Modal */}
            {showCatManager && (
                <div className="catalog-modal-overlay" onClick={() => setShowCatManager(false)}>
                    <div className="catalog-modal-content cat-manager-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="catalog-modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tag size={18} color="#166534" />
                                Manage Supply Categories
                            </h3>
                            <button className="catalog-modal-close-btn" onClick={() => setShowCatManager(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Add New Category Form inside Manager */}
                        <div className="cat-manager-add-row">
                            <input
                                type="text"
                                placeholder="Add new category name..."
                                value={newCatInput}
                                onChange={(e) => setNewCatInput(e.target.value)}
                                className="cat-manager-input"
                            />
                            <button
                                type="button"
                                className="cat-manager-add-btn"
                                onClick={handleAddNewCategory}
                            >
                                <Plus size={15} /> Add
                            </button>
                        </div>

                        {/* List of Master Categories with Supplier Toggle */}
                        <div className="cat-manager-list">
                            {categories.filter(c => c !== 'All').map(catName => {
                                const isSuppliedByMe = mySupplyCategories.length === 0 || mySupplyCategories.includes(catName);

                                return (
                                    <div key={catName} className="cat-manager-item" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justify: 'space-between',
                                        padding: '10px 14px',
                                        backgroundColor: isSuppliedByMe ? '#F0FDF4' : '#F8FAFC',
                                        border: `1.5px solid ${isSuppliedByMe ? '#86EFAC' : '#E2E8F0'}`,
                                        borderRadius: '14px',
                                        marginBottom: '6px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Tag size={15} color={isSuppliedByMe ? '#166534' : '#94A3B8'} />
                                            <span style={{ fontSize: '13.5px', fontWeight: '700', color: isSuppliedByMe ? '#14532D' : '#475569' }}>
                                                {catName}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleSupplierCategory(catName)}
                                            style={{
                                                backgroundColor: isSuppliedByMe ? '#FEF2F2' : '#DCFCE7',
                                                color: isSuppliedByMe ? '#991B1B' : '#15803D',
                                                border: `1px solid ${isSuppliedByMe ? '#FECACA' : '#86EFAC'}`,
                                                borderRadius: '12px',
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title={isSuppliedByMe ? 'Remove from my supply categories' : 'Add to my supply categories'}
                                        >
                                            {isSuppliedByMe ? (
                                                <>
                                                    <Trash2 size={13} color="#991B1B" /> Remove
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={13} color="#15803D" /> Supply This
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="catalog-modal-footer">
                            <button
                                type="button"
                                className="catalog-cancel-btn"
                                onClick={() => setShowCatManager(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
