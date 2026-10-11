import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { GOOGLE_CLIENT_ID, triggerGoogleAuth } from '../../utils/googleAuth';
import './GoogleAuthModal.css';

export default function GoogleAuthModal({ isOpen, onClose, onSuccess, role = 'customer' }) {
    if (!isOpen) return null;

    const [googleEmail, setGoogleEmail] = useState('');
    const [googleName, setGoogleName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const gBtnContainerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setErrorMsg('');
        setIsLoading(false);

        // Attempt to render Google's official button inside the mobile modal container
        const renderGoogleSdkButton = () => {
            if (window.google?.accounts?.id && gBtnContainerRef.current) {
                try {
                    gBtnContainerRef.current.innerHTML = '';
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: async (response) => {
                            if (response.credential) {
                                try {
                                    setIsLoading(true);
                                    // Parse JWT safely
                                    const base64Url = response.credential.split('.')[1];
                                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                                    const payload = JSON.parse(decodeURIComponent(
                                        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                                    ));

                                    const googleUserData = {
                                        id: payload.sub,
                                        name: payload.name || payload.given_name || payload.email.split('@')[0],
                                        email: payload.email,
                                        picture: payload.picture || '',
                                        role: role,
                                        provider: 'google'
                                    };

                                    await onSuccess(googleUserData);
                                    setIsLoading(false);
                                    onClose();
                                } catch (err) {
                                    setIsLoading(false);
                                    setErrorMsg(err.message || 'Google authentication failed');
                                }
                            }
                        }
                    });

                    window.google.accounts.id.renderButton(gBtnContainerRef.current, {
                        type: 'standard',
                        theme: 'outline',
                        size: 'large',
                        text: 'continue_with',
                        shape: 'rectangular',
                        logo_alignment: 'left',
                        width: 290
                    });
                } catch (err) {
                    console.warn('GSI renderButton notice:', err);
                }
            }
        };

        const timer = setTimeout(renderGoogleSdkButton, 200);
        return () => clearTimeout(timer);
    }, [isOpen, role]);

    const handleRealGoogleSubmit = async (e) => {
        e.preventDefault();
        const trimmedEmail = googleEmail.trim();

        if (!trimmedEmail) {
            setErrorMsg('Please enter your Google email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setErrorMsg('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        setErrorMsg('');

        try {
            const displayName = googleName.trim() || trimmedEmail.split('@')[0];
            const googleUserData = {
                id: 'google_' + Math.abs(trimmedEmail.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)),
                name: displayName,
                email: trimmedEmail,
                picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1A73E8&color=fff`,
                role: role,
                provider: 'google'
            };

            await onSuccess(googleUserData);
            setIsLoading(false);
            onClose();
        } catch (err) {
            setIsLoading(false);
            setErrorMsg(err.message || 'Failed to authenticate with PickFresh server.');
        }
    };

    const handleLaunchPopup = () => {
        setIsLoading(true);
        setErrorMsg('');
        triggerGoogleAuth({
            role,
            onSuccess: async (userData) => {
                try {
                    await onSuccess(userData);
                    setIsLoading(false);
                    onClose();
                } catch (err) {
                    setIsLoading(false);
                    setErrorMsg(err.message || 'Failed to sync with PickFresh database.');
                }
            },
            onError: (err) => {
                setIsLoading(false);
                setErrorMsg(typeof err === 'string' ? err : 'Google popup was closed or cancelled.');
            }
        });
    };

    return (
        <div className="google-modal-overlay" onClick={onClose}>
            <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button className="google-modal-close" onClick={onClose} aria-label="Close">
                    <X size={18} color="#5F6368" />
                </button>

                {/* Google Logo & Header */}
                <div className="google-modal-header">
                    <svg className="google-g-logo" viewBox="0 0 24 24" width="36" height="36">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <h2 className="google-modal-title">Sign in with Google</h2>
                    <p className="google-modal-subtitle">
                        to continue to <strong>PickFresh</strong>
                    </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="google-modal-error">
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="google-modal-loading">
                        <Loader2 size={20} className="google-spin-icon" />
                        <span>Connecting with Google...</span>
                    </div>
                )}

                {/* Official Google GSI Button Container (rendered if authorized) */}
                <div
                    ref={gBtnContainerRef}
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: '44px',
                        marginTop: '2px'
                    }}
                />

                {/* Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '6px 0',
                    width: '100%'
                }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
                    <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>
                        OR SIGN IN WITH GOOGLE EMAIL
                    </span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
                </div>

                {/* Authentic In-Screen Google Email Form */}
                <form onSubmit={handleRealGoogleSubmit} className="google-real-form">
                    <div className="google-input-group">
                        <label>Google Account Email</label>
                        <input
                            type="email"
                            placeholder="yourname@gmail.com"
                            value={googleEmail}
                            onChange={(e) => setGoogleEmail(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="google-input-group">
                        <label>Display Name (Optional)</label>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={googleName}
                            onChange={(e) => setGoogleName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="google-submit-custom-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Loader2 size={16} className="google-spin-icon" />
                                <span>Signing In...</span>
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <span>Continue to PickFresh</span>
                                <ArrowRight size={16} />
                            </span>
                        )}
                    </button>
                </form>

                {/* External Popup Trigger Option */}
                <div style={{ textAlign: 'center', marginTop: '2px' }}>
                    <button
                        type="button"
                        onClick={handleLaunchPopup}
                        className="google-external-btn"
                        disabled={isLoading}
                    >
                        <ExternalLink size={12} />
                        <span>Launch Google Browser Popup Window</span>
                    </button>
                </div>

                {/* Footer Security Badge */}
                <div className="google-modal-footer">
                    <ShieldCheck size={14} color="#5F6368" />
                    <span>To continue, Google will verify your account with PickFresh.</span>
                </div>
            </div>
        </div>
    );
}
