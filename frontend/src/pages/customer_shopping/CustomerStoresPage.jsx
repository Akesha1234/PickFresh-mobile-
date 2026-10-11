import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Store, Star, MapPin, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './CustomerStoresPage.css';

export default function CustomerStoresPage({ onNavigate, onSelectStore, selectedStore }) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOption, setFilterOption] = useState('All');
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStores = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('http://localhost:5000/api/customer-shopping/stores');
                const data = await res.json();
                if (res.ok && data.success && Array.isArray(data.stores)) {
                    setStores(data.stores);
                }
            } catch (err) {
                console.error('Failed to load stores from MongoDB Atlas backend:', err);
                setStores([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStores();
    }, []);

    const filteredStores = stores.filter(s => {
        const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase()));
        if (filterOption === 'Near Me') {
            const userCity = (user?.location || '').toLowerCase().trim();
            const storeText = `${s.location || ''} ${s.storeAddress || ''} ${s.address || ''}`.toLowerCase();
            const matchesUserCity = userCity && userCity !== 'islandwide' && userCity.split(/\s+/).some(w => w.length >= 3 && storeText.includes(w));
            return matchesQuery && (matchesUserCity || parseFloat(s.distance) <= 2.0);
        }
        if (filterOption === 'Top Rated') return matchesQuery && parseFloat(s.rating) >= 4.8;
        return matchesQuery;
    });

    const handleChooseStore = (store) => {
        if (onSelectStore) onSelectStore(store);
        if (onNavigate) onNavigate('search');
    };

    return (
        <div className="stores-page-container">
            {/* Header */}
            <div className="stores-header">
                <div className="stores-header-title-box">
                    <h1 className="stores-header-title">Pickup Stores</h1>
                    <span className="stores-header-sub">Select your local grocery shop</span>
                </div>
                <button className="back-btn" onClick={() => onNavigate && onNavigate('home')} aria-label="Go back to home">
                    <ArrowLeft size={20} color="#1E293B" />
                </button>
            </div>

            {/* Search Input */}
            <div className="stores-search-wrapper">
                <Search size={18} color="#64748B" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stores by name, city or street..."
                    className="stores-search-input"
                />
            </div>

            {/* Filter Chips */}
            <div className="stores-filter-chips">
                {['All', 'Near Me', 'Top Rated'].map(opt => (
                    <button
                        key={opt}
                        className={`stores-chip ${filterOption === opt ? 'active' : ''}`}
                        onClick={() => setFilterOption(opt)}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            {/* Stores List */}
            <div className="stores-list">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Loader2 size={26} className="spin-animate" color="#2D7B38" />
                        <span style={{ fontSize: '13px', fontWeight: '700' }}>Loading pickup stores from database...</span>
                    </div>
                ) : filteredStores.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
                        <Store size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>No Stores Found</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>No registered pickup stores available at the moment.</p>
                    </div>
                ) : (
                    filteredStores.map(store => {
                        const isSelected = selectedStore?.id === store.id;
                        const hasRealPic = store.picture && store.picture.trim().length > 0 && !store.picture.includes('ui-avatars.com');
                        return (
                            <div
                                key={store.id}
                                className={`store-list-card ${isSelected ? 'selected' : ''} ${store.storeStatus === 'closed' ? 'disabled-card' : ''}`}
                                onClick={() => {
                                    if (store.storeStatus !== 'closed') handleChooseStore(store);
                                }}
                            >
                                <div className="store-list-card-top">
                                    <div className="store-list-icon" style={{ overflow: 'hidden', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#DCFCE7' : '#F1F5F9' }}>
                                        {hasRealPic ? (
                                            <img
                                                src={store.picture}
                                                alt={store.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <Store size={22} color={isSelected ? '#2D7B38' : '#475569'} />
                                        )}
                                    </div>
                                    <div className="store-list-title-group">
                                        <h3 className="store-list-name">{store.name}</h3>
                                    </div>
                                </div>

                                <div className="store-list-address-row">
                                    <MapPin size={14} color="#64748B" />
                                    <span>{store.address}</span>
                                </div>

                                <div className="store-list-card-footer">
                                    <div className={`store-status-group ${store.storeStatus === 'closed' ? 'closed' : ''}`}>
                                        <Clock size={13} color={store.storeStatus === 'closed' ? '#DC2626' : '#059669'} />
                                        <span className="store-status">{store.status}</span>
                                    </div>
                                    <button
                                        className="select-store-action-btn"
                                        style={{ opacity: store.storeStatus === 'closed' ? 0.6 : 1, cursor: store.storeStatus === 'closed' ? 'not-allowed' : 'pointer' }}
                                        disabled={store.storeStatus === 'closed'}
                                    >
                                        <span>{store.storeStatus === 'closed' ? 'Unavailable' : (isSelected ? 'Selected ✓' : 'Shop at Store')}</span>
                                        {store.storeStatus !== 'closed' && <ChevronRight size={14} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="bottom-spacer"></div>
        </div>
    );
}
