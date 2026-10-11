import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle2, Clock, PackageCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ReplenishmentRequestsPage.css';

export default function ReplenishmentRequestsPage({ onNavigate }) {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filterTab, setFilterTab] = useState('active'); // 'active' | 'delivered' | 'all'
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { cleanPo, targetId }

    const fetchRequests = async () => {
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `http://localhost:5000/api/supplier-replenishment/requests?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.requests)) {
                setRequests(data.requests);
            }
        } catch (err) {
            console.error('Error fetching replenishment requests:', err.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchRequests();
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('home');
        }
    };

    const handleCardClick = (po) => {
        if (onNavigate) {
            onNavigate('request_details', { po });
        }
    };

    const activeRequests = requests.filter(r => r.status !== 'Delivered');
    const deliveredRequests = requests.filter(r => r.status === 'Delivered');

    const displayedRequests = requests.filter(r => {
        if (filterTab === 'active') return r.status !== 'Delivered';
        if (filterTab === 'delivered') return r.status === 'Delivered';
        return true;
    });

    return (
        <div className="replenish-req-container">
            {/* 🔝 Top Fixed Header Section */}
            <div className="replenish-req-header-section">
                {/* Header Title Row */}
                <div className="replenish-req-title-row">
                    <h1 className="replenish-req-page-title" style={{ margin: 0 }}>Replenishment Requests</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleRefresh}
                            style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Refresh requests"
                        >
                            <RefreshCw size={18} color="#475569" className={isRefreshing ? 'spin-animate' : ''} />
                        </button>
                        <button
                            className="replenish-req-back-btn"
                            onClick={handleBack}
                            aria-label="Back to dashboard"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={18} color="#1E293B" />
                        </button>
                    </div>
                </div>

                {/* Status Filter Tabs (Active Orders vs Delivered History) */}
                <div style={{
                    display: 'flex',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '12px',
                    padding: '4px',
                    gap: '4px'
                }}>
                    <button
                        type="button"
                        onClick={() => setFilterTab('active')}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: filterTab === 'active' ? '#FFFFFF' : 'transparent',
                            color: filterTab === 'active' ? '#15803D' : '#64748B',
                            boxShadow: filterTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <Clock size={13} color={filterTab === 'active' ? '#15803D' : '#64748B'} />
                        Active ({activeRequests.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('delivered')}
                        style={{
                            flex: 1.2,
                            padding: '8px 4px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: filterTab === 'delivered' ? '#FFFFFF' : 'transparent',
                            color: filterTab === 'delivered' ? '#2563EB' : '#64748B',
                            boxShadow: filterTab === 'delivered' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <PackageCheck size={13} color={filterTab === 'delivered' ? '#2563EB' : '#64748B'} />
                        Delivered ({deliveredRequests.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('all')}
                        style={{
                            flex: 0.8,
                            padding: '8px 4px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: filterTab === 'all' ? '#FFFFFF' : 'transparent',
                            color: filterTab === 'all' ? '#1E293B' : '#64748B',
                            boxShadow: filterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        All ({requests.length})
                    </button>
                </div>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="replenish-req-scrollable-body">
                {/* Requests Cards Stack matching screenshot */}
                <div className="replenish-req-cards-list">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                            Loading requests from MongoDB...
                        </div>
                    ) : displayedRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                            {filterTab === 'active' ? 'No active replenishment orders pending.' : 'No delivered order history found.'}
                        </div>
                    ) : (
                        displayedRequests.map(req => {
                            const isDelivered = req.status === 'Delivered';
                            const displayPoId = req.poId || req.id || 'PO-0001';
                            const cleanPo = displayPoId.startsWith('#') ? displayPoId : `#${displayPoId}`;

                            const itemsList = Array.isArray(req.items) && req.items.length > 0
                                ? req.items
                                : (req.itemsSummary ? req.itemsSummary.split(',').map(s => ({ produce: s.trim(), qty: 1 })) : [{ produce: req.product, qty: req.reorderUnits }]);

                            // Remove "Multiple Products" title if actual item names exist
                            let mainTitle = req.product;
                            if (!mainTitle || mainTitle === 'Multiple Products') {
                                mainTitle = itemsList.map(i => i.produce || i.name).join(', ');
                            }

                            const maxVisible = 2;
                            const hasMore = itemsList.length > maxVisible;

                            return (
                                <div
                                    key={req.id || req._id}
                                    className={`replenish-req-card-item ${req.highlight ? 'highlight' : ''}`}
                                    onClick={() => handleCardClick(req)}
                                    style={{
                                        borderLeft: isDelivered ? '4px solid #166534' : '4px solid #2563EB',
                                        opacity: isDelivered ? 0.9 : 1,
                                        cursor: 'pointer',
                                        padding: '16px',
                                        borderRadius: '16px',
                                        backgroundColor: '#FFFFFF',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        marginBottom: '12px',
                                        border: '1px solid #E2E8F0'
                                    }}
                                >
                                    {/* Top Header Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3 className="replenish-req-store-name" style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                                                {req.store}
                                            </h3>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                color: '#1E293B',
                                                backgroundColor: '#F1F5F9',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid #CBD5E1',
                                                letterSpacing: '0.3px'
                                            }}>
                                                {cleanPo}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            backgroundColor: isDelivered ? '#DCFCE7' : '#FEF3C7',
                                            color: isDelivered ? '#166534' : '#B45309',
                                            border: `1px solid ${isDelivered ? '#86EFAC' : '#FDE68A'}`,
                                            flexShrink: 0
                                        }}>
                                            {req.status}
                                        </span>
                                    </div>

                                    {/* Items Breakdown Container */}
                                    <div style={{
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: '12px',
                                        padding: '10px 12px',
                                        border: '1px solid #F1F5F9',
                                        margin: '8px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Requested Items ({itemsList.length})
                                        </div>

                                        {itemsList.slice(0, maxVisible).map((it, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ color: '#166534', fontWeight: '900' }}>•</span>
                                                    {it.produce || it.name}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#15803D', fontWeight: '800', backgroundColor: '#DCFCE7', padding: '1px 8px', borderRadius: '6px' }}>
                                                    {it.qty || 1} {it.unit || 'pack'}s
                                                </span>
                                            </div>
                                        ))}

                                        {hasMore && (
                                            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#2563EB', paddingTop: '4px', borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                + {itemsList.length - maxVisible} more product(s) in this PO • Click to view details
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Metadata Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                                        <span>
                                            Current stock: <strong style={{ color: '#E11D48' }}>{req.unitsLeft} units</strong>
                                        </span>
                                        <span style={{ backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '6px', color: '#334155', fontWeight: '700' }}>
                                            Reorder: {req.reorderUnits} Units
                                        </span>
                                    </div>

                                    {isDelivered && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const targetId = req._id || req.id || req.poId;
                                                    setDeleteConfirm({ cleanPo, targetId });
                                                }}
                                                style={{
                                                    backgroundColor: '#FEF2F2',
                                                    color: '#DC2626',
                                                    border: '1px solid #FCA5A5',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '11.5px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Trash2 size={13} color="#DC2626" /> Delete Order Record
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            <div className="replenish-req-actions-group">
                <button
                    className="replenish-req-view-all-btn"
                    onClick={handleBack}
                >
                    Return to Supplier Dashboard
                </button>
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
                            This will permanently remove <strong style={{ color: '#0F172A' }}>{deleteConfirm.cleanPo}</strong> from the database. This cannot be undone.
                        </p>
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
                                            setRequests(prev => prev.filter(r => (r._id || r.id || r.poId) !== targetId));
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
