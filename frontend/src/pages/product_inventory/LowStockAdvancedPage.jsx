import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, AlertTriangle, Send, PackageCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './LowStockAdvancedPage.css';

const API_BASE_URL = 'http://localhost:5000/api/product-inventory';

let lowStockCache = null;
const globalPendingRequests = new Map(); // Store item name -> timestamp to allow sending again after a delay

export default function LowStockAdvancedPage({ onNavigate }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(!lowStockCache);
    const [alertItems, setAlertItems] = useState(lowStockCache || []);
    const [fetchError, setFetchError] = useState(false);
    const [sentItems, setSentItems] = useState(new Set());

    // Fetch Live Low Stock Products from MongoDB Atlas in parallel with instant cache
    useEffect(() => {
        let isMounted = true;
        const userEmail = user?.email || user?.storeEmail || '';

        const loadData = async () => {
            if (!lowStockCache) {
                setIsLoading(true);
            }
            setFetchError(false);

            const endpoint = userEmail
                ? `${API_BASE_URL}/products?storeEmail=${encodeURIComponent(userEmail)}`
                : `${API_BASE_URL}/products`;

            const activeStatuses = ['Pending', 'Pending Approval', 'Accepted', 'Approved', 'Shipped', 'Dispatched', 'In Transit', 'Confirmed', 'Packed'];

            try {
                const [prodRes, reqRes] = await Promise.all([
                    fetch(endpoint).catch(() => null),
                    fetch(`${API_BASE_URL}/restock-requests`).catch(() => null)
                ]);

                if (prodRes && isMounted) {
                    const data = await prodRes.json();
                    if (data.success && Array.isArray(data.products)) {
                        const lowStockFiltered = data.products
                            .filter(p => {
                                const stock = p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0);
                                const threshold = p.minStock || p.lowStockThreshold || 10;
                                return stock <= threshold;
                            })
                            .map(p => ({
                                id: p._id,
                                name: p.name,
                                currentStock: p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0),
                                threshold: p.minStock || p.lowStockThreshold || 10,
                                unit: p.unit || 'units',
                                category: p.category || 'Grocery',
                                image: p.image || p.imageUrl || '',
                                supplierName: p.supplierName || 'Central Food City'
                            }));

                        lowStockCache = lowStockFiltered;
                        setAlertItems(lowStockFiltered);
                    } else if (!lowStockCache) {
                        setFetchError(true);
                    }
                }

                if (reqRes && isMounted) {
                    const data = await reqRes.json();
                    if (data.success) {
                        const fetchedNames = new Set();
                        if (Array.isArray(data.requests)) {
                            data.requests.forEach(r => {
                                const statusClean = (r.status || '').trim();
                                if (activeStatuses.some(s => s.toLowerCase() === statusClean.toLowerCase())) {
                                    if (r.supplierName) fetchedNames.add(r.supplierName);
                                    if (r.items && Array.isArray(r.items)) {
                                        r.items.forEach(it => {
                                            const n = it.name || it.produce || it.product;
                                            if (n) fetchedNames.add(n);
                                        });
                                    }
                                }
                            });
                        }
                        if (Array.isArray(data.replenishments)) {
                            data.replenishments.forEach(rep => {
                                const statusClean = (rep.status || '').trim();
                                if (activeStatuses.some(s => s.toLowerCase() === statusClean.toLowerCase())) {
                                    if (rep.supplierName) fetchedNames.add(rep.supplierName);
                                    if (rep.product) fetchedNames.add(rep.product);
                                    if (rep.items && Array.isArray(rep.items)) {
                                        rep.items.forEach(it => {
                                            const n = it.name || it.produce || it.product;
                                            if (n) fetchedNames.add(n);
                                        });
                                    }
                                }
                            });
                        }

                        const now = Date.now();
                        for (const [name, timestamp] of globalPendingRequests.entries()) {
                            if (now - timestamp > 300000) {
                                globalPendingRequests.delete(name);
                            } else {
                                fetchedNames.add(name);
                            }
                        }

                        setSentItems(fetchedNames);
                    }
                }
            } catch (err) {
                console.warn('Low stock load error:', err.message);
                if (!lowStockCache && isMounted) setFetchError(true);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [user?.email]);

    const handleSendRequest = (supplier, items) => {
        if (onNavigate) {
            onNavigate('restock_request', {
                supplierName: supplier,
                items: items,
                onRequestSent: () => {
                    setSentItems(prev => {
                        const newSet = new Set(prev);
                        if (supplier) {
                            newSet.add(supplier);
                            globalPendingRequests.set(supplier, Date.now());
                        }
                        items.forEach(item => {
                            if (item.name) {
                                globalPendingRequests.set(item.name, Date.now());
                                newSet.add(item.name);
                            }
                        });
                        return newSet;
                    });
                }
            });
        }
    };

    const groupedItems = alertItems.reduce((acc, item) => {
        const supplier = item.supplierName || 'Central Food City';
        if (!acc[supplier]) acc[supplier] = [];
        acc[supplier].push(item);
        return acc;
    }, {});

    const handleBackToDashboard = () => {
        if (onNavigate) {
            onNavigate('dashboard');
        }
    };

    return (
        <div className="stock-alerts-page-wrapper">
            <div className="stock-alerts-container">
                {/* Header Title Row */}
                <div className="stock-alerts-title-row">
                    <div>
                        <h1 className="stock-alerts-page-title">Stock alerts</h1>
                        <span className="stock-alerts-sub-title">Live Inventory Health</span>
                    </div>
                    <button
                        className="stock-alerts-back-arrow-btn"
                        onClick={handleBackToDashboard}
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </button>
                </div>

                {/* Banner Card matching modern aesthetics */}
                <div className="stock-alerts-banner-card">
                    <div className="stock-alerts-banner-icon-box">
                        <AlertTriangle size={22} color="#D97706" />
                    </div>
                    <div className="stock-alerts-banner-text">
                        <h3 className="stock-alerts-banner-title">
                            {isLoading ? 'Checking stock levels...' : `${alertItems.length} product${alertItems.length !== 1 ? 's' : ''} need attention`}
                        </h3>
                        <p className="stock-alerts-banner-desc">
                            Automated threshold monitoring against product restock levels.
                        </p>
                    </div>
                </div>

                {/* Loading State Spinner */}
                {isLoading && (
                    <div className="stock-alerts-loading-state">
                        <Loader2 size={22} className="spinner-icon" />
                        <span>Fetching low stock items from database...</span>
                    </div>
                )}

                {/* Error State */}
                {!isLoading && fetchError && (
                    <div className="stock-alerts-empty-box">
                        <AlertCircle size={40} color="#EF4444" />
                        <p className="empty-box-title">Could not connect to backend.</p>
                        <p className="empty-box-sub">Make sure the backend server is running on port 5000.</p>
                    </div>
                )}

                {/* Empty State — no low stock products */}
                {!isLoading && !fetchError && alertItems.length === 0 && (
                    <div className="stock-alerts-empty-box">
                        <PackageCheck size={44} color="#166534" />
                        <p className="empty-box-title green">All products are well-stocked!</p>
                        <p className="empty-box-sub">No items are below their minimum stock threshold right now.</p>
                    </div>
                )}

                {/* Alert Cards Stack */}
                {!isLoading && alertItems.length > 0 && (
                    <div className="stock-alerts-list">
                        {Object.entries(groupedItems).map(([supplier, items]) => {
                            const isGroupSent = sentItems.has(supplier) || items.some(it => sentItems.has(it.name) || sentItems.has(it.id));
                            return (
                                <div key={supplier} className="stock-alert-supplier-group" style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3730A3', fontWeight: '800', fontSize: '17px', flexShrink: 0 }}>
                                                {supplier.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0, lineHeight: '1.3' }}>
                                                    {supplier}
                                                </h3>
                                                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginTop: '4px' }}>
                                                    {items.length} item{items.length !== 1 ? 's' : ''} low on stock
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ width: '100%' }}>
                                            {isGroupSent ? (
                                                <div className="stock-alert-sent-badge" style={{ margin: 0, width: '100%', justifyContent: 'center' }}>
                                                    <CheckCircle2 size={15} style={{ marginRight: '6px' }} />
                                                    <span style={{ fontSize: '13.5px', fontWeight: '800' }}>Request Sent</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendRequest(supplier, items)}
                                                    className="stock-alert-send-btn"
                                                    style={{ margin: 0, width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: '13.5px' }}
                                                >
                                                    <Send size={15} />
                                                    <span>Send Request</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {items.map(item => {
                                            const isOut = item.currentStock === 0;
                                            return (
                                                <div key={item.id} className={`stock-alert-card-item ${isOut ? 'out-of-stock-border' : ''}`} style={{ marginBottom: 0, border: '1px solid #E2E8F0', padding: '12px', borderRadius: '12px' }}>
                                                    <div className="stock-alert-card-body">
                                                        <div className="stock-alert-icon-pill" style={{ width: '40px', height: '40px' }}>
                                                            {item.image ? (
                                                                <img
                                                                    src={item.image}
                                                                    alt={item.name}
                                                                    className="stock-alert-prod-img"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span style={{ display: item.image ? 'none' : 'block', fontSize: '18px' }}>
                                                                {isOut ? '⚠️' : '📦'}
                                                            </span>
                                                        </div>
                                                        <div className="stock-alert-item-left">
                                                            <h3 className="stock-alert-item-title">{item.name}</h3>
                                                            <div className="stock-alert-meta-row">
                                                                <span className={`stock-level-badge ${isOut ? 'out-badge' : 'low-badge'}`}>
                                                                    {isOut ? 'Out of Stock' : `${item.currentStock} / ${item.threshold} ${item.unit}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Bottom Action Button */}
                <div className="stock-alerts-actions-group">
                    <button
                        type="button"
                        className="stock-alerts-back-btn"
                        onClick={handleBackToDashboard}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
