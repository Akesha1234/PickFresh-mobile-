import React, { useState } from 'react';
import OrderDashboard from './OrderDashboard';
import OrderDetailsPage from './OrderDetailsPage';
import PickupSchedulePage from './PickupSchedulePage';
import StatusUpdatePage from './StatusUpdatePage';
import ShopPastOrdersPage from './ShopPastOrdersPage';
import './OrderPickupModule.css';

export default function OrderPickupModule({ onNavigate: topLevelNavigate }) {
    const [currentScreen, setCurrentScreen] = useState('dashboard');
    const [screenParams, setScreenParams] = useState(null);

    const handleNavigate = (screen, params = null) => {
        if (screen === 'home' && topLevelNavigate) {
            topLevelNavigate('home');
            return;
        }
        if (screen === 'dashboard' || screen === 'order_dashboard') {
            setCurrentScreen('dashboard');
            setScreenParams(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setCurrentScreen(screen);
        setScreenParams(params);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="op-module-wrapper">
            {currentScreen === 'dashboard' && <OrderDashboard onNavigate={handleNavigate} />}
            {currentScreen === 'order_details' && <OrderDetailsPage onNavigate={handleNavigate} order={screenParams?.order} />}
            {currentScreen === 'status_update' && <StatusUpdatePage onNavigate={handleNavigate} order={screenParams?.order} />}
            {currentScreen === 'pickup_schedule' && <PickupSchedulePage onNavigate={handleNavigate} />}
            {currentScreen === 'past_orders' && <ShopPastOrdersPage onNavigate={handleNavigate} />}
        </div>
    );
}
