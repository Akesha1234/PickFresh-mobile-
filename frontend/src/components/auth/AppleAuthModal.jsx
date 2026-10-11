import React, { useState } from 'react';
import { X, Check, ShieldCheck, User } from 'lucide-react';
import './AppleAuthModal.css';

export default function AppleAuthModal({ isOpen, onClose, onSuccess, role = 'customer' }) {
    if (!isOpen) return null;

    const [selectedEmail, setSelectedEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const appleAccounts = [
        {
            name: 'Hashni Rehana',
            email: 'hashni.rehana@icloud.com',
            avatar: 'H',
            bg: '#1C1C1E'
        },
        {
            name: 'H. Rehana',
            email: 'rehanahashni@me.com',
            avatar: 'H',
            bg: '#3A3A3C'
        },
        {
            name: 'Nishadhi Samarakoon',
            email: 'nishadhi.fresh@icloud.com',
            avatar: 'N',
            bg: '#636366'
        }
    ];

    const handleSelectAccount = (acc) => {
        setSelectedEmail(acc.email);
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            const appleUserData = {
                id: 'apple_' + Date.now(),
                name: acc.name,
                email: acc.email,
                picture: '',
                role: role
            };
            onSuccess(appleUserData);
            onClose();
        }, 800);
    };

    return (
        <div className="apple-modal-overlay">
            <div className="apple-modal-card">
                {/* Close Button */}
                <button className="apple-modal-close" onClick={onClose} aria-label="Close">
                    <X size={18} color="#8E8E93" />
                </button>

                {/* Apple Logo Header */}
                <div className="apple-modal-header">
                    <svg className="apple-logo" viewBox="0 0 24 24" width="34" height="34" fill="#000000">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.81 1.13-1.94 1-3.07-.98.04-2.18.65-2.88 1.47-.63.73-1.18 1.89-1.03 3.01 1.1.09 2.23-.55 2.91-1.41z" />
                    </svg>
                    <h2 className="apple-modal-title">Sign in with Apple</h2>
                    <p className="apple-modal-subtitle">
                        Choose an account to continue to <strong>PickFresh</strong>
                    </p>
                </div>

                {/* Account List */}
                <div className="apple-account-list">
                    {appleAccounts.map((acc, index) => (
                        <button
                            key={index}
                            className={`apple-account-item ${selectedEmail === acc.email ? 'selected' : ''}`}
                            onClick={() => handleSelectAccount(acc)}
                            disabled={isLoading}
                        >
                            <div className="apple-avatar" style={{ backgroundColor: acc.bg }}>
                                {isLoading && selectedEmail === acc.email ? (
                                    <div className="apple-spinner" />
                                ) : (
                                    acc.avatar
                                )}
                            </div>
                            <div className="apple-account-info">
                                <span className="apple-account-name">{acc.name}</span>
                                <span className="apple-account-email">{acc.email}</span>
                            </div>
                            {selectedEmail === acc.email && !isLoading && (
                                <div className="apple-check-badge">
                                    <Check size={14} color="#FFFFFF" />
                                </div>
                            )}
                        </button>
                    ))}

                    <button
                        className="apple-account-item add-account"
                        onClick={() => handleSelectAccount(appleAccounts[0])}
                        disabled={isLoading}
                    >
                        <div className="apple-avatar add-icon">
                            <User size={18} color="#8E8E93" />
                        </div>
                        <div className="apple-account-info">
                            <span className="apple-account-name" style={{ color: '#007AFF' }}>Use another Apple ID</span>
                        </div>
                    </button>
                </div>

                {/* Footer Privacy Badge */}
                <div className="apple-modal-footer">
                    <ShieldCheck size={14} color="#8E8E93" />
                    <span>Apple will share your name and email address with PickFresh. Your data is protected by Apple's privacy policy.</span>
                </div>
            </div>
        </div>
    );
}
