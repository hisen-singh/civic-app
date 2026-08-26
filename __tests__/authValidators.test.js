import {
    validateEmail,
    validatePassword,
    validatePasswordMatch,
    mapFirebaseAuthError
} from '../utils/authValidators';

describe('Auth Validators', () => {
    describe('validateEmail', () => {
        test('valid email', () => {
            expect(validateEmail('test@example.com').ok).toBe(true);
        });
        test('empty email', () => {
            const res = validateEmail('');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Email is required.');
        });
        test('missing @', () => {
            const res = validateEmail('testexample.com');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Please enter a valid email address.');
        });
        test('spaces in email', () => {
            const res = validateEmail('test @example.com');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Please enter a valid email address.');
        });
    });

    describe('validatePassword', () => {
        test('valid password (exact min)', () => {
            expect(validatePassword('123456', 6).ok).toBe(true);
        });
        test('invalid password (min-1)', () => {
            const res = validatePassword('12345', 6);
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Password must be at least 6 characters.');
        });
        test('empty password', () => {
            const res = validatePassword('');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Password is required.');
        });
    });

    describe('validatePasswordMatch', () => {
        test('match', () => {
            expect(validatePasswordMatch('password123', 'password123').ok).toBe(true);
        });
        test('mismatch', () => {
            const res = validatePasswordMatch('password123', 'password321');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Passwords do not match.');
        });
        test('empty confirm', () => {
            const res = validatePasswordMatch('password123', '');
            expect(res.ok).toBe(false);
            expect(res.error).toBe('Please confirm your password.');
        });
    });

    describe('mapFirebaseAuthError', () => {
        test('auth/user-not-found', () => {
            expect(mapFirebaseAuthError('auth/user-not-found')).toBe('No account found with this email.');
        });
        test('auth/wrong-password', () => {
            expect(mapFirebaseAuthError('auth/wrong-password')).toBe('Incorrect password. Try again.');
        });
        test('auth/too-many-requests', () => {
            expect(mapFirebaseAuthError('auth/too-many-requests')).toBe('Too many attempts. Please wait.');
        });
        test('auth/email-already-in-use', () => {
            expect(mapFirebaseAuthError('auth/email-already-in-use')).toBe('This email is already registered.');
        });
        test('auth/weak-password', () => {
            expect(mapFirebaseAuthError('auth/weak-password')).toBe('Password is too weak. Please use a stronger password.');
        });
        test('auth/invalid-email', () => {
            expect(mapFirebaseAuthError('auth/invalid-email')).toBe('Please enter a valid email address.');
        });
        test('auth/invalid-credential', () => {
            expect(mapFirebaseAuthError('auth/invalid-credential')).toBe('Invalid email or password.');
        });
        test('unknown fallback', () => {
            expect(mapFirebaseAuthError('auth/some-random-error')).toBe('Authentication failed. Please try again.');
        });
    });
});
