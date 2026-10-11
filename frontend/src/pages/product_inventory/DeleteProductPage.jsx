import React, { useState } from 'react';
import { Check } from 'lucide-react';
import './DeleteProductPage.css';

export default function DeleteProductPage({ onNavigate, product }) {
    const productName = product?.name || 'Coca-Cola 1.5L';
    const [isDeleted, setIsDeleted] = useState(false);

    const handleDeletePermanently = () => {
        setIsDeleted(true);
        setTimeout(() => {
            if (onNavigate) onNavigate('product_list');
        }, 1200);
    };

    const handleCancel = () => {
        if (onNavigate) onNavigate('edit_product', { product });
    };

    return (
        <div className="delete-product-container">
            {/* Top Page Header Title matching screenshot */}
            <div>
                <h1 className="delete-product-page-title">Delete product?</h1>
            </div>

            {isDeleted ? (
                <div style={{
                    backgroundColor: '#E8F5E9',
                    color: '#27672D',
                    padding: '16px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    <Check size={20} /> Product permanently removed! Redirecting...
                </div>
            ) : (
                /* Center Warning Content matching screenshot */
                <div className="delete-product-center-content">
                    {/* Large Red Circle with Exclamation Mark ! */}
                    <div className="delete-product-red-circle">
                        !
                    </div>

                    <h2 className="delete-product-item-title">
                        Remove {productName}?
                    </h2>

                    <p className="delete-product-warning-msg">
                        This action permanently removes the product from inventory and cannot be undone.
                    </p>
                </div>
            )}

            {/* Bottom Action Buttons Stack matching screenshot */}
            <div className="delete-product-actions-group">
                <button
                    className="delete-product-delete-btn"
                    onClick={handleDeletePermanently}
                >
                    Delete permanently
                </button>

                <button
                    className="delete-product-cancel-btn"
                    onClick={handleCancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
