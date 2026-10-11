import React from 'react';
import { ShoppingBag, X, ChevronRight, MapPin, Clock } from 'lucide-react';
import './ReadyPickupAlertModal.css';

export default function ReadyPickupAlertModal({ alertOrder, onClose, onTrackOrder }) {
    if (!alertOrder) return null;

    const orderNum = alertOrder.orderNumber || (alertOrder._id ? `PF-${String(alertOrder._id).slice(-4)}` : 'PF-0001');
    const storeName = (alertOrder.pickupStore || 'PickFresh Super').split(' • ')[0].split(' - ')[0];
    const pickupSlot = alertOrder.pickupTimeSlot || 'Express Pickup';

    return (
        <div className="ready-alert-overlay" onClick={onClose}>
            <div className="ready-alert-card" onClick={(e) => e.stopPropagation()}>
                {/* Close Button Top Right */}
                <button className="ready-alert-close-btn" onClick={onClose} aria-label="Close notification">
                    <X size={20} color="#64748B" />
                </button>

                {/* Heartbeat Pulsing Icon Header */}
                <div className="ready-alert-pulse-wrapper">
                    <div className="heartbeat-ring ring-1"></div>
                    <div className="heartbeat-ring ring-2"></div>
                    <div className="heartbeat-icon-box">
                        <ShoppingBag size={34} color="#FFFFFF" className="ready-bag-icon" />
                    </div>
                </div>

                {/* Status Pill Badge */}
                <div className="ready-alert-badge">
                    <span className="heartbeat-dot"></span>
                    <span>READY FOR PICKUP</span>
                </div>

                {/* Title & Message */}
                <h2 className="ready-alert-title">Order #{orderNum} is Ready!</h2>
                <p className="ready-alert-message">
                    Great news! Your order at <strong>{storeName}</strong> is packed and ready for pickup at the express counter.
                </p>

                {/* Quick Info Box */}
                <div className="ready-alert-info-box">
                    <div className="alert-info-row">
                        <MapPin size={16} color="#2D7B38" />
                        <span>{storeName} • Pickup Counter</span>
                    </div>
                    {pickupSlot && (
                        <div className="alert-info-row">
                            <Clock size={16} color="#2D7B38" />
                            <span>Slot: {pickupSlot}</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="ready-alert-actions">
                    <button
                        className="btn-ready-track"
                        onClick={() => {
                            if (onTrackOrder) onTrackOrder(alertOrder);
                            if (onClose) onClose();
                        }}
                    >
                        <span>Track Order & Collect</span>
                        <ChevronRight size={18} />
                    </button>
                    <button className="btn-ready-close" onClick={onClose}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
