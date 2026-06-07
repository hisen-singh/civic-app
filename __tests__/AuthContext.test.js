import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { BackendService } from '../services/BackendService';

// Mock Dependencies
jest.mock('firebase/auth', () => ({
  __esModule: true,
  onAuthStateChanged: jest.fn()
}));

jest.mock('../config/firebaseConfig', () => ({
  auth: {}
}));

jest.mock('../services/BackendService', () => ({
  BackendService: {
    registerPushToken: jest.fn().mockResolvedValue()
  }
}));

// A dummy component to consume the context
const AuthConsumer = () => {
  const { user, loading } = useAuth();
  return (
    <>
      <div testID="loading">{loading.toString()}</div>
      <div testID="user">{user ? user.uid : 'null'}</div>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes with loading: true and user: null', () => {
    // Hang the auth callback
    onAuthStateChanged.mockImplementation(() => () => {});

    let tree;
    act(() => {
      tree = renderer.create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    const loadingText = tree.root.findByProps({ testID: 'loading' }).props.children;
    const userText = tree.root.findByProps({ testID: 'user' }).props.children;

    expect(loadingText).toBe('true');
    expect(userText).toBe('null');
  });

  test('updates state when onAuthStateChanged successfully returns a user', () => {
    let authCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback;
      return () => {}; // return unsubscribe function
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    // Simulate firebase logging the user in
    act(() => {
      authCallback({ uid: 'user123' });
    });

    const loadingText = tree.root.findByProps({ testID: 'loading' }).props.children;
    const userText = tree.root.findByProps({ testID: 'user' }).props.children;

    expect(loadingText).toBe('false');
    expect(userText).toBe('user123');
    
    // Ensure push token is registered when user logs in
    expect(BackendService.registerPushToken).toHaveBeenCalled();
  });

  test('safety timeout unblocks the app after 8 seconds if Firebase hangs', () => {
    // Simulate a complete Firebase freeze
    onAuthStateChanged.mockImplementation(() => () => {});

    let tree;
    act(() => {
      tree = renderer.create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    // Fast-forward time by 8000ms
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // The context should have forced loading to false so the app doesn't hang forever
    const loadingText = tree.root.findByProps({ testID: 'loading' }).props.children;
    expect(loadingText).toBe('false');
  });
});
