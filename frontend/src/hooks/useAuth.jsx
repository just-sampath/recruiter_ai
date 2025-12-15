import { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, setAuthToken, clearAuth, apiJson } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            // Decode JWT to get user info (simple decode, no verification)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({
                    id: payload.sub,
                    email: payload.email,
                    role: payload.role,
                });
            } catch {
                clearAuth();
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await apiJson('/auth/recruiter/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (response.token) {
            setAuthToken(response.token);
            const payload = JSON.parse(atob(response.token.split('.')[1]));
            setUser({
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            });
            return true;
        }
        return false;
    };

    const logout = () => {
        clearAuth();
        setUser(null);
    };

    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
