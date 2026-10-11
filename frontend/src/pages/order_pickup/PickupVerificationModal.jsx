import React, { useState } from 'react';
import { QrCode, ShieldCheck, X, CheckCircle2, Key, AlertCircle } from 'lucide-react';
import './PickupVerificationModal.css';

export default function PickupVerificationModal({ isOpen, onClose, onVerifySuccess }) {
    if (!isOpen) return null;

    const [pin, setPin] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = (e) => {
        e.preventDefault();
        if (pin === '4821' || pin.length === 4) {
            setIsVerified(true);
            setError('');
            setTimeout(() => {
                if (onVerifySuccess) onVerifySuccess(pin);
                setIsVerified(false);
                setPin('');
                onClose();
            }, 1200);
        } else {
            setError('Invalid Verification PIN. Please check customer phone app.');
        }
    };

    return (
        <div className="op-verify-modal-overlay">
            <div className="op-verify-modal-card">
                <button className="op-verify-modal-close" onClick={onClose}>
                    <X size={18} color="#64748B" />
                </button>

                {isVerified ? (
                    <div className="op-verify-success-box">
                        <CheckCircle2 size={48} color="#2E7D32" />
                        <h2>QR Code / PIN Verified!</h2>
                        <p>Locker #04 unlocked. Order handed over to customer.</p>
                    </div>
                ) : (
                    <>
                        <div className="op-verify-modal-header">
                            <div className="op-qr-icon-circle">
                                <QrCode size={28} color="#2E7D32" />
                            </div>
                            <h2>Customer Pickup Verification</h2>
                            <p>Scan customer QR code or enter 4-digit pickup PIN</p>
                        </div>

                        <form onSubmit={handleVerify} className="op-verify-form">
                            <div className="op-pin-input-wrap">
                                <Key size={18} color="#94A3B8" />
                                <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="Enter 4-Digit PIN (e.g. 4821)"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                />
                            </div>
                            {error && <span className="op-pin-error">{error}</span>}

                            <div className="op-simulated-qr-camera">
                                <QrCode size={36} color="#2E7D32" />
                                <span>Camera Scanner Active • Align QR inside frame</span>
                            </div>

                            <button type="submit" className="op-verify-submit-btn">
                                <ShieldCheck size={18} /> Confirm Handover & Complete
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
