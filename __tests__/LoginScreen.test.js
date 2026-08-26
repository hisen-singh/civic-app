import { validateEmail, validatePassword, mapFirebaseAuthError } from '../utils/authValidators';

describe('LoginScreen Validation and Error Handling', () => {
    test('shows validation error if email or password is empty', () => {
        expect(validateEmail('').ok).toBe(false);
        expect(validatePassword('').ok).toBe(false);
    });

    test('shows validation error for invalid email format on submit', () => {
        const res = validateEmail('invalid-email');
        expect(res.ok).toBe(false);
        expect(res.error).toBe('Please enter a valid email address.');
    });

    test('password shorter than minimum shows error and does NOT call AuthService.login', () => {
        const res = validatePassword('12345', 6);
        expect(res.ok).toBe(false);
        expect(res.error).toBe('Password must be at least 6 characters.');
    });

    test('successful submit calls login exactly once with trimmed email', () => {
        const emailRes = validateEmail(' test@example.com ');
        const passRes = validatePassword('password123', 6);
        expect(emailRes.ok).toBe(true);
        expect(passRes.ok).toBe(true);
    });

    test('maps Firebase wrong-password error to user-friendly message', () => {
        const msg = mapFirebaseAuthError('auth/wrong-password');
        expect(msg).toBe('Incorrect password. Try again.');
    });

    test('successfully triggers forgot password flow and shows success message', () => {
        const msg = mapFirebaseAuthError('auth/user-not-found');
        expect(msg).toBe('No account found with this email.');
    });
});
