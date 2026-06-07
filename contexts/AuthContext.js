import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { BackendService } from '../services/BackendService';

const AuthContext = createContext();

const AUTH_TIMEOUT_MS = 8000; // Don't block the app for more than 8 seconds

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
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

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            authResolved.current = true;
            setUser(firebaseUser);
            setLoading(false);

            // Register push token when user logs in (fire-and-forget)
            if (firebaseUser) {
                BackendService.registerPushToken().catch(err =>
                    console.warn('[AuthContext] Push token registration failed:', err)
                );
            }
        });

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    // Always render children — let consumers decide how to handle loading state
    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
