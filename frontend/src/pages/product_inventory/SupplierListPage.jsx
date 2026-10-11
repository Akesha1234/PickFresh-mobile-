import React, { useState, useEffect, useRef } from 'react';
import { Package, Check, Plus, Trash2, X, Phone, Mail, Loader2, Store, ArrowLeft, MapPin, Globe, Truck, Clock, Thermometer, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle, PackageCheck, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Layers, Tag, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './SupplierListPage.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';

let globalSuppliersCache = null;
let globalLiveDeliveriesCache = null;

export default function SupplierListPage({ onNavigate }) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliers, setSuppliers] = useState(globalSuppliersCache || []);
    const [isLoading, setIsLoading] = useState(!globalSuppliersCache);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my_store' | 'tracking'
    const [activeProductsModalSupplier, setActiveProductsModalSupplier] = useState(null);
    const [liveDeliveries, setLiveDeliveries] = useState(globalLiveDeliveriesCache || []);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [liveFilter, setLiveFilter] = useState('active'); // 'active' | 'completed'
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { poNum, targetId }
    const [openCategoryDropdownSupId, setOpenCategoryDropdownSupId] = useState(null);
    const [modalCategoryFilter, setModalCategoryFilter] = useState('All');
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    const modalCatBarRef = useRef(null);
    const scrollModalCatBar = (direction) => {
        if (modalCatBarRef.current) {
            const scrollAmount = direction === 'left' ? -130 : 130;
            modalCatBarRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const getCategoryIcon = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('dairy') || cat.includes('egg') || cat.includes('milk') || cat.includes('cheese')) return '🥛';
        if (cat.includes('drink') || cat.includes('beverage') || cat.includes('juice') || cat.includes('soda') || cat.includes('water')) return '🥤';
        if (cat.includes('fruit')) return '🍎';
        if (cat.includes('veg')) return '🥦';
        if (cat.includes('snack') || cat.includes('biscuit') || cat.includes('chip') || cat.includes('nut')) return '🍿';
        if (cat.includes('meat') || cat.includes('seafood') || cat.includes('fish') || cat.includes('chicken')) return '🥩';
        if (cat.includes('health') || cat.includes('beauty') || cat.includes('personal') || cat.includes('soap')) return '🧴';
        if (cat.includes('house') || cat.includes('clean') || cat.includes('essential')) return '🧼';
        if (cat.includes('bakery') || cat.includes('bread')) return '🍞';
        if (cat.includes('grain') || cat.includes('rice') || cat.includes('flour') || cat.includes('oil')) return '🌾';
        return '📦';
    };

    // Fetch Live Supplier Deliveries for THIS logged-in store from MongoDB Atlas
    const fetchLiveDeliveries = async () => {
        if (!globalLiveDeliveriesCache) setTrackingLoading(true);
        try {
            const storeEmail = user?.email || '';
            const storeName = user?.shopName || user?.name || '';
            const queryParams = new URLSearchParams();
            if (storeEmail) queryParams.append('storeEmail', storeEmail);
            if (storeName) queryParams.append('storeName', storeName);

            const res = await fetch(`http://localhost:5000/api/supplier-replenishment/delivery-tracking?${queryParams.toString()}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.deliveries)) {
                globalLiveDeliveriesCache = data.deliveries;
                setLiveDeliveries(data.deliveries);
            } else if (data.delivery) {
                globalLiveDeliveriesCache = [data.delivery];
                setLiveDeliveries([data.delivery]);
            } else {
                globalLiveDeliveriesCache = [];
                setLiveDeliveries([]);
            }
        } catch (err) {
            console.warn('Failed to fetch live deliveries:', err.message);
            setLiveDeliveries([]);
        } finally {
            setTrackingLoading(false);
        }
    };

    // Fetch Suppliers from MongoDB Atlas
    const fetchSuppliers = async () => {
        if (!globalSuppliersCache) setIsLoading(true);
        try {
            const storeEmail = user?.email || '';
            const endpoint = `${API_BASE_URL}/suppliers?storeEmail=${encodeURIComponent(storeEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.suppliers)) {
                globalSuppliersCache = data.suppliers;
                setSuppliers(data.suppliers);
            }
        } catch (err) {
            console.warn('Failed to fetch suppliers:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchLiveDeliveries();
    }, [user?.email, user?.shopName, user?.name]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'tracking') {
            fetchLiveDeliveries();
        }
    };

    // Helper for robust link check — uses backend-provided flag OR local linkedStores fallback
    const isSupplierLinkedToUser = (supplier) => {
        // Backend now provides isLinkedToCurrentStore annotated per shop owner
        if (supplier.isLinkedToCurrentStore === true) return true;
        // Local optimistic fallback after toggle
        const userEmail = (user?.email || '').toLowerCase().trim();
        if (!userEmail) return false;
        const stores = Array.isArray(supplier.linkedStores)
            ? supplier.linkedStores.map(s => (typeof s === 'string' ? s : (s.email || s.storeEmail || '')).toLowerCase().trim())
            : [];
        return stores.includes(userEmail);
    };

    // Toggle Link/Unlink Supplier to Shop Owner's Store
    const handleToggleLinkSupplier = async (e, supplier) => {
        e.stopPropagation();
        const userEmail = (user?.email || '').toLowerCase().trim();
        if (!userEmail) return;

        const isLinked = isSupplierLinkedToUser(supplier);
        const currentStores = Array.isArray(supplier.linkedStores) ? supplier.linkedStores : [];

        const updatedLinks = isLinked
            ? currentStores.filter(s => (typeof s === 'string' ? s : (s.email || s.storeEmail || '')).toLowerCase().trim() !== userEmail)
            : [...currentStores, userEmail];

        const targetId = supplier._id || supplier.id;

        // Optimistic UI update
        setSuppliers(prev => prev.map(s => (s._id === targetId || s.id === targetId) ? {
            ...s,
            linkedStores: updatedLinks,
            isLinkedToCurrentStore: !isLinked
        } : s));

        try {
            const res = await fetch(`${API_BASE_URL}/suppliers/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkedStores: updatedLinks })
            });
            const data = await res.json();
            if (data.success) {
                // Background refresh to confirm DB sync
                fetchSuppliers();
            }
        } catch (err) {
            console.error('Failed to update store link in backend:', err.message);
        }
    };

    // Filter suppliers by Search and Selected Tab
    const myStoreCount = suppliers.filter(s => isSupplierLinkedToUser(s)).length;

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.phone && s.phone.includes(searchTerm));

        if (!matchesSearch) return false;

        if (activeTab === 'my_store') {
            return isSupplierLinkedToUser(s);
        }
        return true;
    });

    // Build unique categories list for the active products modal
    const modalCategories = ['All'];
    if (activeProductsModalSupplier) {
        if (Array.isArray(activeProductsModalSupplier.suppliedProductsFull)) {
            activeProductsModalSupplier.suppliedProductsFull.forEach(p => {
                const cat = (p.category || '').trim();
                if (cat && !modalCategories.some(c => c.toLowerCase() === cat.toLowerCase())) {
                    modalCategories.push(cat);
                }
            });
        }
        if (Array.isArray(activeProductsModalSupplier.supplyCategories)) {
            activeProductsModalSupplier.supplyCategories.forEach(c => {
                const cat = (c || '').trim();
                if (cat && !modalCategories.some(existing => existing.toLowerCase() === cat.toLowerCase())) {
                    modalCategories.push(cat);
                }
            });
        }
    }

    return (
        <div className="pi-supplier-container">
            {/* Header Title with Back Arrow to Home */}
            <div className="pi-supplier-title-row" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="pi-supplier-page-title" style={{ margin: 0 }}>Suppliers & Deliveries</h1>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Manage directory & track live replenishment shipments</p>
                </div>
                <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('dashboard')}
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
                    title="Go to Home"
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </button>
            </div>

            {/* Filter Tabs: All Suppliers vs My Store Suppliers vs Live Delivery Tracking */}
            <div style={{
                display: 'flex',
                backgroundColor: '#F1F5F9',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '12px',
                gap: '4px'
            }}>
                <button
                    type="button"
                    onClick={() => handleTabChange('all')}
                    style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: activeTab === 'all' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'all' ? '#1E293B' : '#64748B',
                        boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    All ({suppliers.length})
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('my_store')}
                    style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: activeTab === 'my_store' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'my_store' ? '#15803D' : '#64748B',
                        boxShadow: activeTab === 'my_store' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    <Store size={13} color={activeTab === 'my_store' ? '#15803D' : '#64748B'} />
                    My Store ({myStoreCount})
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('tracking')}
                    style={{
                        flex: 1.2,
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: activeTab === 'tracking' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'tracking' ? '#2563EB' : '#64748B',
                        boxShadow: activeTab === 'tracking' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    <Truck size={13} color={activeTab === 'tracking' ? '#2563EB' : '#64748B'} />
                    Live Tracking
                </button>
            </div>

            {/* Search Input Box for Suppliers tabs */}
            {activeTab !== 'tracking' && (
                <div className="pi-supplier-search-wrapper" style={{ marginBottom: '14px' }}>
                    <input
                        type="text"
                        placeholder="Search suppliers by name, category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pi-supplier-search-input"
                    />
                </div>
            )}

            {/* Live Tracking View */}
            {activeTab === 'tracking' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Header Row: Title & Clean Sync Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>Live Shipments</h4>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>Track supplier deliveries in real time</span>
                        </div>
                        <button
                            type="button"
                            onClick={fetchLiveDeliveries}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '10px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#166534',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            title="Refresh delivery status"
                        >
                            <RefreshCw size={13} className={trackingLoading ? 'spinner-icon' : ''} /> Refresh
                        </button>
                    </div>

                    {/* Filter Tabs inside Live Tracking */}
                    {(() => {
                        const activeLiveDeliveries = liveDeliveries.filter(d => d.status !== 'Delivered');
                        const completedLiveDeliveries = liveDeliveries.filter(d => d.status === 'Delivered');
                        const displayList = liveFilter === 'active' ? activeLiveDeliveries : completedLiveDeliveries;

                        return (
                            <>
                                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setLiveFilter('active')}
                                        style={{
                                            flex: 1,
                                            padding: '8px 4px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            backgroundColor: liveFilter === 'active' ? '#FFFFFF' : 'transparent',
                                            color: liveFilter === 'active' ? '#15803D' : '#64748B',
                                            boxShadow: liveFilter === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Clock size={13} color={liveFilter === 'active' ? '#15803D' : '#64748B'} />
                                        Active ({activeLiveDeliveries.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLiveFilter('completed')}
                                        style={{
                                            flex: 1,
                                            padding: '8px 4px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            backgroundColor: liveFilter === 'completed' ? '#FFFFFF' : 'transparent',
                                            color: liveFilter === 'completed' ? '#2563EB' : '#64748B',
                                            boxShadow: liveFilter === 'completed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <PackageCheck size={13} color={liveFilter === 'completed' ? '#2563EB' : '#64748B'} />
                                        Completed ({completedLiveDeliveries.length})
                                    </button>
                                </div>

                                {trackingLoading && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Loader2 size={16} className="spinner-icon" /> Updating live tracking...
                                    </div>
                                )}

                                {!trackingLoading && displayList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px 16px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B' }}>
                                        <Truck size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>
                                            {liveFilter === 'active' ? 'No Active Deliveries' : 'No Completed History'}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '12px' }}>
                                            {liveFilter === 'active' ? 'Active shipments from your suppliers will appear here.' : 'Delivered shipments will appear here.'}
                                        </p>
                                    </div>
                                ) : (
                                    !trackingLoading && displayList.map((del, idx) => {
                                        const rawPo = del.poId || del.id || del._id || 'PO-1331';
                                        const poNum = rawPo.startsWith('#') ? rawPo : `#${rawPo}`;
                                        const status = del.status || 'Dispatched';
                                        const isDone = status === 'Delivered';

                                        return (
                                            <div
                                                key={del._id || idx}
                                                onClick={() => onNavigate && onNavigate('delivery_tracking', { po: del })}
                                                style={{
                                                    backgroundColor: '#FFFFFF',
                                                    borderRadius: '16px',
                                                    border: '1px solid #E2E8F0',
                                                    padding: '16px',
                                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '10px'
                                                }}
                                            >
                                                {/* Header Row: PO Badge + Status Badge */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '8px', textTransform: 'uppercase' }}>
                                                        {poNum}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        backgroundColor: isDone ? '#DCFCE7' : '#EFF6FF',
                                                        color: isDone ? '#166534' : '#1D4ED8',
                                                        border: `1px solid ${isDone ? '#86EFAC' : '#BFDBFE'}`
                                                    }}>
                                                        {status}
                                                    </span>
                                                </div>

                                                {/* Supplier Name & Destination */}
                                                <div>
                                                    <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                                                        {del.supplierName || 'Lanka Mega Wholesale Distributors'}
                                                    </h3>
                                                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                                                        Destination: <strong>{del.storeName || user?.shopName || 'GroceryMart'}</strong>
                                                    </span>
                                                </div>

                                                {/* Clean Compact Details Pill Row */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                                                        <Truck size={14} color="#166534" />
                                                        <span><strong>Status:</strong> {status}</span>
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#B45309', backgroundColor: '#FEF9C3', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={13} color="#D97706" /> ETA: {del.etaMinutes ? `${del.etaMinutes} mins` : '24 mins'}
                                                    </span>
                                                </div>

                                                {/* Ordered Products Preview Section */}
                                                {del.items && del.items.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                                                        {del.items.map((it, iIdx) => {
                                                            const itName = it.produce || it.name || 'Product';
                                                            const itImg = it.image || it.imageUrl || '';
                                                            const itRate = Number(it.wholesaleRate || it.wholesalePrice || it.price || 0);
                                                            const itQty = it.qty || 1;
                                                            const itUnit = it.unit || 'pack';
                                                            const itSub = it.subtotal || (itRate * itQty);
                                                            return (
                                                                <div key={iIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F1F5F9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            {itImg ? (
                                                                                <img src={itImg} alt={itName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            ) : (
                                                                                <Package size={18} color="#166534" />
                                                                            )}
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                            <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.2' }}>{itName}</span>
                                                                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Wholesale: Rs. {itRate.toLocaleString()}/{itUnit}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '6px' }}>{itQty} {itUnit}s</span>
                                                                        <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#0F172A' }}>Rs. {itSub.toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {del.totalAmount && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FEF9C3', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: '10px', marginTop: '2px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#854D0E' }}>Order Total Value</span>
                                                                <span style={{ fontSize: '13px', fontWeight: '900', color: '#854D0E' }}>Rs. {del.totalAmount.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Bar: View Tracking + Delete Order Record Option */}
                                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                    <div style={{
                                                        flex: 1,
                                                        backgroundColor: '#166534',
                                                        color: '#FFFFFF',
                                                        padding: '10px',
                                                        borderRadius: '12px',
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <span>View Live Timeline</span> <ChevronRight size={16} />
                                                    </div>

                                                    {isDone && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const targetId = del._id || del.id || del.poId || rawPo;
                                                                setDeleteConfirm({ poNum, targetId });
                                                            }}
                                                            style={{
                                                                backgroundColor: '#FEF2F2',
                                                                color: '#DC2626',
                                                                border: '1px solid #FCA5A5',
                                                                padding: '10px 14px',
                                                                borderRadius: '12px',
                                                                fontSize: '12px',
                                                                fontWeight: '800',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '4px',
                                                                flexShrink: 0
                                                            }}
                                                            title="Delete Order Record"
                                                        >
                                                            <Trash2 size={15} color="#DC2626" /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Loading Indicator */}
            {isLoading && activeTab !== 'tracking' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '8px', color: '#64748B' }}>
                    <Loader2 size={20} className="spinner-icon" />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Loading suppliers...</span>
                </div>
            )}

            {/* Supplier Cards Stack */}
            {activeTab !== 'tracking' && (
                <div className="pi-supplier-cards-stack">
                    {!isLoading && filteredSuppliers.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '32px 16px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            color: '#64748B'
                        }}>
                            <Store size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>
                                {activeTab === 'my_store' ? 'No Suppliers Linked Yet' : 'No Suppliers Found'}
                            </h4>
                            <p style={{ margin: 0, fontSize: '12px' }}>
                                {activeTab === 'my_store'
                                    ? 'Switch to "All Suppliers" tab and click "+ Add to My Store" to add suppliers to your store.'
                                    : 'Try searching for another supplier or add a new supplier.'}
                            </p>
                        </div>
                    ) : (
                        filteredSuppliers.map(supplier => {
                            const supId = supplier._id || supplier.id;
                            const isLinked = isSupplierLinkedToUser(supplier);
                            const productsList = supplier.suppliedProducts || [];

                            // Extract and format category list
                            const allCategories = Array.isArray(supplier.supplyCategories) && supplier.supplyCategories.length > 0
                                ? supplier.supplyCategories
                                : (supplier.category ? supplier.category.split(',').map(s => s.trim()).filter(Boolean) : ['General Wholesale']);

                            const displayCategories = allCategories.slice(0, 2);
                            const extraCategoriesCount = allCategories.length - 2;

                            return (
                                <div
                                    key={supId}
                                    className={`pi-supplier-card-item ${isLinked ? 'selected' : ''}`}
                                    style={{
                                        border: isLinked ? '1.5px solid #166534' : '1px solid #E2E8F0',
                                        backgroundColor: isLinked ? '#F0FDF4' : '#FFFFFF',
                                        borderRadius: '18px',
                                        padding: '16px',
                                        boxShadow: isLinked ? '0 4px 16px rgba(22, 101, 52, 0.08)' : '0 2px 8px rgba(15, 23, 42, 0.03)',
                                        transition: 'all 0.2s ease',
                                        marginBottom: '4px'
                                    }}
                                >
                                    {/* Top Row: Title + Status Badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 className="pi-supplier-item-title" style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' }}>
                                                {supplier.name}
                                            </h3>
                                            <p className="pi-supplier-item-sub" style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={13} color="#166534" /> <span>{supplier.phone || '077 000 0000'}</span>
                                            </p>
                                        </div>

                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            backgroundColor: isLinked ? '#DCFCE7' : '#F1F5F9',
                                            color: isLinked ? '#15803D' : '#475569',
                                            border: `1px solid ${isLinked ? '#86EFAC' : '#E2E8F0'}`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            flexShrink: 0
                                        }}>
                                            {isLinked ? (
                                                <>
                                                    <CheckCircle2 size={12} color="#15803D" /> Linked to Store
                                                </>
                                            ) : (
                                                supplier.status || 'Verified'
                                            )}
                                        </span>
                                    </div>

                                    {/* Middle Row: Clean Category Badges & Region Tag */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: openCategoryDropdownSupId === supId ? '8px' : '14px' }}>
                                        {displayCategories.map((catItem, cIdx) => (
                                            <span key={cIdx} style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                backgroundColor: '#F8FAFC',
                                                color: '#334155',
                                                border: '1px solid #E2E8F0',
                                                padding: '3px 9px',
                                                borderRadius: '8px'
                                            }}>
                                                {catItem}
                                            </span>
                                        ))}

                                        {/* Dropdown Toggle for all Categories */}
                                        {extraCategoriesCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenCategoryDropdownSupId(prev => prev === supId ? null : supId);
                                                }}
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    backgroundColor: openCategoryDropdownSupId === supId ? '#DBEAFE' : '#EFF6FF',
                                                    color: '#1D4ED8',
                                                    border: '1px solid #BFDBFE',
                                                    padding: '3px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="View all categories in dropdown"
                                            >
                                                <span>+{extraCategoriesCount} more</span>
                                                {openCategoryDropdownSupId === supId ? (
                                                    <ChevronUp size={12} color="#1D4ED8" />
                                                ) : (
                                                    <ChevronDown size={12} color="#1D4ED8" />
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenCategoryDropdownSupId(prev => prev === supId ? null : supId);
                                                }}
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    backgroundColor: openCategoryDropdownSupId === supId ? '#F1F5F9' : '#F8FAFC',
                                                    color: '#475569',
                                                    border: '1px solid #E2E8F0',
                                                    padding: '3px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}
                                                title="View categories"
                                            >
                                                <span>Categories ({allCategories.length})</span>
                                                {openCategoryDropdownSupId === supId ? (
                                                    <ChevronUp size={12} color="#475569" />
                                                ) : (
                                                    <ChevronDown size={12} color="#475569" />
                                                )}
                                            </button>
                                        )}

                                        {/* Region Tag */}
                                        {supplier.region && supplier.region.includes('Islandwide') ? (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                backgroundColor: '#ECFDF5',
                                                color: '#047857',
                                                border: '1px solid #A7F3D0',
                                                padding: '3px 9px',
                                                borderRadius: '8px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <Globe size={11} color="#047857" /> Islandwide
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                backgroundColor: '#F8FAFC',
                                                color: '#64748B',
                                                border: '1px solid #E2E8F0',
                                                padding: '3px 9px',
                                                borderRadius: '8px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <MapPin size={11} color="#166534" /> {supplier.region || 'Colombo 03'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Expandable Category Dropdown Sheet */}
                                    {openCategoryDropdownSupId === supId && (
                                        <div style={{
                                            margin: '4px 0 14px',
                                            backgroundColor: '#F8FAFC',
                                            border: '1.5px solid #CBD5E1',
                                            borderRadius: '14px',
                                            padding: '12px',
                                            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Layers size={13} color="#166534" />
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                                                        All Supply Categories ({allCategories.length})
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenCategoryDropdownSupId(null);
                                                    }}
                                                    style={{
                                                        background: '#E2E8F0',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: '#475569'
                                                    }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {allCategories.map((cat, cIdx) => {
                                                    const count = supplier.categoryCounts && supplier.categoryCounts[cat];
                                                    return (
                                                        <div
                                                            key={cIdx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setModalSearchTerm('');
                                                                setModalCategoryFilter(cat);
                                                                setActiveProductsModalSupplier(supplier);
                                                            }}
                                                            style={{
                                                                backgroundColor: '#FFFFFF',
                                                                border: '1px solid #CBD5E1',
                                                                borderRadius: '8px',
                                                                padding: '4px 9px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                color: '#1E293B',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                            }}
                                                            title={`Click to view products in ${cat}`}
                                                        >
                                                            <span>{cat}</span>
                                                            {count ? (
                                                                <span style={{
                                                                    backgroundColor: '#DCFCE7',
                                                                    color: '#166534',
                                                                    fontSize: '10px',
                                                                    fontWeight: '800',
                                                                    padding: '1px 5px',
                                                                    borderRadius: '6px'
                                                                }}>
                                                                    {count}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>💡 Tap any category to inspect products in this supplier's catalog.</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Bar: View Products & Link Action */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingTop: '12px',
                                        borderTop: '1px solid #E2E8F0',
                                        gap: '8px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setModalSearchTerm('');
                                                setModalCategoryFilter('All');
                                                setActiveProductsModalSupplier(supplier);
                                            }}
                                            style={{
                                                background: '#F1F5F9',
                                                color: '#334155',
                                                border: '1px solid #CBD5E1',
                                                padding: '8px 14px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Package size={14} color="#166534" />
                                            <span>Products ({supplier.catalogCount !== undefined ? supplier.catalogCount : productsList.length})</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => handleToggleLinkSupplier(e, supplier)}
                                            style={{
                                                background: isLinked ? '#FEF2F2' : '#166534',
                                                color: isLinked ? '#991B1B' : '#FFFFFF',
                                                border: isLinked ? '1px solid #FECACA' : 'none',
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                boxShadow: isLinked ? 'none' : '0 2px 6px rgba(22, 101, 52, 0.2)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {isLinked ? (
                                                <>
                                                    <Trash2 size={14} color="#991B1B" />
                                                    <span>Remove from Store</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={15} color="#FFFFFF" />
                                                    <span>Add to My Store</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Bottom spacer so all supplier cards scroll comfortably above bottom nav bar */}
            <div style={{ height: '40px', minHeight: '40px', width: '100%', flexShrink: 0 }} />

            {/* Supplied Products Inspector Modal */}
            {activeProductsModalSupplier && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '28px 12px 34px 12px'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '365px',
                        maxHeight: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        animation: 'modalZoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '14px 16px 12px',
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: '#FFFFFF',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                        <span style={{
                                            fontSize: '10.5px',
                                            fontWeight: '800',
                                            color: '#15803D',
                                            backgroundColor: '#DCFCE7',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}>
                                            <ShieldCheck size={12} color="#15803D" /> Verified Catalog
                                        </span>
                                    </div>
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: '800',
                                        color: '#0F172A',
                                        margin: 0,
                                        lineHeight: '1.25',
                                        wordBreak: 'break-word'
                                    }}>
                                        {activeProductsModalSupplier.name}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '11px', color: '#64748B' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <MapPin size={11} color="#64748B" /> {activeProductsModalSupplier.region || 'Islandwide'}
                                        </span>
                                        <span>•</span>
                                        <span style={{ fontWeight: '700', color: '#15803D' }}>
                                            {activeProductsModalSupplier.catalogCount !== undefined ? activeProductsModalSupplier.catalogCount : (activeProductsModalSupplier.suppliedProductsFull?.length || activeProductsModalSupplier.suppliedProducts?.length || 0)} Catalog Products
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveProductsModalSupplier(null);
                                        setModalSearchTerm('');
                                        setModalCategoryFilter('All');
                                    }}
                                    style={{
                                        background: '#F1F5F9',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '30px',
                                        height: '30px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748B',
                                        flexShrink: 0
                                    }}
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Contact Pills */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {activeProductsModalSupplier.phone && (
                                    <a
                                        href={`tel:${activeProductsModalSupplier.phone}`}
                                        style={{
                                            fontSize: '10.5px',
                                            fontWeight: '700',
                                            color: '#166534',
                                            backgroundColor: '#F0FDF4',
                                            border: '1px solid #BBF7D0',
                                            padding: '3px 8px',
                                            borderRadius: '7px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <Phone size={10} color="#166534" /> {activeProductsModalSupplier.phone}
                                    </a>
                                )}
                                {activeProductsModalSupplier.email && (
                                    <a
                                        href={`mailto:${activeProductsModalSupplier.email}`}
                                        style={{
                                            fontSize: '10.5px',
                                            fontWeight: '700',
                                            color: '#1D4ED8',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            padding: '3px 8px',
                                            borderRadius: '7px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            textDecoration: 'none',
                                            maxWidth: '200px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <Mail size={10} color="#1D4ED8" /> {activeProductsModalSupplier.email}
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Search & Category Filter Controls matching Image 3 */}
                        <div style={{
                            padding: '10px 14px 8px',
                            backgroundColor: '#FFFFFF',
                            borderBottom: '1px solid #F1F5F9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {/* Search Input Bar */}
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search
                                    size={14}
                                    color="#94A3B8"
                                    style={{
                                        position: 'absolute',
                                        left: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)'
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search products in this catalog..."
                                    value={modalSearchTerm}
                                    onChange={(e) => setModalSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '7px 30px 7px 30px',
                                        borderRadius: '10px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '12px',
                                        color: '#1E293B',
                                        outline: 'none',
                                        backgroundColor: '#F8FAFC',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {modalSearchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setModalSearchTerm('')}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#94A3B8',
                                            cursor: 'pointer',
                                            padding: 0,
                                            display: 'flex'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills Bar with Scroll Controls matching Image 3 */}
                            <div className="pi-modal-cat-wrapper">
                                <button
                                    type="button"
                                    className="pi-modal-scroll-arrow"
                                    onClick={() => scrollModalCatBar('left')}
                                    aria-label="Scroll categories left"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="pi-modal-cat-bar" ref={modalCatBarRef}>
                                    {modalCategories.map(catName => {
                                        if (!catName) return null;
                                        const isActive = modalCategoryFilter.toLowerCase() === catName.toLowerCase();
                                        return (
                                            <button
                                                key={catName}
                                                type="button"
                                                className={`pi-modal-cat-pill ${isActive ? 'active' : ''}`}
                                                onClick={() => setModalCategoryFilter(catName)}
                                            >
                                                {catName}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="pi-modal-scroll-arrow"
                                    onClick={() => scrollModalCatBar('right')}
                                    aria-label="Scroll categories right"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Product List Body */}
                        <div style={{
                            padding: '12px 14px',
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            backgroundColor: '#F8FAFC'
                        }}>
                            {(() => {
                                let fullList = activeProductsModalSupplier.suppliedProductsFull || [];
                                let nameList = activeProductsModalSupplier.suppliedProducts || [];

                                // Apply category filter with normalized comparison
                                if (modalCategoryFilter && modalCategoryFilter.toLowerCase() !== 'all') {
                                    const targetCat = modalCategoryFilter.trim().toLowerCase();
                                    fullList = fullList.filter(item => {
                                        const itemCat = (item.category || '').trim().toLowerCase();
                                        return itemCat === targetCat || itemCat.includes(targetCat) || targetCat.includes(itemCat);
                                    });
                                }

                                // Apply search filter
                                if (modalSearchTerm.trim()) {
                                    const term = modalSearchTerm.toLowerCase();
                                    fullList = fullList.filter(item => (item.name || '').toLowerCase().includes(term) || (item.category || '').toLowerCase().includes(term));
                                    nameList = nameList.filter(prod => {
                                        const pName = typeof prod === 'string' ? prod : prod.name;
                                        return (pName || '').toLowerCase().includes(term);
                                    });
                                }

                                if (fullList.length > 0) {
                                    return (
                                        <>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'flex', justifyContent: 'space-between', padding: '0 2px 2px' }}>
                                                <span>Products ({fullList.length})</span>
                                                <span>Wholesale Price & MOQ</span>
                                            </div>
                                            {fullList.map((item, idx) => (
                                                <div
                                                    key={item._id || idx}
                                                    style={{
                                                        padding: '10px 12px',
                                                        backgroundColor: '#FFFFFF',
                                                        borderRadius: '14px',
                                                        border: '1px solid #E2E8F0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                                                    }}
                                                >
                                                    {/* Product Thumbnail */}
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#F8FAFC',
                                                        border: '1px solid #E2E8F0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        flexShrink: 0
                                                    }}>
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            />
                                                        ) : (
                                                            <span style={{ fontSize: '20px' }}>{getCategoryIcon(item.category)}</span>
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                            <span style={{
                                                                fontSize: '13px',
                                                                fontWeight: '800',
                                                                color: '#0F172A',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {item.category && (
                                                                <span style={{
                                                                    fontSize: '9.5px',
                                                                    fontWeight: '700',
                                                                    color: '#047857',
                                                                    backgroundColor: '#ECFDF5',
                                                                    padding: '1px 5px',
                                                                    borderRadius: '5px'
                                                                }}>
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                                                                Min: {item.minOrderQty || 1} {item.unit || 'unit'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Price & Status */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: '800',
                                                            backgroundColor: item.status === 'Available' ? '#DCFCE7' : '#FEE2E2',
                                                            color: item.status === 'Available' ? '#166534' : '#991B1B',
                                                            padding: '2px 7px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            {item.status || 'Available'}
                                                        </span>
                                                        <span style={{ color: '#166534', fontWeight: '900', fontSize: '13.5px' }}>
                                                            Rs. {Number(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    );
                                } else if (nameList.length > 0 && modalCategoryFilter === 'All' && !modalSearchTerm) {
                                    return nameList.map((prod, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '10px 12px',
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: '12px',
                                                border: '1px solid #E2E8F0',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                color: '#334155',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            <span style={{ fontSize: '18px' }}>📦</span>
                                            <span>{typeof prod === 'string' ? prod : prod.name}</span>
                                        </div>
                                    ));
                                } else {
                                    return (
                                        <div style={{
                                            padding: '32px 16px',
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                backgroundColor: '#F1F5F9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '22px'
                                            }}>
                                                🔍
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                                                No matching products found
                                            </span>
                                            <span style={{ fontSize: '11.5px', color: '#94A3B8', maxWidth: '240px' }}>
                                                {modalSearchTerm
                                                    ? `No products matching "${modalSearchTerm}" in this category.`
                                                    : `No products currently registered under "${modalCategoryFilter}".`}
                                            </span>
                                            {(modalSearchTerm || modalCategoryFilter !== 'All') && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setModalSearchTerm('');
                                                        setModalCategoryFilter('All');
                                                    }}
                                                    style={{
                                                        marginTop: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        color: '#15803D',
                                                        backgroundColor: '#DCFCE7',
                                                        border: 'none',
                                                        padding: '5px 12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '10px 16px',
                            borderTop: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                                <span>Catalog verified by supplier</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveProductsModalSupplier(null);
                                    setModalSearchTerm('');
                                    setModalCategoryFilter('All');
                                }}
                                style={{
                                    backgroundColor: '#15803D',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: '10px',
                                    fontSize: '12.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Close
                            </button>
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
                        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', animation: 'slideUp 0.25s ease'
                    }}>
                        {/* Icon */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                backgroundColor: '#FEF2F2', border: '2px solid #FCA5A5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Trash2 size={26} color="#DC2626" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                            Delete Order Record?
                        </h3>
                        <p style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                            This will permanently remove <strong style={{ color: '#0F172A' }}>{deleteConfirm.poNum}</strong> from the database. This cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={async () => {
                                    const { targetId } = deleteConfirm;
                                    setDeleteConfirm(null);
                                    try {
                                        const res = await fetch(`http://localhost:5000/api/supplier-replenishment/requests/${targetId}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (data.success) {
                                            setLiveDeliveries(prev => prev.filter(d => (d._id || d.id || d.poId) !== targetId));
                                        }
                                    } catch (err) {
                                        console.error('Delete error:', err);
                                    }
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
                                onClick={() => setDeleteConfirm(null)}
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
