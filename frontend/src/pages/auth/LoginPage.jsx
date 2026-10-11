import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { triggerGoogleAuth } from '../../utils/googleAuth';
import GoogleAuthModal from '../../components/auth/GoogleAuthModal';
import AppleAuthModal from '../../components/auth/AppleAuthModal';
import './LoginPage.css';

export default function LoginPage({ onNavigate }) {
    const { login, loginWithGoogle } = useAuth();
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [showAppleModal, setShowAppleModal] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            errors.email = 'Email address is required';
        } else if (!emailRegex.test(email.trim())) {
            errors.email = 'Enter a valid email (e.g. name@domain.com)';
        }

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateForm();
    };

    const handleGoogleLogin = () => {
        setIsLoading(true);
        setErrorMsg('');
        triggerGoogleAuth({
            role: 'customer',
            onSuccess: async (googleUser) => {
                try {
                    await loginWithGoogle(googleUser);
                    setIsLoading(false);
                    if (onNavigate) onNavigate('home');
                } catch (err) {
                    setIsLoading(false);
                    setErrorMsg(err.message || 'Google login failed');
                }
            },
            onError: (err) => {
                setIsLoading(false);
                setErrorMsg(typeof err === 'string' ? err : 'Google login was cancelled or encountered an error.');
            }
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            await login(email.trim(), password);
            setIsLoading(false);
            if (onNavigate) onNavigate('home');
        } catch (error) {
            setIsLoading(false);
            setErrorMsg(error.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="login-page-container">
            {/* Top Centered Logo Box */}
            <div className="login-logo-card">
                <img
                    src="/logo.jpg"
                    alt="PickFresh Logo"
                    className="login-logo-img"
                />
            </div>

            {/* Title & Subtitle */}
            <div className="login-header-text">
                <h1 className="login-title">Welcome back</h1>
                <p className="login-subtitle">Enter your credentials to access your account</p>
            </div>

            {/* Premium Error Alert Card */}
            {errorMsg && (
                <div className="login-error-card">
                    <div className="error-card-icon-wrap">
                        <AlertCircle size={18} color="#DC2626" />
                    </div>
                    <div className="error-card-body">
                        <span className="error-card-title">Unable to Sign In</span>
                        <span className="error-card-message">{errorMsg}</span>
                    </div>
                </div>
            )}

            {/* Main Login Form */}
            <form onSubmit={handleLogin} className="login-form" noValidate>
                {/* Email Field */}
                <div className="login-field-group">
                    <label className="login-label">Email Address</label>
                    <div className={`login-input-wrapper ${fieldErrors.email && touched.email ? 'input-has-error' : ''}`}>
                        <Mail size={18} className="input-leading-icon" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (fieldErrors.email) validateForm();
                            }}
                            onBlur={() => handleBlur('email')}
                            placeholder="name@company.com"
                            className="login-input with-leading-icon"
                        />
                    </div>
                    {fieldErrors.email && touched.email && (
                        <span className="inline-field-error">
                            <AlertCircle size={12} />
                            <span>{fieldErrors.email}</span>
                        </span>
                    )}
                </div>

                {/* Password Field */}
                <div className="login-field-group">
                    <label className="login-label">Password</label>
                    <div className={`login-input-wrapper ${fieldErrors.password && touched.password ? 'input-has-error' : ''}`}>
                        <Lock size={18} className="input-leading-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (fieldErrors.password) validateForm();
                            }}
                            onBlur={() => handleBlur('password')}
                            placeholder="••••••••"
                            className="login-input with-leading-icon"
                            style={{ paddingRight: '44px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="login-password-toggle"
                            aria-label="Toggle Password Visibility"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {fieldErrors.password && touched.password && (
                        <span className="inline-field-error">
                            <AlertCircle size={12} />
                            <span>{fieldErrors.password}</span>
                        </span>
                    )}

                    <a
                        href="#forgot"
                        onClick={(e) => {
                            e.preventDefault();
                            onNavigate('forgot_password');
                        }}
                        className="login-forgot-link"
                    >
                        Forgot password?
                    </a>
                </div>

                {/* Submit Sign In Button */}
                <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>

            {/* Or Divider */}
            <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <div className="login-divider-line" />
            </div>

            {/* Social Logins */}
            <div className="login-social-group">
                {/* Google Button */}
                <button
                    type="button"
                    className="login-social-btn"
                    onClick={() => setShowGoogleModal(true)}
                >
                    <svg className="login-social-icon" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                {/* Apple Button */}
                <button
                    type="button"
                    className="login-social-btn"
                    onClick={() => setShowAppleModal(true)}
                >
                    <svg className="login-social-icon" viewBox="0 0 24 24" fill="#000000">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.81 1.13-1.94 1-3.07-.98.04-2.18.65-2.88 1.47-.63.73-1.18 1.89-1.03 3.01 1.1.09 2.23-.55 2.91-1.41z" />
                    </svg>
                    <span>Continue with Apple</span>
                </button>
            </div>

            {/* Bottom Footer */}
            <div className="login-footer-text">
                <span>Don't have an account?</span>
                <span
                    className="login-signup-link"
                    onClick={() => onNavigate('signup')}
                >
                    Sign up
                </span>
            </div>

            {/* Google Mobile Auth Modal */}
            <GoogleAuthModal
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onSuccess={async (googleUser) => {
                    await loginWithGoogle(googleUser);
                    if (onNavigate) onNavigate('home');
                }}
                role="customer"
            />

            {/* Apple Mobile Auth Modal */}
            <AppleAuthModal
                isOpen={showAppleModal}
                onClose={() => setShowAppleModal(false)}
                onSuccess={(appleUser) => {
                    loginWithGoogle(appleUser);
                    if (onNavigate) onNavigate('home');
                }}
                role="customer"
            />
        </div>
    );
}
