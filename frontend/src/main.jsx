import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

// Universal API routing helper:
// In production (e.g. Vercel), replace http://localhost:5000 with the current origin (https://pickfresh-mobile.vercel.app)
// In local mobile network testing (e.g. 192.168.x.x), route to that local IP with port 5000
if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = function (resource, init) {
        if (typeof resource === 'string' && resource.includes('http://localhost:5000')) {
            const host = window.location.hostname;
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                if (host.includes('vercel.app') || window.location.protocol === 'https:') {
                    resource = resource.replace('http://localhost:5000', window.location.origin);
                } else {
                    resource = resource.replace('http://localhost:5000', `http://${host}:5000`);
                }
            }
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
