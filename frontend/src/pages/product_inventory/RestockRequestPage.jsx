import React, { useState, useEffect, useRef } from 'react';
import { Check, Send, ArrowLeft, AlertTriangle, Package, Calendar, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './RestockRequestPage.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';

export default function RestockRequestPage({ onNavigate, initialData }) {
    const { user } = useAuth();

    // Support either single item (fallback) or array of items
    const items = initialData?.items || (initialData?.item ? [initialData.item] : [
        { id: '1', name: 'Wait...', currentStock: 0, threshold: 0, image: '', unit: 'pack' }
    ]);

    // Initial quantities object: { itemId: quantity }
    const initialQuantities = items.reduce((acc, item) => {
        acc[item.id || item.name] = item.threshold ? item.threshold * 2 : 20;
        return acc;
    }, {});

    const [reorderQuantities, setReorderQuantities] = useState(initialQuantities);

    // Full supplier objects { name, email } for email capture on submit
    const [suppliersFullList, setSuppliersFullList] = useState([]);
    const [suppliersList, setSuppliersList] = useState([]);
    const [supplier, setSupplier] = useState(initialData?.supplierName || initialData?.supplier?.name || '');
    const [supplierEmail, setSupplierEmail] = useState(initialData?.supplier?.email || '');

    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const [deliveryDate, setDeliveryDate] = useState(tomorrowStr);
    const dateInputRef = useRef(null);
    const [isSent, setIsSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [supplierCatalog, setSupplierCatalog] = useState([]);

    // Fetch suppliers from MongoDB Atlas (User role='supplier')
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const storeEmail = user?.email || '';
                const emailParam = storeEmail ? `?storeEmail=${encodeURIComponent(storeEmail)}&onlyLinked=true` : '?onlyLinked=true';
                const res = await fetch(`${API_BASE_URL}/suppliers${emailParam}`);
                const data = await res.json();
                if (data.success && Array.isArray(data.suppliers)) {
                    const linkedSuppliers = data.suppliers.filter(s => s.isLinkedToCurrentStore !== false);
                    if (linkedSuppliers.length > 0) {
                        setSuppliersFullList(linkedSuppliers);
                        const names = linkedSuppliers.map(s => s.name);
                        setSuppliersList(names);

                        if (!initialData?.supplierName && !initialData?.supplier?.name) {
                            // Smart auto-select: match by first product
                            const firstItem = items[0];
                            const matched = linkedSuppliers.find(s =>
                                s.suppliedProducts && s.suppliedProducts.some(p => p.toLowerCase().includes(firstItem.name.toLowerCase()))
                            );
                            const selected = matched || linkedSuppliers[0];
                            setSupplier(selected.name);
                            setSupplierEmail(selected.email || '');
                        } else {
                            // find email for pre-selected supplier
                            const foundSupplierStr = initialData?.supplierName || initialData?.supplier?.name;
                            const matched = linkedSuppliers.find(s => s.name === foundSupplierStr);
                            if (matched) setSupplierEmail(matched.email || '');
                        }
                    }
                }
            } catch (err) {
                console.warn('Using default suppliers list:', err.message);
            }
        };

        if (items.length > 0 && items[0].name !== 'Wait...') {
            fetchSuppliers();
        }
    }, [items, initialData]);

    useEffect(() => {
        if (supplier) {
            fetch(`http://localhost:5000/api/supplier-replenishment/catalog?supplierName=${encodeURIComponent(supplier)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.products)) {
                        setSupplierCatalog(data.products);
                    }
                })
                .catch(err => console.warn('Failed to fetch supplier catalog for restock page:', err));
        }
    }, [supplier]);

    const handleSupplierChange = (selectedName) => {
        setSupplier(selectedName);
        const found = suppliersFullList.find(s => s.name === selectedName);
        setSupplierEmail(found?.email || '');
    };

    const handleQtyChange = (id, delta) => {
        setReorderQuantities(prev => ({
            ...prev,
            [id]: Math.max(1, (prev[id] || 0) + delta)
        }));
    };

    const handleQtyInput = (id, val) => {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
            setReorderQuantities(prev => ({
                ...prev,
                [id]: Math.max(1, num) // Ensure it's at least 1
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const poItems = items.map(item => {
            const catalogMatch = supplierCatalog.find(c => c.name.toLowerCase() === item.name.toLowerCase());
            const itemPrice = Number(catalogMatch?.wholesalePrice || catalogMatch?.price || catalogMatch?.wholesaleRate || item.wholesalePrice || item.price || 0);
            return {
                name: item.name,
                qty: reorderQuantities[item.id || item.name] || 20,
                unit: item.unit || 'pack',
                image: catalogMatch?.image || item.image || item.imageUrl || '',
                price: itemPrice,
                wholesalePrice: itemPrice,
                wholesaleRate: itemPrice
            };
        });

        try {
            await fetch(`${API_BASE_URL}/restock-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierName: supplier,
                    supplierEmail: supplierEmail,
                    storeName: user?.shopName || user?.name || 'Lanka Mart',
                    storeEmail: user?.email || '',
                    deliveryDate: deliveryDate,
                    items: poItems,
                    unitsLeft: items.reduce((acc, it) => acc + (it.currentStock || 0), 0),
                    threshold: items[0]?.threshold || 10,
                    status: 'Pending'
                })
            });
        } catch (err) {
            console.warn('Restock PO save error:', err.message);
        } finally {
            setIsSubmitting(false);
            setIsSent(true);
            if (initialData?.onRequestSent) initialData.onRequestSent();
            setTimeout(() => {
                if (onNavigate) onNavigate('low_stock');
            }, 1200);
        }
    };

    const handleBackToLowStock = () => {
        if (onNavigate) onNavigate('low_stock');
    };

    if (items.length === 1 && items[0].name === 'Wait...') return null; // Avoid render on uninitialized load

    return (
        <div className="restock-req-container">
            {/* Header Title Row with Back Arrow Button */}
            <div className="restock-req-title-row">
                <div>
                    <h1 className="restock-req-page-title">Restock Request</h1>
                    <span className="restock-req-sub-title">Combined Purchase Order</span>
                </div>
                <button
                    className="restock-req-back-arrow-btn"
                    onClick={handleBackToLowStock}
                    aria-label="Back to low stock"
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </button>
            </div>

            {isSent && (
                <div className="restock-req-success-banner">
                    <Check size={18} /> Replenishment request sent to {supplier}! Redirecting...
                </div>
            )}

            <form onSubmit={handleSubmit} className="restock-req-form" style={{ marginTop: '20px' }}>

                {/* Global Info Section: Supplier and Date */}
                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                        {/* Supplier */}
                        <div className="restock-req-field-group" style={{ marginBottom: 0 }}>
                            <label className="restock-req-label">Supplier</label>
                            <div className="select-wrapper">
                                <select
                                    value={supplier}
                                    onChange={(e) => handleSupplierChange(e.target.value)}
                                    className="restock-req-select"
                                >
                                    {suppliersList.length > 0 ? suppliersList.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    )) : (
                                        <option value={supplier}>{supplier}</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Required delivery date */}
                        <div className="restock-req-field-group" style={{ marginBottom: 0 }}>
                            <label className="restock-req-label">Required Delivery Date</label>
                            <div className="restock-req-date-wrapper">
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="restock-req-date-input"
                                    min={tomorrowStr}
                                />
                                <button
                                    type="button"
                                    className="restock-req-calendar-btn"
                                    onClick={() => dateInputRef.current?.showPicker()}
                                    aria-label="Open calendar"
                                >
                                    <Calendar size={18} color="#166534" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List of Low Stock Items */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                        Products to Reorder ({items.length})
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {items.map(item => {
                            const itemId = item.id || item.name;
                            const qty = reorderQuantities[itemId] || 1;
                            const catalogMatch = supplierCatalog.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                            const itemImage = catalogMatch?.image || item.image || item.imageUrl;

                            return (
                                <div key={itemId} style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(15,23,42,0.04)' }}>

                                    {/* Row 1: Image + Product Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                            {itemImage ? (
                                                <img
                                                    src={itemImage}
                                                    alt={item.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{ display: itemImage ? 'none' : 'flex' }}>
                                                <Package size={22} color="#D97706" />
                                            </div>
                                        </div>
                                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', margin: 0, lineHeight: '1.3' }}>
                                            {item.name}
                                        </h4>
                                    </div>

                                    {/* Row 2: LOW STOCK badge + stock info (left) | Qty Stepper (right) */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                        {/* Left badges */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: '6px' }}>
                                                <AlertTriangle size={11} color="#D97706" />
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#B45309' }}>LOW STOCK</span>
                                            </div>
                                            <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: '600' }}>
                                                {item.currentStock !== undefined ? item.currentStock : 0} {item.unit || 'pack'} left · min {item.threshold || 10}
                                            </span>
                                        </div>

                                        {/* Right: Stepper */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reorder Qty</span>
                                            <div className="restock-req-qty-stepper" style={{ margin: 0 }}>
                                                <button
                                                    type="button"
                                                    className="qty-stepper-btn"
                                                    onClick={() => handleQtyChange(itemId, -1)}
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={qty}
                                                    onChange={(e) => handleQtyInput(itemId, e.target.value)}
                                                    className="restock-req-qty-input"
                                                    min="1"
                                                    style={{ width: '38px' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="qty-stepper-btn"
                                                    onClick={() => handleQtyChange(itemId, 1)}
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </div>


                {/* Action Buttons Stack */}
                <div className="restock-req-actions-group">
                    <button type="submit" className="restock-req-send-btn" disabled={isSubmitting}>
                        <Send size={16} />
                        <span>{isSubmitting ? 'Sending Request...' : 'Send combined replenishment request'}</span>
                    </button>

                    <button
                        type="button"
                        className="restock-req-cancel-btn"
                        onClick={handleBackToLowStock}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
