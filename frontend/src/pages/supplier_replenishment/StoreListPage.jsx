import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Store, MapPin, Phone, Mail, UserCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './StoreListPage.css';

function StoreIconOrPic({ store }) {
    const [imgErr, setImgErr] = useState(false);
    const picSrc = store?.picture || store?.profilePic || store?.image || store?.avatar;

    if (picSrc && !imgErr) {
        return (
            <img
                src={picSrc}
                alt={store.name || 'Store'}
                onError={() => setImgErr(true)}
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #166534',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    flexShrink: 0
                }}
            />
        );
    }
    return (
        <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            <Store size={18} color="#166534" />
        </div>
    );
}

export default function StoreListPage({ onNavigate }) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState(null);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const supplierName = user?.supplierName || user?.name || '';
            const supplierEmail = user?.email || '';
            const endpoint = `http://localhost:5000/api/supplier-replenishment/stores?supplierName=${encodeURIComponent(supplierName)}&supplierEmail=${encodeURIComponent(supplierEmail)}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.success && Array.isArray(data.stores)) {
                setStores(data.stores);
                if (data.stores.length > 0) {
                    setSelectedStoreId(data.stores[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching stores:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, [user?.email, user?.supplierName, user?.name]);

    const filteredStores = stores.filter(s =>
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleRemoveStore = () => {
        if (selectedStoreId) {
            setStores(prev => prev.filter(s => s.id !== selectedStoreId));
        }
    };

    return (
        <div className="store-list-container">
            {/* 🔝 Top Fixed Header Section */}
            <div className="store-list-header-section">
                {/* Header Title Row */}
                <div className="store-list-title-row">
                    <h1 className="store-list-page-title" style={{ margin: 0 }}>Stores</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={fetchStores}
                            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Refresh list"
                        >
                            <RefreshCw size={13} className={loading ? 'spinner-icon' : ''} /> Refresh List
                        </button>
                        <button
                            className="store-list-back-btn"
                            onClick={() => onNavigate && onNavigate('home')}
                            aria-label="Back to dashboard"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={18} color="#1E293B" />
                        </button>
                    </div>
                </div>

                {/* Search Box */}
                <div className="store-list-search-box">
                    <input
                        type="text"
                        className="store-list-search-input"
                        placeholder="Search connected stores by name or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* 📜 Scrollable Content Area */}
            <div className="store-list-scrollable-body">
                {/* Store Cards Stack connected to MongoDB Atlas */}
                <div className="store-list-cards-stack">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#64748B', fontSize: '13px' }}>
                            Loading client stores from MongoDB...
                        </div>
                    ) : filteredStores.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                            <Store size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>No Store Clients Found</h4>
                            <p style={{ margin: 0, fontSize: '12px' }}>Stores that send you replenishment requests will appear here automatically.</p>
                        </div>
                    ) : (
                        filteredStores.map(store => {
                            const isSelected = store.id === selectedStoreId;
                            return (
                                <div
                                    key={store.id}
                                    className={`store-list-card-item ${isSelected ? 'active-highlight' : ''}`}
                                    onClick={() => setSelectedStoreId(store.id)}
                                    style={{
                                        border: isSelected ? '2px solid #166534' : '1px solid #E2E8F0',
                                        backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                                        borderRadius: '16px',
                                        padding: '14px',
                                        marginBottom: '10px',
                                        boxShadow: isSelected ? '0 2px 8px rgba(22, 101, 52, 0.08)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <StoreIconOrPic store={store} />
                                            <h2 className="store-list-card-name" style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{store.name}</h2>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            backgroundColor: store.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                                            color: store.status === 'ACTIVE' ? '#166534' : '#64748B'
                                        }}>
                                            {store.status}
                                        </span>
                                    </div>
                                    <p className="store-list-card-subtitle" style={{ margin: '4px 0', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={13} color="#64748B" /> {store.address || 'Main Street'}
                                    </p>
                                    {store.phone && (
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Phone size={13} color="#64748B" /> {store.phone}
                                        </p>
                                    )}
                                    {store.email && (
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Mail size={13} color="#64748B" /> {store.email}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 🔒 Fixed Bottom Action Bar */}
            {filteredStores.length > 0 && (
                <div className="store-list-actions-group">
                    <button
                        className="store-list-remove-btn"
                        onClick={handleRemoveStore}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <Trash2 size={16} /> Remove Selected Store
                    </button>
                </div>
            )}
        </div>
    );
}
