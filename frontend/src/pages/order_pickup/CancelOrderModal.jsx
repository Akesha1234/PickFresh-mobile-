import React, { useState } from 'react';
import { AlertOctagon, X, RefreshCw, Send, Check } from 'lucide-react';
import './CancelOrderModal.css';

export default function CancelOrderModal({ isOpen, onClose, onConfirmCancel, order }) {
    if (!isOpen || !order) return null;

    const [reason, setReason] = useState('Item out of stock');
    const [customNote, setCustomNote] = useState('');
    const [processRefund, setProcessRefund] = useState(true);

    const cancelReasons = [
        'Item out of stock / quality issue',
        'Customer requested cancellation',
        'Store pickup window closed',
        'Unverified / Fraudulent payment',
        'Other reason'
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirmCancel(order.id, reason, customNote, processRefund);
        onClose();
    };

    return (
        <div className="op-cancel-modal-overlay">
            <div className="op-cancel-modal-card">
                <button className="op-cancel-modal-close" onClick={onClose}>
                    <X size={18} color="#64748B" />
                </button>

                <div className="op-cancel-modal-header">
                    <div className="op-cancel-icon-circle">
                        <AlertOctagon size={24} color="#DC2626" />
                    </div>
                    <h2>Cancel Order #{order.id}?</h2>
                    <p>Customer: <strong>{order.customerName}</strong> ({order.totalAmount})</p>
                </div>

                <form onSubmit={handleSubmit} className="op-cancel-form">
                    <div className="op-cancel-group">
                        <label>Select Reason for Cancellation *</label>
                        <select value={reason} onChange={(e) => setReason(e.target.value)}>
                            {cancelReasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="op-cancel-group">
                        <label>Additional Explanation for Customer</label>
                        <textarea
                            rows={2}
                            placeholder="e.g. Apologies, organic carrots failed quality check..."
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                        />
                    </div>

                    <label className="op-refund-checkbox">
                        <input
                            type="checkbox"
                            checked={processRefund}
                            onChange={(e) => setProcessRefund(e.target.checked)}
                        />
                        <span>💳 Issue full refund to customer (Visa / Koko)</span>
                    </label>

                    <div className="op-cancel-actions">
                        <button type="button" className="op-btn-back" onClick={onClose}>
                            Keep Order
                        </button>
                        <button type="submit" className="op-btn-confirm-cancel">
                            Confirm Cancellation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
