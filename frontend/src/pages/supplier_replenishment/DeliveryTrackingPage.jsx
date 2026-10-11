import React, { useState, useEffect, useMemo } from 'react';
import { Check, Truck, Thermometer, MapPin, RefreshCw, ShieldCheck, Clock, Navigation, ChevronRight, ChevronDown, ChevronUp, PackageCheck, AlertCircle, Edit3, Zap, Package, Box, CheckCircle2, UserCheck, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './DeliveryTrackingPage.css';

export default function DeliveryTrackingPage({ onNavigate, po }) {
    const { user } = useAuth();
    const isSupplier = user?.role === 'supplier';
    const [deliveriesList, setDeliveriesList] = useState(po ? [po] : []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(!po);
    const [updating, setUpdating] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [expandedCompletedPoIds, setExpandedCompletedPoIds] = useState({});
    const [hasInitializedCompleted, setHasInitializedCompleted] = useState(false);

    const fetchTracking = async () => {
        if (!po) setLoading(true);
        try {
            let endpoint = 'http://localhost:5000/api/supplier-replenishment/delivery-tracking';
            if (isSupplier) {
                const supplierName = user?.supplierName || user?.name || '';
                const supplierEmail = user?.email || '';
                endpoint += `?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            } else if (po && (po.supplierName || po.poId)) {
                endpoint += `?supplierName=${encodeURIComponent(po.supplierName || '')}`;
            }

            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.deliveries) && data.deliveries.length > 0) {
                setDeliveriesList(data.deliveries);
            } else if (data.delivery) {
                setDeliveriesList([data.delivery]);
            } else if (po) {
                setDeliveriesList([po]);
            } else {
                setDeliveriesList([]);
            }
        } catch (err) {
            console.error('Error fetching delivery tracking:', err.message);
            if (po) setDeliveriesList([po]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTracking();
    }, [po]);

    useEffect(() => {
        if (po && deliveriesList.length > 0) {
            const poIdToFind = po.id || po._id || po.poId;
            if (po.status === 'Delivered') {
                setTrackingFilter('completed');
                const list = deliveriesList.filter(item => item.status === 'Delivered');
                const idx = list.findIndex(item => (item.id || item._id || item.poId) === poIdToFind);
                if (idx !== -1) setSelectedIndex(idx);
            } else {
                setTrackingFilter('active');
                const list = deliveriesList.filter(item => item.status !== 'Delivered');
                const idx = list.findIndex(item => (item.id || item._id || item.poId) === poIdToFind);
                if (idx !== -1) setSelectedIndex(idx);
            }
        }
    }, [po, deliveriesList]);

    const [trackingFilter, setTrackingFilter] = useState('active'); // 'active' | 'completed'

    const activeDeliveriesList = useMemo(() => deliveriesList.filter(item => item.status !== 'Delivered'), [deliveriesList]);
    const completedDeliveriesList = useMemo(() => deliveriesList.filter(item => item.status === 'Delivered'), [deliveriesList]);

    useEffect(() => {
        if (!hasInitializedCompleted && trackingFilter === 'completed' && completedDeliveriesList.length > 0) {
            const firstItem = completedDeliveriesList[0];
            const firstId = firstItem.poId || firstItem.id || firstItem._id;
            if (firstId) {
                setExpandedCompletedPoIds({ [firstId]: true });
                setHasInitializedCompleted(true);
            }
        }
    }, [hasInitializedCompleted, trackingFilter, completedDeliveriesList]);

    const toggleExpandOrder = (targetId) => {
        setExpandedCompletedPoIds(prev => ({
            ...prev,
            [targetId]: !prev[targetId]
        }));
    };

    const currentList = trackingFilter === 'completed' ? completedDeliveriesList : activeDeliveriesList;

    const activeItem = currentList[selectedIndex] || currentList[0] || null;

    // Clean PO ID formatting (e.g. PO-1331 instead of raw 24-char Mongo Object ID)
    const rawPoId = activeItem ? (activeItem.poId || activeItem.id || activeItem._id || 'PO-1331') : '';
    const displayPoId = rawPoId.length > 18 ? `PO-${rawPoId.substring(rawPoId.length - 4).toUpperCase()}` : rawPoId;
    const cleanPoNumber = displayPoId.startsWith('#') ? displayPoId : `#${displayPoId}`;

    const storeName = activeItem ? (activeItem.storeName || activeItem.store || 'GroceryMart') : '';
    const currentStatus = activeItem ? (activeItem.status || 'Pending Approval') : 'Pending Approval';

    const handleUpdateStatus = async (newStatus) => {
        setUpdating(true);
        try {
            const targetId = activeItem.id || activeItem._id || activeItem.poId;
            const res = await fetch(`http://localhost:5000/api/supplier-replenishment/update-po-status/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                // Update local state instantly for zero-latency feedback
                setDeliveriesList(prev => prev.map(item => {
                    const itemId = item.id || item._id || item.poId;
                    return (itemId === targetId || item === activeItem) ? { ...item, status: newStatus } : item;
                }));
                if (newStatus === 'Delivered') {
                    setToastMsg(`Order ${cleanPoNumber} delivered & removed from Active Orders! ✅`);
                    setSelectedIndex(0);
                } else {
                    setToastMsg(`Status updated to ${newStatus}! 📦`);
                }
                setTimeout(() => setToastMsg(''), 3500);
            }
        } catch (err) {
            console.error('Failed to update status:', err.message);
        } finally {
            setUpdating(false);
        }
    };

    const [isEditingEta, setIsEditingEta] = useState(false);
    const [newEtaValue, setNewEtaValue] = useState('');

    const handleSaveEta = async () => {
        const parsedEta = parseInt(newEtaValue, 10);
        if (isNaN(parsedEta) || parsedEta < 0) return;

        setUpdating(true);
        try {
            const targetId = activeItem.id || activeItem._id || activeItem.poId;
            const res = await fetch(`http://localhost:5000/api/supplier-replenishment/update-po-status/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etaMinutes: parsedEta })
            });
            const data = await res.json();
            if (data.success) {
                setDeliveriesList(prev => prev.map(item => {
                    const itemId = item.id || item._id || item.poId;
                    return (itemId === targetId || item === activeItem) ? { ...item, etaMinutes: parsedEta } : item;
                }));
                setIsEditingEta(false);
                setToastMsg(`Delivery ETA updated to ${parsedEta} mins! ⏱️`);
                setTimeout(() => setToastMsg(''), 3000);
            }
        } catch (err) {
            console.error('Failed to update ETA:', err.message);
        } finally {
            setUpdating(false);
        }
    };

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        driverName: '',
        vehicleNo: '',
        tempStorage: '',
        etaMinutes: 24,
        currentLocation: ''
    });

    const openEditModal = () => {
        setEditForm({
            driverName: activeItem.driverName || 'Kamal Wijekoon',
            vehicleNo: activeItem.vehicleNo || 'WP-GA-4521',
            tempStorage: activeItem.tempStorage || '4.2°C (Optimal)',
            etaMinutes: activeItem.etaMinutes || 24,
            currentLocation: activeItem.currentLocation || 'High Level Road, Maharagama (En Route)'
        });
        setShowEditModal(true);
    };

    const handleSaveLogistics = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const targetId = activeItem.id || activeItem._id || activeItem.poId;
            const res = await fetch(`http://localhost:5000/api/supplier-replenishment/update-po-status/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (data.success) {
                setDeliveriesList(prev => prev.map(item => {
                    const itemId = item.id || item._id || item.poId;
                    return (itemId === targetId || item === activeItem) ? { ...item, ...editForm } : item;
                }));
                setShowEditModal(false);
                setToastMsg('Logistics & Driver details saved to MongoDB! 🚛');
                setTimeout(() => setToastMsg(''), 3000);
            }
        } catch (err) {
            console.error('Failed to save logistics details:', err.message);
        } finally {
            setUpdating(false);
        }
    };

    const isStep1Done = true; // Requested
    const isStep2Done = ['Accepted', 'Confirmed', 'Packed', 'Dispatched', 'In Transit', 'Delivered'].includes(currentStatus);
    const isStep3Done = ['Packed', 'Dispatched', 'In Transit', 'Delivered'].includes(currentStatus);
    const isStep4Done = ['Dispatched', 'In Transit', 'Delivered'].includes(currentStatus);
    const isStep5Done = currentStatus === 'Delivered';

    const steps = [
        { id: 1, label: 'Requested', completed: isStep1Done },
        { id: 2, label: 'Confirmed', completed: isStep2Done },
        { id: 3, label: 'Packed', completed: isStep3Done },
        { id: 4, label: 'Dispatched', completed: isStep4Done },
        { id: 5, label: 'Delivered', completed: isStep5Done }
    ];

    const handleBack = () => {
        if (onNavigate) {
            if (isSupplier) {
                onNavigate('supplier_portal');
            } else {
                onNavigate('supplier_list');
            }
        }
    };

    const getBadgeStyle = (status) => {
        switch (status) {
            case 'Delivered':
                return { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' };
            case 'In Transit':
            case 'Dispatched':
                return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' };
            case 'Packed':
            case 'Accepted':
            case 'Confirmed':
                return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
            default:
                return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
        }
    };

    const renderCompletedHistory = () => {
        if (completedDeliveriesList.length === 0) {
            return (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                    margin: '12px 0'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#F0FDF4',
                        color: '#15803D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #DCFCE7'
                    }}>
                        <PackageCheck size={32} color="#15803D" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px 0' }}>
                            No Delivered Orders Yet
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '320px', lineHeight: '1.4' }}>
                            Completed delivery history will be archived and shown here once orders are fulfilled.
                        </p>
                    </div>
                </div>
            );
        }

        const allCompletedExpanded = completedDeliveriesList.length > 0 && completedDeliveriesList.every(item => {
            const id = item.poId || item.id || item._id;
            return !!expandedCompletedPoIds[id];
        });

        const handleToggleAllCompleted = () => {
            if (allCompletedExpanded) {
                setExpandedCompletedPoIds({});
            } else {
                const next = {};
                completedDeliveriesList.forEach(item => {
                    const id = item.poId || item.id || item._id;
                    if (id) next[id] = true;
                });
                setExpandedCompletedPoIds(next);
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {completedDeliveriesList.length > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '2px 4px',
                        marginBottom: '-2px'
                    }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#64748B' }}>
                            {completedDeliveriesList.length} Archived Deliveries
                        </span>
                        <button
                            type="button"
                            onClick={handleToggleAllCompleted}
                            style={{
                                background: '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '5px 12px',
                                color: '#15803D',
                                fontSize: '11.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {allCompletedExpanded ? (
                                <>
                                    <ChevronUp size={13} strokeWidth={2.5} /> Collapse All
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={13} strokeWidth={2.5} /> Expand All
                                </>
                            )}
                        </button>
                    </div>
                )}
                {completedDeliveriesList.map((item, idx) => {
                    const itemId = item.poId || item.id || item._id || `completed-${idx}`;
                    const cleanPId = itemId.length > 18 ? `PO-${itemId.substring(itemId.length - 4).toUpperCase()}` : itemId;
                    const cleanPoNumber = cleanPId.startsWith('#') ? cleanPId : `#${cleanPId}`;
                    const isExpanded = !!expandedCompletedPoIds[itemId];

                    const totalItemsCount = item.items ? item.items.length : 1;
                    const itemsSummaryText = item.items && item.items.length > 0
                        ? item.items.map(i => `${i.produce || i.name} (${i.qty || 1} ${i.unit || 'pack'})`).join(', ')
                        : (item.product || item.itemsSummary || 'Fresh Produce Restock');

                    const calculatedTotal = item.totalAmount || (item.items ? item.items.reduce((sum, i) => sum + (i.subtotal || ((Number(i.wholesaleRate || i.wholesalePrice || i.price || 0) || 150) * (i.qty || 1))), 0) : 0);

                    const storeName = item.storeName || item.store || 'GroceryMart';
                    const supplierName = item.supplierName || user?.supplierName || user?.name || 'Central Food City';

                    return (
                        <div
                            key={itemId}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '20px',
                                border: isExpanded ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                                boxShadow: isExpanded ? '0 10px 25px -5px rgba(21, 128, 61, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {/* Summary Card Header (Click to toggle expand/collapse) */}
                            <div
                                onClick={() => toggleExpandOrder(itemId)}
                                role="button"
                                tabIndex={0}
                                style={{
                                    padding: '16px 18px',
                                    cursor: 'pointer',
                                    backgroundColor: isExpanded ? '#F0FDF4' : '#FFFFFF',
                                    borderBottom: isExpanded ? '1px solid #DCFCE7' : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    transition: 'background-color 0.15s ease'
                                }}
                            >
                                {/* Top Row: PO Badge + Delivered Tag */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '900', color: '#0F172A' }}>
                                            Request <span style={{ color: '#15803D' }}>{cleanPoNumber}</span>
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        color: '#15803D',
                                        backgroundColor: '#DCFCE7',
                                        border: '1px solid #86EFAC',
                                        padding: '4px 10px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <CheckCircle2 size={13} /> DELIVERED
                                    </span>
                                </div>

                                {/* Store & Supplier */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                                        Target Store: <strong style={{ color: '#0F172A' }}>{storeName}</strong>
                                        <span style={{ color: '#94A3B8', margin: '0 6px' }}>•</span>
                                        Supplier: <strong style={{ color: '#0F172A' }}>{supplierName}</strong>
                                    </div>
                                    {item.requestedDate && (
                                        <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>
                                            {new Date(item.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Summary Bar: Products summary, Total value, Expand toggle button */}
                                <div style={{
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: isExpanded ? '#FFFFFF' : '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    marginTop: '2px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, marginRight: '10px' }}>
                                        <Package size={16} color="#15803D" style={{ flexShrink: 0 }} />
                                        <span style={{
                                            fontSize: '12.5px',
                                            fontWeight: '700',
                                            color: '#334155',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}: {itemsSummaryText}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#15803D' }}>
                                            Rs. {calculatedTotal.toLocaleString()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpandOrder(itemId);
                                            }}
                                            aria-expanded={isExpanded}
                                            title={isExpanded ? "Click to collapse details" : "Click to view full details"}
                                            style={{
                                                background: isExpanded ? '#15803D' : '#E2E8F0',
                                                color: isExpanded ? '#FFFFFF' : '#334155',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                boxShadow: isExpanded ? '0 2px 6px rgba(21, 128, 61, 0.25)' : 'none',
                                                padding: 0
                                            }}
                                        >
                                            {isExpanded ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details Body */}
                            {isExpanded && (
                                <div style={{ padding: '16px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* Supplier Info */}
                                    <div style={{
                                        backgroundColor: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '14px',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '10px',
                                                backgroundColor: '#DCFCE7', color: '#15803D',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                <Truck size={17} color="#15803D" />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: '600' }}>Supplier:</span>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                                                    {supplierName}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            backgroundColor: '#FEF9C3', border: '1px solid #FDE68A',
                                            borderRadius: '10px', padding: '8px 12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={14} color="#D97706" />
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#B45309' }}>Status:</span>
                                                <span style={{ fontSize: '13px', fontWeight: '900', color: '#D97706' }}>
                                                    Fully Delivered & Restocked
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                                                Completed
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ordered Products Section */}
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Package size={14} color="#15803D" /> Ordered Products List
                                        </div>

                                        {item.items && item.items.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {item.items.map((prodItem, pIdx) => {
                                                    const prodName = prodItem.produce || prodItem.name || 'Product';
                                                    const qty = prodItem.qty || 1;
                                                    const unit = prodItem.unit || 'pack';
                                                    const rate = Number(prodItem.wholesaleRate || prodItem.wholesalePrice || prodItem.price || 0) || 150;
                                                    const itemSubtotal = prodItem.subtotal || (qty * rate);
                                                    const itemImage = prodItem.image || prodItem.imageUrl || '';

                                                    return (
                                                        <div key={pIdx} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                                                            borderRadius: '12px', padding: '10px 12px', gap: '10px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    width: '42px', height: '42px', borderRadius: '10px',
                                                                    backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                                                                    overflow: 'hidden', display: 'flex', alignItems: 'center',
                                                                    justifyContent: 'center', flexShrink: 0
                                                                }}>
                                                                    {itemImage ? (
                                                                        <img src={itemImage} alt={prodName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <div style={{ width: '100%', height: '100%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <Package size={20} color="#15803D" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                                                                        {prodName}
                                                                    </h4>
                                                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                                                                        Wholesale: <strong style={{ color: '#334155' }}>Rs. {rate.toLocaleString()}/{unit}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                                                                <span style={{
                                                                    fontSize: '11px', color: '#166534', fontWeight: '800',
                                                                    backgroundColor: '#DCFCE7', padding: '2px 8px',
                                                                    borderRadius: '6px', border: '1px solid #86EFAC'
                                                                }}>
                                                                    {qty} {unit}s
                                                                </span>
                                                                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '900' }}>
                                                                    Rs. {itemSubtotal.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                                                borderRadius: '12px', padding: '10px 12px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Package size={16} color="#15803D" />
                                                    </div>
                                                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0F172A' }}>
                                                        {item.product || item.itemsSummary || 'Fresh Produce Restock'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Total Value Box */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            marginTop: '10px', padding: '10px 14px',
                                            backgroundColor: '#FEF9C3', border: '1.5px solid #FDE68A', borderRadius: '12px'
                                        }}>
                                            <span style={{ fontSize: '12.5px', color: '#92400E', fontWeight: '800' }}>
                                                Order Total Value
                                            </span>
                                            <span style={{ fontSize: '15px', color: '#92400E', fontWeight: '900' }}>
                                                Rs. {calculatedTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timeline Stepper for Completed Order */}
                                    <div className="delivery-track-stepper-card" style={{ boxShadow: 'none', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px' }}>
                                        <h3 className="delivery-track-stepper-header" style={{ fontSize: '12.5px', marginBottom: '10px' }}>Dispatch Timeline</h3>
                                        <div className="delivery-track-stepper">
                                            {steps.map((step, sIdx) => {
                                                const isLast = sIdx === steps.length - 1;
                                                return (
                                                    <div key={step.id} className="delivery-track-step-node" style={{ paddingBottom: isLast ? 0 : '14px' }}>
                                                        {!isLast && (
                                                            <div className="delivery-track-step-line completed" style={{ left: '13px' }} />
                                                        )}
                                                        <div className="delivery-track-step-circle done" style={{ width: '26px', height: '26px' }}>
                                                            <Check size={13} strokeWidth={3} />
                                                        </div>
                                                        <span className="delivery-track-step-label" style={{ fontSize: '13.5px' }}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Delete record option */}
                                    {isSupplier && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div className="delivery-delivered-badge" style={{ padding: '10px', fontSize: '13px' }}>
                                                <Check size={16} /> Order Delivered & Handed Off to Store
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setItemToDelete(item);
                                                    setDeleteConfirm(true);
                                                }}
                                                style={{
                                                    backgroundColor: '#FEF2F2',
                                                    color: '#DC2626',
                                                    border: '1px solid #FCA5A5',
                                                    borderRadius: '12px',
                                                    padding: '10px',
                                                    fontSize: '13px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <Trash2 size={15} color="#DC2626" /> Delete Order Record
                                            </button>
                                        </div>
                                    )}

                                    {/* Quick Collapse Button at bottom of details */}
                                    <button
                                        type="button"
                                        onClick={() => toggleExpandOrder(itemId)}
                                        style={{
                                            background: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '12px',
                                            color: '#64748B',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px 14px',
                                            marginTop: '4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <ChevronUp size={15} /> Collapse Order Details
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const badgeStyle = getBadgeStyle(currentStatus);

    return (
        <div className="delivery-track-container">
            {/* 🔝 Top Fixed Header Section */}
            <div className="delivery-track-header-section">
                {/* Header Title with Sync & Back Button on Right */}
                <div className="delivery-track-header-row">
                    <h1 className="delivery-track-title" style={{ margin: 0 }}>Delivery Tracking</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={fetchTracking}
                            className="delivery-track-sync-btn"
                            title="Sync with database"
                        >
                            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
                            <span>Sync</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleBack}
                            className="supplier-back-btn-right"
                            title="Go Back"
                            aria-label="Back to dashboard"
                        >
                            <ArrowLeft size={18} color="#1E293B" />
                        </button>
                    </div>
                </div>

                {toastMsg && (
                    <div className="delivery-track-toast-banner">
                        <Check size={16} /> {toastMsg}
                    </div>
                )}

                {/* Filter Toggle: Active Orders vs Completed Deliveries History */}
                <div style={{
                    display: 'flex',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '12px',
                    padding: '4px',
                    gap: '4px'
                }}>
                    <button
                        type="button"
                        onClick={() => { setTrackingFilter('active'); setSelectedIndex(0); }}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: trackingFilter === 'active' ? '#FFFFFF' : 'transparent',
                            color: trackingFilter === 'active' ? '#15803D' : '#64748B',
                            boxShadow: trackingFilter === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <Clock size={13} color={trackingFilter === 'active' ? '#15803D' : '#64748B'} />
                        Active Orders ({activeDeliveriesList.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTrackingFilter('completed'); setSelectedIndex(0); }}
                        style={{
                            flex: 1.2,
                            padding: '8px 4px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: trackingFilter === 'completed' ? '#FFFFFF' : 'transparent',
                            color: trackingFilter === 'completed' ? '#2563EB' : '#64748B',
                            boxShadow: trackingFilter === 'completed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <PackageCheck size={13} color={trackingFilter === 'completed' ? '#2563EB' : '#64748B'} />
                        Completed History ({completedDeliveriesList.length})
                    </button>
                </div>

                {/* Active Deliveries Multi-Selector Tabs if multiple orders exist */}
                {trackingFilter === 'active' && activeDeliveriesList.length > 1 && (
                    <div className="delivery-track-order-tabs">
                        <span className="delivery-track-tabs-label">ACTIVE ORDERS:</span>
                        <div className="delivery-track-tabs-scroll">
                            {activeDeliveriesList.map((item, idx) => {
                                const pId = item.poId || item.id || item._id;
                                const cleanPId = pId.length > 18 ? `PO-${pId.substring(pId.length - 4).toUpperCase()}` : pId;
                                return (
                                    <button
                                        key={idx}
                                        className={`delivery-track-tab-pill ${idx === selectedIndex ? 'active' : ''}`}
                                        onClick={() => setSelectedIndex(idx)}
                                    >
                                        #{cleanPId}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="delivery-track-scrollable-body">
                {/* Main Content: Completed History list OR Active Order Details */}
                {trackingFilter === 'completed' ? (
                    renderCompletedHistory()
                ) : (!activeItem || activeDeliveriesList.length === 0) ? (
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '24px',
                        padding: '48px 24px',
                        textAlign: 'center',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '14px',
                        margin: '12px 0'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: '#F0FDF4',
                            color: '#15803D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #DCFCE7'
                        }}>
                            <PackageCheck size={32} color="#15803D" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px 0' }}>
                                No Active Delivery Orders
                            </h3>
                            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '320px', lineHeight: '1.4' }}>
                                All store replenishment requests have been fulfilled or there are no pending orders right now.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Simplified Clean Active Order Details Card */}
                        <div className="delivery-track-status-card">
                            <div className="delivery-track-card-top-row">
                                <div>
                                    <div className="delivery-track-badge-req">
                                        Request <span className="delivery-track-po-highlight">{cleanPoNumber}</span>
                                    </div>
                                    <p className="delivery-track-target-store" style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#334155' }}>
                                        Target Store: <strong style={{ color: '#0F172A' }}>{storeName}</strong>
                                    </p>
                                </div>
                                <span
                                    className="delivery-track-status-pill"
                                    style={{
                                        backgroundColor: badgeStyle.bg,
                                        color: badgeStyle.color,
                                        border: `1px solid ${badgeStyle.border}`
                                    }}
                                >
                                    {currentStatus}
                                </span>
                            </div>

                            {/* Clean Supplier & ETA Card (2-Row layout: Full Supplier Name on top, ETA below) */}
                            <div style={{
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '14px',
                                padding: '14px',
                                marginTop: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                {/* Row 1: Full Supplier Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        backgroundColor: '#DCFCE7',
                                        color: '#15803D',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Truck size={18} color="#15803D" />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>Supplier:</span>
                                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                                            {activeItem.supplierName || user?.supplierName || user?.name || 'Central Food City'}
                                        </span>
                                    </div>
                                </div>

                                {/* Row 2 (Pahalin): ETA Bar */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: '#FEF9C3',
                                    border: '1px solid #FDE68A',
                                    borderRadius: '10px',
                                    padding: '8px 12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={15} color="#D97706" />
                                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#B45309' }}>
                                            ETA:
                                        </span>
                                        {!isEditingEta && (
                                            <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#D97706' }}>
                                                {activeItem.etaMinutes ? `${activeItem.etaMinutes} mins` : '24 mins'}
                                            </span>
                                        )}
                                    </div>

                                    {isEditingEta && isSupplier ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                value={newEtaValue}
                                                onChange={(e) => setNewEtaValue(e.target.value)}
                                                style={{
                                                    width: '45px',
                                                    padding: '2px 4px',
                                                    borderRadius: '6px',
                                                    border: '1.5px solid #D97706',
                                                    fontSize: '12px',
                                                    fontWeight: '800',
                                                    textAlign: 'center',
                                                    outline: 'none',
                                                    backgroundColor: '#FFFFFF',
                                                    color: '#92400E'
                                                }}
                                                autoFocus
                                            />
                                            <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#92400E' }}>mins</span>
                                            <button
                                                type="button"
                                                onClick={handleSaveEta}
                                                style={{
                                                    backgroundColor: '#15803D',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingEta(false)}
                                                style={{
                                                    backgroundColor: '#CBD5E1',
                                                    color: '#334155',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '3px 6px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        isSupplier && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewEtaValue(activeItem.etaMinutes || 24);
                                                    setIsEditingEta(true);
                                                }}
                                                title="Click to edit ETA minutes"
                                                style={{
                                                    background: '#FFFFFF',
                                                    border: '1px solid #FDE68A',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    padding: '3px 8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: '#D97706',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                <Edit3 size={12} /> Edit ETA
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Ordered Products Section */}
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Package size={14} color="#15803D" /> Ordered Products List
                                </div>

                                {activeItem.items && activeItem.items.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {activeItem.items.map((item, idx) => {
                                            const prodName = item.produce || item.name || 'Product';
                                            const qty = item.qty || 1;
                                            const unit = item.unit || 'pack';
                                            const rate = Number(item.wholesaleRate || item.wholesalePrice || item.price || 0) || 150;
                                            const itemSubtotal = item.subtotal || (qty * rate);
                                            const itemImage = item.image || item.imageUrl || '';

                                            return (
                                                <div key={idx} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '14px',
                                                    padding: '12px 14px',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                                    gap: '12px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                        {/* Product Image Thumbnail */}
                                                        <div style={{
                                                            width: '48px',
                                                            height: '48px',
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
                                                                <img src={itemImage} alt={prodName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Package size={22} color="#15803D" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                            <h4 style={{ margin: '0 0 3px 0', fontSize: '13.5px', fontWeight: '800', color: '#0F172A', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>
                                                                {prodName}
                                                            </h4>
                                                            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>
                                                                Wholesale: <strong style={{ color: '#334155' }}>Rs. {rate.toLocaleString()}/{unit}</strong>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                                        <span style={{
                                                            fontSize: '11.5px',
                                                            color: '#166534',
                                                            fontWeight: '800',
                                                            backgroundColor: '#DCFCE7',
                                                            padding: '3px 10px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #86EFAC'
                                                        }}>
                                                            {qty} {unit}s
                                                        </span>
                                                        <span style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: '900' }}>
                                                            Rs. {itemSubtotal.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                                        borderRadius: '14px', padding: '12px 14px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Package size={18} color="#15803D" />
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                                                {activeItem.product || activeItem.itemsSummary || 'Fresh Produce Restock'}
                                            </span>
                                        </div>
                                        {activeItem.reorderUnits > 0 && (
                                            <span style={{ fontSize: '12px', color: '#166534', fontWeight: '800', backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: '8px' }}>
                                                {activeItem.reorderUnits} units
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Order Total Value Box (Matching Screenshot Design) */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginTop: '12px', padding: '12px 16px',
                                    backgroundColor: '#FEF9C3', border: '1.5px solid #FDE68A', borderRadius: '14px',
                                    boxShadow: '0 2px 6px rgba(251, 191, 36, 0.12)'
                                }}>
                                    <span style={{ fontSize: '13px', color: '#92400E', fontWeight: '800' }}>
                                        Order Total Value
                                    </span>
                                    <span style={{ fontSize: '16px', color: '#92400E', fontWeight: '900' }}>
                                        Rs. {(activeItem.totalAmount || (activeItem.items ? activeItem.items.reduce((sum, i) => sum + (i.subtotal || ((Number(i.wholesaleRate || i.wholesalePrice || i.price || 0) || 150) * (i.qty || 1))), 0) : 0)).toLocaleString()}
                                    </span>
                                </div>

                                {activeItem.requestedDate && (
                                    <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '8px', textAlign: 'right', fontWeight: '600' }}>
                                        Requested: {new Date(activeItem.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vertical Delivery Stepper Container */}
                        <div className="delivery-track-stepper-card">
                            <h3 className="delivery-track-stepper-header">Dispatch Timeline</h3>
                            <div className="delivery-track-stepper">
                                {steps.map((step, index) => {
                                    const isLast = index === steps.length - 1;
                                    const nextStepDone = !isLast && steps[index + 1].completed;

                                    return (
                                        <div key={step.id} className="delivery-track-step-node">
                                            {!isLast && (
                                                <div className={`delivery-track-step-line ${nextStepDone ? 'completed' : ''}`} />
                                            )}

                                            <div className={`delivery-track-step-circle ${step.completed ? 'done' : 'pending'}`}>
                                                {step.completed ? (
                                                    <Check size={16} strokeWidth={3} />
                                                ) : (
                                                    <span style={{ fontSize: '11px', fontWeight: '700' }}>{step.id}</span>
                                                )}
                                            </div>

                                            <span className={`delivery-track-step-label ${!step.completed ? 'pending' : ''}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            {isSupplier && trackingFilter === 'active' && activeItem && activeDeliveriesList.length > 0 && (
                <div className="delivery-track-fixed-bottom-bar">
                    <div className="delivery-track-controls-card">
                        <div className="delivery-track-controls-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={15} color="#D97706" /> Supplier Dispatch Action Controls
                        </div>
                        <div className="delivery-track-controls-buttons">
                            {(['Pending Approval', 'Pending', 'Accepted', 'Confirmed'].includes(currentStatus)) && (
                                <button
                                    disabled={updating}
                                    onClick={() => handleUpdateStatus('Packed')}
                                    className="delivery-control-btn btn-pack"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
                                >
                                    Mark as Packed <Box size={16} />
                                </button>
                            )}
                            {currentStatus === 'Packed' && (
                                <button
                                    disabled={updating}
                                    onClick={() => handleUpdateStatus('Dispatched')}
                                    className="delivery-control-btn btn-dispatch"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
                                >
                                    Mark as Dispatched <Truck size={16} />
                                </button>
                            )}
                            {(currentStatus === 'Dispatched' || currentStatus === 'In Transit') && (
                                <button
                                    disabled={updating}
                                    onClick={() => handleUpdateStatus('Delivered')}
                                    className="delivery-control-btn btn-deliver"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
                                >
                                    Mark as Delivered <CheckCircle2 size={16} />
                                </button>
                            )}
                            {currentStatus === 'Delivered' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                    <div className="delivery-delivered-badge">
                                        <Check size={18} /> Order Delivered & Handed Off to Store
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirm(true)}
                                        style={{
                                            backgroundColor: '#FEF2F2',
                                            color: '#DC2626',
                                            border: '1px solid #FCA5A5',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            fontSize: '14px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Trash2 size={16} color="#DC2626" /> Delete Order Record from Database
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                            This will permanently remove the selected order from the database. This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={async () => {
                                    setDeleteConfirm(false);
                                    const targetItem = itemToDelete || activeItem;
                                    const targetId = targetItem?.id || targetItem?._id || targetItem?.poId;
                                    try {
                                        const res = await fetch(`http://localhost:5000/api/supplier-replenishment/requests/${targetId}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success) {
                                            setDeliveriesList(prev => prev.filter(i => (i.id || i._id || i.poId) !== targetId));
                                            setToastMsg('Order record permanently deleted! 🗑️');
                                            setTimeout(() => setToastMsg(''), 3000);
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

