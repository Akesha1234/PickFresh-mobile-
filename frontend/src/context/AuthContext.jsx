import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('pickfresh_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [token, setToken] = useState(() => localStorage.getItem('pickfresh_token') || '');

    useEffect(() => {
        if (user) {
            localStorage.setItem('pickfresh_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('pickfresh_user');
        }
    }, [user]);

    useEffect(() => {
        if (token) {
            localStorage.setItem('pickfresh_token', token);
        } else {
            localStorage.removeItem('pickfresh_token');
        }
    }, [token]);

    useEffect(() => {
        if (token && user?.email) {
            fetch(`${API_BASE_URL}/auth/user-details?email=${encodeURIComponent(user.email)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        setUser(data.user);
                        localStorage.setItem('pickfresh_user', JSON.stringify(data.user));
                    }
                })
                .catch(err => console.warn('Failed to refresh user context:', err));
        }
    }, [token]);

    // Role Switcher
    const switchRole = (newRole) => {
        if (user) {
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
        }
    };

    // Strict Backend Login Call to MongoDB Atlas
    const login = async (email, password) => {
        if (!email || !password) {
            throw new Error('Please enter both email and password.');
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Invalid email or password.');
            }

            setToken(data.token);
            setUser(data.user);
            return data.user;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to PickFresh Backend API. Please ensure backend server is running on http://localhost:5000.');
            }
            throw error;
        }
    };

    // Strict Backend Register Call to MongoDB Atlas
    const register = async (userData) => {
        if (!userData.email || !userData.password) {
            throw new Error('Please fill in all required fields.');
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Registration failed.');
            }

            setToken(data.token);
            setUser(data.user);
            return data.user;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to PickFresh Backend API. Please ensure backend server is running on http://localhost:5000.');
            }
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken('');
        try {
            localStorage.clear();
            sessionStorage.clear();
            sessionStorage.setItem('pickfresh_next_page', 'login');
        } catch (e) { }
        // Force full refresh to clear all in-memory React and network states
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    };

    // Strict Backend Social Login Call to MongoDB Atlas
    const loginWithGoogle = async (socialUserData, providerOverride = 'google') => {
        const provider = socialUserData.provider ||
            (socialUserData.id && String(socialUserData.id).startsWith('apple') ? 'apple' : providerOverride);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/social-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    providerId: socialUserData.id || '',
                    name: socialUserData.name || '',
                    email: socialUserData.email,
                    picture: socialUserData.picture || '',
                    role: socialUserData.role || 'customer'
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Social authentication failed.');
            }

            setToken(data.token);
            setUser(data.user);
            return data.user;
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to PickFresh Backend API. Please ensure backend server is running.');
            }
            throw err;
        }
    };

    const updateUser = async (updatedFields) => {
        if (user) {
            const updated = { ...user, ...updatedFields };
            setUser(updated);
            localStorage.setItem('pickfresh_user', JSON.stringify(updated));

            try {
                const reqEmail = user.email || 'megasupplier@gmail.com';
                const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: reqEmail, id: user.id || user._id, role: user.role, ...updatedFields })
                });
                const data = await res.json();
                if (res.ok && data.success && data.user) {
                    const freshUser = { ...updated, ...data.user };
                    setUser(freshUser);
                    localStorage.setItem('pickfresh_user', JSON.stringify(freshUser));
                    return freshUser;
                }
            } catch (err) {
                console.warn('Backend profile sync pending:', err);
            }
        }
    };

    const deactivateAccount = async () => {
        if (user?.email) {
            try {
                await fetch(`${API_BASE_URL}/auth/deactivate-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email })
                });
            } catch (err) {
                console.warn('Backend account deactivation failed:', err);
            }
        }
        logout();
    };

    return (
        <AuthContext.Provider value={{ user, token, switchRole, login, register, loginWithGoogle, logout, updateUser, deactivateAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

