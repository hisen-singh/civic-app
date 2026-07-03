import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { BackendService } from '../services/BackendService';

export const AuthContext = createContext();

const AUTH_TIMEOUT_MS = 8000; // Don't block the app for more than 8 seconds

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const authResolved = useRef(false);

    useEffect(() => {
        // Safety timeout — if Firebase auth doesn't respond in time,
        // stop blocking the app (user will land on login screen)
        const timeoutId = setTimeout(() => {
            if (!authResolved.current) {
                console.warn('[AuthContext] Auth timed out after', AUTH_TIMEOUT_MS, 'ms — unblocking app');
                authResolved.current = true;
                setLoading(false);
            }
        }, AUTH_TIMEOUT_MS);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            authResolved.current = true;
            setUser(firebaseUser);
            setLoading(false);

            if (firebaseUser) {
                // Check admin custom claim
                try {
                    const tokenResult = await firebaseUser.getIdTokenResult();
                    setIsAdmin(tokenResult.claims.admin === true);
                } catch (e) {
                    console.warn('[AuthContext] Failed to check admin claim:', e);
                    setIsAdmin(false);
                }

                // Register push token when user logs in (fire-and-forget)
                BackendService.registerPushToken().catch(err =>
                    console.warn('[AuthContext] Push token registration failed:', err)
                );
            } else {
                setIsAdmin(false);
            }
        });

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    // Helper to reload user and force React to re-render (useful after email verification)
    const reloadUser = async () => {
        if (user) {
            await user.reload();
            setUser({ ...auth.currentUser });
        }
    };

    // Always render children — let consumers decide how to handle loading state
    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, reloadUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
