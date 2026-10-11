import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertCircle, KeyRound, RefreshCw } from 'lucide-react';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage({ onNavigate }) {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [resendTimer, setResendTimer] = useState(30);

    // Email Step Handler
    const handleSendCode = (e) => {
        e.preventDefault();
        setErrorMsg('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            setErrorMsg('Please enter your email address');
            return;
        }
        if (!emailRegex.test(email.trim())) {
            setErrorMsg('Please enter a valid email address (e.g. name@company.com)');
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep(2);
        }, 1000);
    };

    // OTP Input Change Handler
    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto move to next input box
        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    // OTP Keydown for backspace focus back
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-input-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    // Verify OTP Handler
    const handleVerifyOtp = (e) => {
        e.preventDefault();
        setErrorMsg('');
        const enteredOtp = otp.join('');

        if (enteredOtp.length < 4) {
            setErrorMsg('Please enter the full 4-digit verification code');
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep(3);
        }, 1000);
    };

    // Reset Password Handler
    const handleResetPassword = (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!newPassword) {
            setErrorMsg('New password is required');
            return;
        }
        if (newPassword.length < 8) {
            setErrorMsg('Password must be at least 8 characters long');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep(4);
        }, 1200);
    };

    return (
        <div className="forgot-container">
            {/* Top Navigation */}
            <div className="forgot-top-bar">
                <button
                    onClick={() => {
                        if (step > 1 && step < 4) setStep(step - 1);
                        else onNavigate('login');
                    }}
                    className="forgot-back-btn"
                    aria-label="Go Back"
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </button>
                <div className="forgot-step-indicator">
                    <span className={`step-dot ${step >= 1 ? 'active' : ''}`} />
                    <span className={`step-dot ${step >= 2 ? 'active' : ''}`} />
                    <span className={`step-dot ${step >= 3 ? 'active' : ''}`} />
                </div>
            </div>

            <div className="forgot-content-box">

                {/* ── STEP 1: ENTER EMAIL ── */}
                {step === 1 && (
                    <>
                        <div className="forgot-icon-header">
                            <div className="forgot-icon-badge">
                                <KeyRound size={28} color="#2E7D32" />
                            </div>
                        </div>

                        <div className="forgot-header-text">
                            <h1 className="forgot-title">Forgot Password?</h1>
                            <p className="forgot-subtitle">
                                Don't worry! Enter your registered email address and we'll send you a 4-digit verification code.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="forgot-error-card">
                                <AlertCircle size={18} color="#DC2626" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSendCode} className="forgot-form" noValidate>
                            <div className="forgot-field-group">
                                <label className="forgot-label">Email Address</label>
                                <div className="forgot-input-wrapper">
                                    <Mail className="forgot-input-icon" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="forgot-input"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="forgot-primary-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── STEP 2: ENTER OTP ── */}
                {step === 2 && (
                    <>
                        <div className="forgot-icon-header">
                            <div className="forgot-icon-badge">
                                <ShieldCheck size={28} color="#2E7D32" />
                            </div>
                        </div>

                        <div className="forgot-header-text">
                            <h1 className="forgot-title">Enter Verification Code</h1>
                            <p className="forgot-subtitle">
                                We sent a 4-digit code to <strong style={{ color: '#0F172A' }}>{email}</strong>
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="forgot-error-card">
                                <AlertCircle size={18} color="#DC2626" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="forgot-form">
                            <div className="otp-input-grid">
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`otp-input-${idx}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                        className={`otp-box ${digit ? 'filled' : ''}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                className="forgot-primary-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <div className="resend-code-row">
                                <span>Didn't receive the code? </span>
                                <button
                                    type="button"
                                    className="resend-btn"
                                    onClick={() => {
                                        setErrorMsg('');
                                        setOtp(['', '', '', '']);
                                    }}
                                >
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* ── STEP 3: NEW PASSWORD ── */}
                {step === 3 && (
                    <>
                        <div className="forgot-icon-header">
                            <div className="forgot-icon-badge">
                                <Lock size={28} color="#2E7D32" />
                            </div>
                        </div>

                        <div className="forgot-header-text">
                            <h1 className="forgot-title">Reset Password</h1>
                            <p className="forgot-subtitle">
                                Create a new strong password for your PickFresh account.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="forgot-error-card">
                                <AlertCircle size={18} color="#DC2626" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="forgot-form">
                            {/* New Password */}
                            <div className="forgot-field-group">
                                <label className="forgot-label">New Password</label>
                                <div className="forgot-input-wrapper">
                                    <Lock className="forgot-input-icon" size={18} />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="forgot-input"
                                        style={{ paddingRight: '44px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="forgot-password-toggle"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="forgot-field-group">
                                <label className="forgot-label">Confirm Password</label>
                                <div className="forgot-input-wrapper">
                                    <Lock className="forgot-input-icon" size={18} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter password"
                                        className="forgot-input"
                                        style={{ paddingRight: '44px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="forgot-password-toggle"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="forgot-primary-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Updating Password...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── STEP 4: SUCCESS ── */}
                {step === 4 && (
                    <div className="forgot-success-box">
                        <div className="success-icon-badge">
                            <CheckCircle2 size={42} color="#2E7D32" />
                        </div>
                        <h1 className="forgot-title" style={{ marginTop: '14px' }}>Password Reset Complete!</h1>
                        <p className="forgot-subtitle" style={{ maxWidth: '300px', margin: '8px auto 24px' }}>
                            Your password has been successfully updated. You can now log in using your new credentials.
                        </p>

                        <button
                            type="button"
                            className="forgot-primary-btn"
                            onClick={() => onNavigate('login')}
                        >
                            Back to Sign In
                        </button>
                    </div>
                )}

            </div>

            {/* Bottom Footer Back to Sign In Link */}
            {step < 4 && (
                <div className="forgot-footer">
                    <button
                        type="button"
                        onClick={() => onNavigate('login')}
                        className="forgot-login-link"
                    >
                        Remember password? <span style={{ color: '#2E7D32', fontWeight: '800' }}>Sign In</span>
                    </button>
                </div>
            )}
        </div>
    );
}
