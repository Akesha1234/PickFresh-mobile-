/**
 * Google Identity Services & OAuth 2.0 Real Authentication for PickFresh
 */

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '288269881432-gfdp4g2ucqjo2bf445810gqv2g06ac08.apps.googleusercontent.com';

export const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Failed to parse JWT token', e);
        return null;
    }
};

/**
 * Triggers REAL Google OAuth Sign-In.
 * Uses Google Identity Services OAuth 2.0 Token Client (Official standard for custom buttons).
 */
export const triggerGoogleAuth = ({ onSuccess, onError, role = 'customer' }) => {
    // 1. Ensure Google SDK is present
    if (typeof window === 'undefined' || !window.google) {
        if (onError) onError('Google Identity Services SDK is not loaded. Please check your internet connection.');
        return;
    }

    const clientId = GOOGLE_CLIENT_ID;

    // Check if OAuth2 Token Client is available (Preferred for custom buttons)
    if (window.google?.accounts?.oauth2?.initTokenClient) {
        try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'email profile openid',
                callback: async (tokenResponse) => {
                    if (tokenResponse.error) {
                        console.error('Google OAuth error response:', tokenResponse);
                        if (onError) onError(tokenResponse.error_description || tokenResponse.error);
                        return;
                    }

                    if (tokenResponse.access_token) {
                        try {
                            // Fetch real user profile from Google's official userinfo API
                            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                            });
                            const profile = await res.json();

                            if (!profile.email) {
                                throw new Error('Could not retrieve email from Google account.');
                            }

                            const googleUserData = {
                                id: profile.sub || 'g_' + Date.now(),
                                name: profile.name || profile.given_name || profile.email.split('@')[0],
                                email: profile.email,
                                picture: profile.picture || '',
                                role: role,
                                provider: 'google'
                            };

                            if (onSuccess) onSuccess(googleUserData);
                        } catch (fetchErr) {
                            console.error('Error fetching Google profile:', fetchErr);
                            if (onError) onError(fetchErr.message || 'Failed to fetch Google profile details.');
                        }
                    }
                }
            });

            // Prompt real Google account chooser popup
            tokenClient.requestAccessToken({ prompt: 'select_account' });
            return;
        } catch (err) {
            console.warn('OAuth2 token client init failed, trying ID prompt fallback:', err);
        }
    }

    // Fallback: Google Accounts ID (One Tap / Credential)
    if (window.google?.accounts?.id) {
        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    if (response.credential) {
                        const payload = parseJwt(response.credential);
                        if (payload) {
                            const googleUserData = {
                                id: payload.sub,
                                name: payload.name || payload.given_name || 'Google User',
                                email: payload.email,
                                picture: payload.picture || '',
                                role: role,
                                provider: 'google'
                            };
                            if (onSuccess) onSuccess(googleUserData);
                        } else if (onError) {
                            onError('Failed to decode Google Token');
                        }
                    }
                }
            });

            window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    console.log('Google One Tap notification:', notification.getNotDisplayedReason());
                }
            });
        } catch (err) {
            console.error('Google Auth Fallback Error:', err);
            if (onError) onError(err.message);
        }
    }
};
