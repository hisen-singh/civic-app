// __tests__/AuthService.test.js
// Mock Firebase
jest.mock('../config/firebaseConfig', () => ({
  auth: { currentUser: null }
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  sendEmailVerification: jest.fn(),
}));

const { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = require('firebase/auth');
const { AuthService } = require('../services/AuthService');

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('login should return user and NOT call signOut', async () => {
    const mockUser = { uid: '123', email: 'test@test.com' };
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await AuthService.login('test@test.com', 'password123');

    expect(result).toEqual(mockUser);
    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    // THIS TEST WOULD HAVE CAUGHT THE BUG:
    expect(signOut).not.toHaveBeenCalled();
  });

  test('login should throw on wrong password', async () => {
    const error = new Error('Wrong password');
    error.code = 'auth/wrong-password';
    signInWithEmailAndPassword.mockRejectedValue(error);

    await expect(AuthService.login('test@test.com', 'wrong'))
      .rejects.toThrow('Wrong password');
  });

  test('signup should NOT call signOut', async () => {
    const mockUser = { uid: '456', email: 'new@test.com' };
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await AuthService.signup('Test User', 'new@test.com', 'pass123');

    expect(result).toEqual(mockUser);
    expect(signOut).not.toHaveBeenCalled();
  });
});
