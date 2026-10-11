import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LogoPage.css';

export default function LogoPage({ onNavigate }) {
    const { user } = useAuth();

    // Automatically transition to Home (if logged in) or Welcome page after 2.5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onNavigate) {
                if (user) {
                    onNavigate('home');
                } else {
                    onNavigate('welcome');
                }
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, [onNavigate, user]);

    const handleScreenClick = () => {
        if (onNavigate) {
            if (user) {
                onNavigate('home');
            } else {
                onNavigate('welcome');
            }
        }
    };

    return (
        <div className="logo-splash-screen" onClick={handleScreenClick}>
            {/* Center Logo Box */}
            <div className="logo-splash-card-wrapper">
                <div className="logo-splash-card">
                    <img
                        src="/logo.jpg"
                        alt="PickFresh Logo"
                        className="logo-splash-img"
                    />
                </div>
            </div>

            {/* Subtle Splash Loading Indicator */}
            <div className="logo-splash-loader">
                <div className="logo-splash-loader-dot"></div>
                <div className="logo-splash-loader-dot"></div>
                <div className="logo-splash-loader-dot"></div>
            </div>
        </div>
    );
}
