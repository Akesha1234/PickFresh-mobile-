import React, { useState } from 'react';
import SupplierListPage from '../product_inventory/SupplierListPage';
import AddSupplierPage from '../product_inventory/AddSupplierPage';
import RestockRequestPage from '../product_inventory/RestockRequestPage';
import SupplierDashboard from './SupplierDashboard';
import ReplenishmentRequestsPage from './ReplenishmentRequestsPage';
import RestockRequestDetailsPage from './RestockRequestDetailsPage';
import StoreListPage from './StoreListPage';
import DeliveryTrackingPage from './DeliveryTrackingPage';
import './SupplierReplenishmentModule.css';

export default function SupplierReplenishmentModule({ onNavigate: topLevelNavigate }) {
    // Default directly to 'supplier_list' page for Shop Owner
    const [currentScreen, setCurrentScreen] = useState('supplier_list');
    const [screenParams, setScreenParams] = useState(null);

    const handleNavigate = (screen, params = null) => {
        if (screen === 'dashboard' && topLevelNavigate) {
            topLevelNavigate('home');
            return;
        }
        setCurrentScreen(screen);
        setScreenParams(params);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="sr-module-wrapper">
            {/* Shop Owner Supplier Management Views */}
            {currentScreen === 'supplier_list' && <SupplierListPage onNavigate={handleNavigate} />}
            {currentScreen === 'add_supplier' && <AddSupplierPage onNavigate={handleNavigate} initialData={screenParams} />}
            {currentScreen === 'restock_request' && <RestockRequestPage onNavigate={handleNavigate} initialData={screenParams} />}

            {/* Supplier Portal Subviews */}
            {currentScreen === 'supplier_portal' && <SupplierDashboard onNavigate={handleNavigate} />}
            {currentScreen === 'requests_list' && <ReplenishmentRequestsPage onNavigate={handleNavigate} />}
            {currentScreen === 'request_details' && <RestockRequestDetailsPage onNavigate={handleNavigate} po={screenParams?.po} />}
            {currentScreen === 'store_list' && <StoreListPage onNavigate={handleNavigate} />}
            {currentScreen === 'delivery_tracking' && <DeliveryTrackingPage onNavigate={handleNavigate} po={screenParams?.po} />}
        </div>
    );
}
