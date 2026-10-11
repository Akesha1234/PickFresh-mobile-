import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertCircle, Truck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './RestockRequestDetailsPage.css';

export default function RestockRequestDetailsPage({ onNavigate, po }) {
    const { user } = useAuth();
    const [statusMessage, setStatusMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const reqData = po || {
        id: 'SR-208',
        store: 'Lanka Mart',
        storeName: 'Lanka Mart',
        supplierName: 'ABC Distributors',
        product: 'Coca-Cola 1.5L',
        unitsLeft: 4,
        threshold: 10,
        reorderUnits: 20,
        deliveryTarget: 'Tomorrow 10.30 AM'
    };

    const [status, setStatus] = useState(reqData.status || 'Pending');

    useEffect(() => {
        if (po && po.status) {
            setStatus(po.status);
        }
        const targetId = reqData._id || reqData.id || reqData.poId;
        if (targetId) {
            fetch(`http://localhost:5000/api/supplier-replenishment/requests/${targetId}`)
                .then(res => res.json())
                .then(data => {
                    const fetchedPo = data.po || data.request;
                    if (data.success && fetchedPo && fetchedPo.status) {
                        setStatus(fetchedPo.status);
                    }
                })
                .catch(err => console.warn('Status fetch error:', err.message));
        }
    }, [po, reqData]);

    const poIdDisplay = reqData.id || reqData.poId || reqData._id || 'SR-208';
    const storeDisplayName = reqData.store || reqData.storeName || 'Lanka Mart';
    const supplierDisplayName = reqData.supplierName || reqData.supplier || user?.supplierName || user?.name || 'Lanka Mega Wholesale Distributors';
    const productDisplayName = reqData.product || reqData.itemsSummary || 'Coca-Cola 1.5L';
    const unitsLeftDisplay = reqData.unitsLeft !== undefined ? reqData.unitsLeft : 4;
    const thresholdDisplay = reqData.threshold || 10;
    const reorderQtyDisplay = reqData.reorderUnits ? `${reqData.reorderUnits} Units` : (reqData.reorderQty || '20 Units');
    const rawDeliveryDate = reqData.deliveryTarget || reqData.deliveryDate;
    let deliveryDateDisplay = 'Tomorrow 10.30 AM';
    if (rawDeliveryDate) {
        if (/^\d{4}-\d{2}-\d{2}/.test(rawDeliveryDate)) {
            const d = new Date(rawDeliveryDate);
            if (!isNaN(d.getTime())) {
                deliveryDateDisplay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } else {
                deliveryDateDisplay = rawDeliveryDate;
            }
        } else {
            deliveryDateDisplay = rawDeliveryDate;
        }
    }

    const [supplierCatalog, setSupplierCatalog] = useState([]);

    useEffect(() => {
        if (supplierDisplayName) {
            fetch(`http://localhost:5000/api/supplier-replenishment/catalog?supplierName=${encodeURIComponent(supplierDisplayName)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.products)) {
                        setSupplierCatalog(data.products);
                    }
                })
                .catch(err => console.warn('Failed to fetch supplier catalog for restock details:', err));
        }
    }, [supplierDisplayName]);

    const updateStatus = async (newStatus) => {
        setIsUpdating(true);
        try {
            const targetId = reqData._id || reqData.id || reqData.poId;
            if (targetId) {
                await fetch(`http://localhost:5000/api/supplier-replenishment/requests/${targetId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
            }
            setStatus(newStatus);
            setStatusMessage(
                ['Accepted', 'Confirmed', 'In Transit', 'Dispatched', 'Packed'].includes(newStatus)
                    ? 'Order Confirmed! Shipment scheduled.'
                    : 'Request Declined.'
            );
        } catch (err) {
            console.error('Failed to update status:', err);
            setStatus(newStatus);
            setStatusMessage(`Status updated to ${newStatus}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAccept = () => {
        updateStatus('Confirmed');
    };

    const handleDecline = () => {
        updateStatus('Rejected');
    };

    const handleBack = () => {
        if (onNavigate) onNavigate('requests_list');
    };

    const itemsArray = (Array.isArray(reqData.items) && reqData.items.length > 0)
        ? reqData.items
        : [
            {
                name: "Anchor Butter Salted 100g",
                produce: "Anchor Butter Salted 100g",
                qty: 20,
                unit: "pack",
                currentStock: 4,
                minOrder: 10
            },
            {
                name: "Munchee Super Cream Cracker",
                produce: "Munchee Super Cream Cracker",
                qty: 20,
                unit: "pack",
                currentStock: 6,
                minOrder: 10
            }
        ];

    const statusLower = (status || '').toString().toLowerCase().trim();
    const isDeliveredState = ['delivered', 'completed', 'fulfilled'].includes(statusLower);
    const isActiveState = ['accepted', 'confirmed', 'packed', 'dispatched', 'in transit', 'approved'].includes(statusLower);
    const isDeclinedState = ['rejected', 'declined'].includes(statusLower);

    return (
        <div className="restock-details-container">
            {/* 🔝 Top Fixed Header Section */}
            <div className="restock-details-header-section">
                <div className="restock-details-title-row">
                    <h1 className="restock-details-page-title">
                        Restock Request Details ({poIdDisplay.startsWith('#') ? poIdDisplay : `#${poIdDisplay}`})
                    </h1>
                    <button
                        className="restock-details-back-btn"
                        onClick={handleBack}
                        aria-label="Back to requests"
                        title="Back to Requests"
                    >
                        <ArrowLeft size={18} color="#1E293B" />
                    </button>
                </div>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="restock-details-scrollable-body">
                {statusMessage && (
                    <div className="restock-details-success-banner">
                        <Check size={18} /> {statusMessage}
                    </div>
                )}

                {/* General Request Overview Table Card */}
                <div className="restock-details-info-card" style={{ marginBottom: '20px' }}>
                    <div className="restock-details-info-row">
                        <span className="restock-details-info-label">Store Name:</span>
                        <span className="restock-details-info-val" style={{ fontWeight: '800', color: '#0F172A' }}>
                            {storeDisplayName}
                        </span>
                    </div>

                    <div className="restock-details-info-row">
                        <span className="restock-details-info-label">Supplier:</span>
                        <span className="restock-details-info-val" style={{ fontWeight: '800', color: '#0F172A' }}>
                            {supplierDisplayName}
                        </span>
                    </div>

                    <div className="restock-details-info-row">
                        <span className="restock-details-info-label">Suggested Reorder Quantity:</span>
                        <span className="restock-details-info-val" style={{ fontWeight: '800', color: '#166534' }}>
                            {reorderQtyDisplay}
                        </span>
                    </div>

                    <div className="restock-details-info-row">
                        <span className="restock-details-info-label">Required Delivery Date:</span>
                        <span className="restock-details-info-val" style={{ fontWeight: '800', color: '#0F172A' }}>
                            {deliveryDateDisplay}
                        </span>
                    </div>
                </div>

                {/* Products to Reorder Breakdown List (Matching Image 2 UI) */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                        Products to Reorder ({itemsArray.length})
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {itemsArray.map((item, index) => {
                            const name = item.produce || item.name || `Product #${index + 1}`;
                            const qty = item.qty || 1;
                            const unit = item.unit || 'pack';
                            const currentStock = item.currentStock !== undefined ? item.currentStock : (unitsLeftDisplay || 4);
                            const minOrder = item.minOrder || (thresholdDisplay || 5);

                            const catalogMatch = supplierCatalog.find(c => c.name.toLowerCase() === name.toLowerCase());
                            const itemImage = item.image || item.imageUrl || item.img || catalogMatch?.image || catalogMatch?.imageUrl;

                            return (
                                <div key={index} style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '16px',
                                    padding: '14px 16px',
                                    border: '1px solid #E2E8F0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        {/* Product Image Thumbnail */}
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '12px',
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {itemImage ? (
                                                <img src={itemImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '26px' }}>📦</span>
                                            )}
                                        </div>

                                        {/* Product Name & Stock Info */}
                                        <div>
                                            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                                                {name}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    color: isDeliveredState ? '#15803D' : '#B45309',
                                                    backgroundColor: isDeliveredState ? '#DCFCE7' : '#FEF3C7',
                                                    border: `1px solid ${isDeliveredState ? '#86EFAC' : '#FDE68A'}`,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    {isDeliveredState ? '✓ IN STOCK' : '⚠️ LOW STOCK'}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                                                    {currentStock} {unit} left • min {minOrder}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reorder Quantity Pill Badge */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                            REORDER QTY
                                        </span>
                                        <div style={{
                                            backgroundColor: '#F0FDF4',
                                            border: '1.5px solid #86EFAC',
                                            color: '#166534',
                                            padding: '6px 14px',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: '900',
                                            display: 'inline-block'
                                        }}>
                                            {qty} {unit}s
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="restock-details-fixed-bottom-bar">
                {isDeliveredState ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{
                            backgroundColor: '#DCFCE7',
                            border: '1px solid #86EFAC',
                            color: '#15803D',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Check size={16} color="#15803D" /> Order Delivered & Inventory Restocked
                        </div>
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <button
                                type="button"
                                className="restock-details-accept-btn"
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('delivery_tracking', { po: { ...reqData, status: 'Delivered' } });
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#15803D',
                                    padding: '12px',
                                    fontSize: '13px',
                                    borderRadius: '12px'
                                }}
                            >
                                <Truck size={16} /> Tracking
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(true)}
                                style={{
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    fontSize: '13px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Trash2 size={16} color="#DC2626" /> Delete
                            </button>
                        </div>
                    </div>
                ) : isActiveState ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #86EFAC',
                            color: '#166534',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Check size={16} color="#166534" /> Order Confirmed & Active ({status})
                        </div>
                        <button
                            type="button"
                            className="restock-details-accept-btn"
                            onClick={() => {
                                if (onNavigate) {
                                    onNavigate('delivery_tracking', { po: { ...reqData, status } });
                                }
                            }}
                            style={{
                                backgroundColor: '#166534',
                                padding: '14px',
                                fontSize: '14px',
                                borderRadius: '14px'
                            }}
                        >
                            <Truck size={18} /> View Live Timeline & Tracking
                        </button>
                    </div>
                ) : isDeclinedState ? (
                    <div style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        color: '#991B1B',
                        padding: '14px 16px',
                        borderRadius: '14px',
                        fontWeight: '700',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <AlertCircle size={18} color="#991B1B" /> Request Declined
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            className="restock-details-accept-btn"
                            onClick={handleAccept}
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Updating...' : 'Accept & Confirm Order'}
                        </button>

                        <button
                            type="button"
                            className="restock-details-decline-btn"
                            onClick={handleDecline}
                            disabled={isUpdating}
                        >
                            Decline Request
                        </button>
                    </>
                )}
            </div>

            {/* ✅ Custom Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    zIndex: 99999, padding: '0 0 24px 0'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF', borderRadius: '24px 24px 16px 16px',
                        padding: '28px 24px 20px', width: '100%', maxWidth: '400px',
                        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                backgroundColor: '#FEF2F2', border: '2px solid #FCA5A5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Trash2 size={26} color="#DC2626" />
                            </div>
                        </div>
                        <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                            Delete Order Record?
                        </h3>
                        <p style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                            This will permanently remove <strong style={{ color: '#0F172A' }}>{poIdDisplay}</strong> from the database. This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={async () => {
                                    setDeleteConfirm(false);
                                    const targetId = reqData._id || reqData.id || reqData.poId;
                                    try {
                                        const res = await fetch(`http://localhost:5000/api/supplier-replenishment/requests/${targetId}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success && onNavigate) {
                                            onNavigate('requests_list');
                                        }
                                    } catch (err) { console.error('Delete error:', err); }
                                }}
                                style={{
                                    backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none',
                                    borderRadius: '14px', padding: '15px', fontSize: '15px',
                                    fontWeight: '800', cursor: 'pointer', width: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <Trash2 size={17} color="#FFFFFF" /> Yes, Delete Permanently
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(false)}
                                style={{
                                    backgroundColor: '#F1F5F9', color: '#334155', border: 'none',
                                    borderRadius: '14px', padding: '15px', fontSize: '15px',
                                    fontWeight: '700', cursor: 'pointer', width: '100%'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

