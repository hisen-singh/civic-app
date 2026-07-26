// __tests__/AuthService.test.js
// Mock Firebase Auth and AsyncStorage rigorously for React Native persistence
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(
    (storage) => `mock_persistence_${storage}`,
  ),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  sendEmailVerification: jest.fn(),
  getAuth: jest.fn(() => ({ currentUser: null })), // Fallback if getAuth is used
}));

// Mock Firebase App
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
  getApps: jest.fn(() => []),
}));

jest.mock("firebase/firestore", () => ({
  initializeFirestore: jest.fn(),
  persistentLocalCache: jest.fn(),
}));
jest.mock("firebase/analytics", () => ({
  getAnalytics: jest.fn(),
}));
jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(),
}));
jest.mock("firebase/remote-config", () => ({
  getRemoteConfig: jest.fn(() => ({ settings: {}, defaultConfig: {} })),
}));

const {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  initializeAuth,
  getReactNativePersistence,
} = require("firebase/auth");
const AsyncStorage = require("@react-native-async-storage/async-storage");
const { AuthService } = require("../services/AuthService");

describe("AuthService & Firebase Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Firebase Auth is rigorously initialized with React Native local session persistence", () => {
    // TDD Contract: Verify that initializeAuth is explicitly called with getReactNativePersistence
    // We isolate modules to re-require the firebaseConfig where initialization happens
    jest.isolateModules(() => {
      require("../config/firebaseConfig");
    });

    expect(getReactNativePersistence).toHaveBeenCalledTimes(1);
    expect(getReactNativePersistence).toHaveBeenCalledWith(AsyncStorage);

    expect(initializeAuth).toHaveBeenCalledTimes(1);
    expect(initializeAuth).toHaveBeenCalledWith(
      expect.anything(), // The firebase app instance
      expect.objectContaining({
        persistence: getReactNativePersistence(AsyncStorage),
      }),
    );
  });

  test("login should return user and NOT call signOut", async () => {
    const mockUser = { uid: "123", email: "test@test.com" };
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await AuthService.login("test@test.com", "password123");

    expect(result).toEqual(mockUser);
    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
  });

  test("login should throw on wrong password", async () => {
    const error = new Error("Wrong password");
    error.code = "auth/wrong-password";
    signInWithEmailAndPassword.mockRejectedValue(error);

    await expect(AuthService.login("test@test.com", "wrong")).rejects.toThrow(
      "Wrong password",
    );
  });

  test("signup should NOT call signOut", async () => {
    const mockUser = { uid: "456", email: "new@test.com" };
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await AuthService.signup(
      "Test User",
      "new@test.com",
      "pass123",
    );

    expect(result).toEqual(mockUser);
    expect(signOut).not.toHaveBeenCalled();
  });
});
