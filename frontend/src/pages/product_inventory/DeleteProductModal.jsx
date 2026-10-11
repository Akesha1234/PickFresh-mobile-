import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import './DeleteProductModal.css';

export default function DeleteProductModal({ isOpen, onClose, onConfirm, product }) {
    if (!isOpen || !product) return null;

    return (
        <div className="pi-delete-modal-overlay">
            <div className="pi-delete-modal-card">
                <button className="pi-delete-modal-close" onClick={onClose}>
                    <X size={18} color="#64748B" />
                </button>

                <div className="pi-delete-modal-header">
                    <div className="pi-delete-icon-circle">
                        <AlertTriangle size={24} color="#DC2626" />
                    </div>
                    <h2>Delete Product?</h2>
                    <p>Are you sure you want to remove <strong>"{product.name}"</strong> from your store inventory?</p>
                </div>

                <div className="pi-delete-details-box">
                    <div className="pi-detail-row">
                        <span>SKU:</span>
                        <strong>{product.sku || 'SKU-8821'}</strong>
                    </div>
                    <div className="pi-detail-row">
                        <span>Current Stock:</span>
                        <strong>{product.stock || '0'} {product.unit || 'units'}</strong>
                    </div>
                    <div className="pi-detail-row">
                        <span>Price:</span>
                        <strong>Rs. {product.price}</strong>
                    </div>
                </div>

                <div className="pi-delete-warning-note">
                    ⚠️ This action cannot be undone. Customers will no longer see this product in store listings.
                </div>

                <div className="pi-delete-modal-actions">
                    <button className="pi-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="pi-btn-delete" onClick={() => onConfirm(product.id)}>
                        <Trash2 size={16} /> Delete Product
                    </button>
                </div>
            </div>
        </div>
    );
}
