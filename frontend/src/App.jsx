import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useCart } from './context/CartContext.jsx';
import WelcomePage from './pages/auth/WelcomePage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignUpPage from './pages/auth/SignUpPage.jsx';
import LogoPage from './pages/auth/LogoPage.jsx';
import GetStartedPage from './pages/auth/GetStartedPage.jsx';
import RoleSelectPage from './pages/auth/RoleSelectPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import CustomerDashboard from './pages/dashboard/CustomerDashboard.jsx';
import ShopOwnerDashboard from './pages/dashboard/ShopOwnerDashboard.jsx';
import SupplierDashboard from './pages/dashboard/SupplierDashboard.jsx';
import {
    ShoppingBag,
    Store,
    Truck,
    CheckCircle,
    User,
    Search,
    Calendar,
    Clock,
    ShieldCheck,
    LogOut,
    ChevronRight
} from 'lucide-react';

export default function App() {
    const { user, switchRole, logout } = useAuth();
    const { cartItems, totalAmount } = useCart();
    const [currentPage, setCurrentPage] = useState('logo'); // logo, welcome, login, roleselect, signup, home
    const [selectedRole, setSelectedRole] = useState('customer');
    const [activeTab, setActiveTab] = useState('home');

    const handleNavigate = (page) => {
        if (page === 'signup' && currentPage !== 'roleselect') {
            setCurrentPage('roleselect');
            return;
        }
        setCurrentPage(page);
    };

    const handleLogout = () => {
        logout();
        setCurrentPage('welcome');
    };

    return (
        <div className="mobile-device-shell">
            {/* Top Phone Status Bar (Preserves top white space layout) */}
            <div className="phone-notch-bar"></div>

            {/* Render Auth Pages vs Main App Viewport */}
            {currentPage === 'logo' && <LogoPage onNavigate={handleNavigate} />}
            {(currentPage === 'welcome' || currentPage === 'getstarted') && <GetStartedPage onNavigate={handleNavigate} />}
            {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
            {currentPage === 'roleselect' && (
                <RoleSelectPage
                    onNavigate={handleNavigate}
                    selectedRole={selectedRole}
                    onSelectRole={setSelectedRole}
                />
            )}
            {currentPage === 'signup' && (
                <SignUpPage
                    onNavigate={handleNavigate}
                    selectedRole={selectedRole}
                />
            )}
            {currentPage === 'forgot_password' && (
                <ForgotPasswordPage onNavigate={handleNavigate} />
            )}

            {currentPage === 'home' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {user?.role === 'shop_owner' ? (
                        <ShopOwnerDashboard onNavigate={handleNavigate} />
                    ) : user?.role === 'supplier' ? (
                        <SupplierDashboard onNavigate={handleNavigate} />
                    ) : (
                        <CustomerDashboard onNavigate={handleNavigate} />
                    )}
                </div>
            )}
        </div>
    );
}
