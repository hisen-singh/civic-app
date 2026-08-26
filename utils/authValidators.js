export function validateEmail(email) {
    if (!email || !email.trim()) {
        return { ok: false, error: 'Email is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return { ok: false, error: 'Please enter a valid email address.' };
    }
    return { ok: true };
}

export function validatePassword(password, min = 6) {
    if (!password) {
        return { ok: false, error: 'Password is required.' };
    }
    if (password.length < min) {
        return { ok: false, error: `Password must be at least ${min} characters.` };
    }
    return { ok: true };
}

export function validatePasswordMatch(password, confirmPassword) {
    if (!confirmPassword) {
        return { ok: false, error: 'Please confirm your password.' };
    }
    if (password !== confirmPassword) {
        return { ok: false, error: 'Passwords do not match.' };
    }
    return { ok: true };
}

export function mapFirebaseAuthError(code) {
    switch (code) {
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Try again.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'This email is already registered.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use a stronger password.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        default:
            return 'Authentication failed. Please try again.';
    }
}
