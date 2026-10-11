import React from 'react';
import CustomerShoppingModule from '../customer_shopping/CustomerShoppingModule';

export default function CustomerDashboard({ onNavigate }) {
    return <CustomerShoppingModule initialPage="home" onNavigate={onNavigate} />;
}
