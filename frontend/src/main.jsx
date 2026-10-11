import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

// Seamless network support for React Native & mobile devices:
// If accessed from a mobile device or network IP, automatically route API requests to that host
if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const originalFetch = window.fetch;
    window.fetch = function (resource, init) {
        if (typeof resource === 'string' && resource.includes('http://localhost:5000')) {
            resource = resource.replace('http://localhost:5000', `http://${window.location.hostname}:5000`);
        }
        return originalFetch(resource, init);
    };
}

// Check if running inside React Native WebView
if (typeof window !== 'undefined') {
    if (window.ReactNativeWebView || (window.navigator && window.navigator.userAgent && window.navigator.userAgent.includes('PickFreshApp'))) {
        document.body.classList.add('in-react-native');
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <CartProvider>
                <App />
            </CartProvider>
        </AuthProvider>
    </React.StrictMode>,
);
