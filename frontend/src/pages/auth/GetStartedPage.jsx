import React from 'react';
import { Leaf, Clock, Sparkles } from 'lucide-react';
import './GetStartedPage.css';

export default function GetStartedPage({ onNavigate }) {
    return (
        <div className="get-started-container">
            {/* Top Fresh Produce Banner with Diagonal White Mask */}
            <div className="get-started-hero">
                <img
                    src="/fresh_produce_hero.png"
                    alt="Fresh Organic Vegetables & Fruits"
                    className="get-started-hero-img"
                />
                <div className="get-started-hero-mask" />
            </div>

            {/* Centered Overlapping Logo Box */}
            <div className="get-started-logo-wrapper">
                <div className="get-started-logo-card">
                    <img
                        src="/logo.jpg"
                        alt="PickFresh Logo"
                        className="get-started-logo-img"
                    />
                </div>
            </div>

            {/* Brand Title & Tagline */}
            <div className="get-started-title-section">
                <h1 className="get-started-title">PickFresh</h1>
                <p className="get-started-subtitle">Order Fresh. Pick Up Fast.</p>
            </div>

            {/* 3 Key Feature Cards */}
            <div className="get-started-features-list">
                {/* Feature 1 */}
                <div className="get-started-feature-card">
                    <div className="get-started-feature-icon-badge">
                        <Leaf size={20} />
                    </div>
                    <div className="get-started-feature-text">
                        <h3 className="get-started-feature-h3">Picked at Peak Ripeness</h3>
                        <p className="get-started-feature-p">
                            Sourced daily from local organic farms straight to your basket.
                        </p>
                    </div>
                </div>

                {/* Feature 2 */}
                <div className="get-started-feature-card">
                    <div className="get-started-feature-icon-badge">
                        <Clock size={20} />
                    </div>
                    <div className="get-started-feature-text">
                        <h3 className="get-started-feature-h3">Ready in 15 Minutes</h3>
                        <p className="get-started-feature-p">
                            Skip the busy checkout lines. Grab your order and head home.
                        </p>
                    </div>
                </div>

                {/* Feature 3 */}
                <div className="get-started-feature-card">
                    <div className="get-started-feature-icon-badge">
                        <Sparkles size={20} />
                    </div>
                    <div className="get-started-feature-text">
                        <h3 className="get-started-feature-h3">Smart Swap Alternatives</h3>
                        <p className="get-started-feature-p">
                            Item running low? Get instant, delicious alternatives recommended.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Primary Button & Sign In Link */}
            <div className="get-started-actions">
                <button
                    className="get-started-btn-primary"
                    onClick={() => onNavigate('signup')}
                >
                    Get Started
                </button>

                <div className="get-started-signin-text">
                    <span>Already have an account?</span>
                    <span
                        className="get-started-signin-link"
                        onClick={() => onNavigate('login')}
                    >
                        Sign In
                    </span>
                </div>
            </div>
        </div>
    );
}
