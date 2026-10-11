import React, { useState, useEffect } from 'react';
import ShopOwnerDashboard from './ShopOwnerDashboard';
import ProductListPage from './ProductListPage';
import AddProductPage from './AddProductPage';
import EditProductPage from './EditProductPage';
import DeleteProductPage from './DeleteProductPage';
import SupplierListPage from './SupplierListPage';
import AddSupplierPage from './AddSupplierPage';
import LowStockAdvancedPage from './LowStockAdvancedPage';
import RestockRequestPage from './RestockRequestPage';
import DeliveryTrackingPage from '../supplier_replenishment/DeliveryTrackingPage';
import './ProductInventoryModule.css';

export default function ProductInventoryModule({ onNavigate: topLevelNavigate, initialScreen = 'product_list' }) {
    const [currentScreen, setCurrentScreen] = useState(initialScreen);
    const [screenParams, setScreenParams] = useState(null);

    useEffect(() => {
        if (initialScreen) {
            setCurrentScreen(initialScreen);
        }
    }, [initialScreen]);

    const handleNavigate = (screen, params = null) => {
        if ((screen === 'dashboard' || screen === 'home') && topLevelNavigate) {
            topLevelNavigate('home');
            return;
        }
        setCurrentScreen(screen);
        setScreenParams(params);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="pi-module-wrapper">
            {currentScreen === 'product_list' && <ProductListPage onNavigate={handleNavigate} />}
            {currentScreen === 'add_product' && <AddProductPage onNavigate={handleNavigate} />}
            {currentScreen === 'edit_product' && <EditProductPage onNavigate={handleNavigate} product={screenParams?.product} />}
            {currentScreen === 'delete_product' && <DeleteProductPage onNavigate={handleNavigate} product={screenParams?.product} />}
            {currentScreen === 'supplier_list' && <SupplierListPage onNavigate={handleNavigate} />}
            {currentScreen === 'add_supplier' && <AddSupplierPage onNavigate={handleNavigate} />}
            {currentScreen === 'low_stock' && <LowStockAdvancedPage onNavigate={handleNavigate} />}
            {currentScreen === 'restock_request' && <RestockRequestPage onNavigate={handleNavigate} initialData={screenParams} />}
            {currentScreen === 'delivery_tracking' && <DeliveryTrackingPage onNavigate={handleNavigate} po={screenParams?.po} />}
        </div>
    );
}
