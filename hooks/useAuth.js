import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { AuthService } from '../services/AuthService';

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return {
        user: context.user,
        loading: context.loading,
        login: AuthService.login,
        signup: AuthService.signup,
        logout: AuthService.logout,
        resetPassword: AuthService.resetPassword,
        resendVerificationEmail: AuthService.resendVerificationEmail,
        getCurrentUser: AuthService.getCurrentUser
    };
};
