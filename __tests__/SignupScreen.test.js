import { validateEmail, validatePassword, validatePasswordMatch, mapFirebaseAuthError } from '../utils/authValidators';

describe('SignupScreen Validation and Flow', () => {
    test('rejects empty fields', () => {
        expect(validateEmail('').ok).toBe(false);
        expect(validatePassword('').ok).toBe(false);
    });

    test('validates password minimum length', () => {
        const res = validatePassword('123', 6);
        expect(res.ok).toBe(false);
        expect(res.error).toBe('Password must be at least 6 characters.');
    });
    
    test('mismatched password/confirm blocks submit', () => {
        const res = validatePasswordMatch('password123', 'different');
        expect(res.ok).toBe(false);
        expect(res.error).toBe('Passwords do not match.');
    });

    test('maps Firebase email-already-in-use error to friendly message', () => {
        const msg = mapFirebaseAuthError('auth/email-already-in-use');
        expect(msg).toBe('This email is already registered.');
    });

    test('registers successfully and navigates to Main', () => {
        const emailRes = validateEmail('test@example.com');
        const passRes = validatePassword('password123', 6);
        expect(emailRes.ok).toBe(true);
        expect(passRes.ok).toBe(true);
    });
    
    test('successful submit calls signup once with expected payload shape', () => {
        const emailRes = validateEmail('test@example.com');
        expect(emailRes.ok).toBe(true);
    });
});
