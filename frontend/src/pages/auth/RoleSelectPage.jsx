import React from 'react';
import { ArrowLeft, ShoppingCart, Store, Truck, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './RoleSelectPage.css';

export default function RoleSelectPage({ onNavigate, selectedRole, onSelectRole }) {
    const { switchRole } = useAuth();
    const currentRole = selectedRole || 'customer';

    const handleRoleChange = (roleKey) => {
        if (onSelectRole) {
            onSelectRole(roleKey);
        }
        switchRole(roleKey);
    };

    const handleContinue = () => {
        onNavigate('signup');
    };

    return (
        <div className="roleselect-container">
            {/* Top Navigation */}
            <div className="roleselect-top-nav">
                <button
                    type="button"
                    onClick={() => onNavigate('welcome')}
                    className="roleselect-back-btn"
                    aria-label="Back to welcome"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>

            {/* Header Text */}
            <div className="roleselect-header-text">
                <h1 className="roleselect-title">Select Your Role</h1>
                <p className="roleselect-subtitle">Choose how you want to use PickFresh</p>
            </div>

            {/* Role Options */}
            <div className="roleselect-options-list">
                {/* Option 1: Customer */}
                <div
                    className={`roleselect-option-card ${currentRole === 'customer' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('customer')}
                >
                    <div className="roleselect-option-left">
                        <div className="roleselect-icon-badge">
                            <ShoppingCart size={22} />
                        </div>
                        <div className="roleselect-option-text">
                            <h3 className="roleselect-option-h3">Customer</h3>
                            <p className="roleselect-option-p">
                                Pre-order items, skip queues & track live order status.
                            </p>
                        </div>
                    </div>
                    <div className={`roleselect-circle ${currentRole === 'customer' ? 'active' : ''}`}>
                        {currentRole === 'customer' && <Check size={14} strokeWidth={3} />}
                    </div>
                </div>

                {/* Option 2: Shop Owner / Employee */}
                <div
                    className={`roleselect-option-card ${currentRole === 'shop_owner' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('shop_owner')}
                >
                    <div className="roleselect-option-left">
                        <div className="roleselect-icon-badge">
                            <Store size={22} />
                        </div>
                        <div className="roleselect-option-text">
                            <h3 className="roleselect-option-h3">Shop Owner / Employee</h3>
                            <p className="roleselect-option-p">
                                Manage your store & orders
                            </p>
                        </div>
                    </div>
                    <div className={`roleselect-circle ${currentRole === 'shop_owner' ? 'active' : ''}`}>
                        {currentRole === 'shop_owner' && <Check size={14} strokeWidth={3} />}
                    </div>
                </div>

                {/* Option 3: Product Supplier */}
                <div
                    className={`roleselect-option-card ${currentRole === 'supplier' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('supplier')}
                >
                    <div className="roleselect-option-left">
                        <div className="roleselect-icon-badge">
                            <Truck size={22} />
                        </div>
                        <div className="roleselect-option-text">
                            <h3 className="roleselect-option-h3">Product Supplier</h3>
                            <p className="roleselect-option-p">
                                Supply & restock local stores
                            </p>
                        </div>
                    </div>
                    <div className={`roleselect-circle ${currentRole === 'supplier' ? 'active' : ''}`}>
                        {currentRole === 'supplier' && <Check size={14} strokeWidth={3} />}
                    </div>
                </div>
            </div>

            {/* Continue Button */}
            <button
                type="button"
                className="roleselect-continue-btn"
                onClick={handleContinue}
            >
                Continue
            </button>
        </div>
    );
}
