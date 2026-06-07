// __tests__/IssueService.test.js
import { getDocs, addDoc } from 'firebase/firestore';
import { IssueService } from '../services/IssueService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  arrayUnion: jest.fn(),
  increment: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../config/firebaseConfig', () => ({
  db: {}
}));

describe('IssueService cache and validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    IssueService.invalidateCache();
  });

  test('getAllIssues caches responses within TTL to prevent freezing', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: '1', data: () => ({ title: 'Test Issue' }) }]
    });

    const firstCall = await IssueService.getAllIssues();
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(firstCall.length).toBe(1);

    // Second call within TTL should return cached data instantly without hitting Firestore
    const secondCall = await IssueService.getAllIssues();
    expect(getDocs).toHaveBeenCalledTimes(1); // Should remain 1
    expect(secondCall).toEqual(firstCall);
  });

  test('getAllIssues deduplicates concurrent requests', async () => {
    // Simulate a slow network request
    getDocs.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { docs: [{ id: '2', data: () => ({ title: 'Concurrent' }) }] };
    });

    // Call getAllIssues 3 times simultaneously (e.g. from 3 different components mounting)
    const [call1, call2, call3] = await Promise.all([
      IssueService.getAllIssues(),
      IssueService.getAllIssues(),
      IssueService.getAllIssues()
    ]);

    // Firestore should only be called ONCE to save bandwidth and prevent freezing
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(call1).toEqual(call2);
    expect(call2).toEqual(call3);
  });

  test('addIssue rejects photos larger than 700KB to stay under Firestore limit', async () => {
    const largePhoto = 'a'.repeat(700001); // Simulate a string > 700KB
    await expect(IssueService.addIssue({ title: 'Giant Photo Issue', photo: largePhoto }))
      .rejects.toThrow('Photo is too large');
  });

  test('addIssue invalidates cache so new issues show up immediately', async () => {
    addDoc.mockResolvedValueOnce({ id: '3' });
    
    // First fetch populates the cache
    getDocs.mockResolvedValueOnce({ docs: [] });
    await IssueService.getAllIssues();
    
    // Add a new issue (should invalidate cache)
    await IssueService.addIssue({ title: 'New Issue' });
    
    // Second fetch should hit Firestore again because cache was invalidated
    getDocs.mockResolvedValueOnce({ docs: [{ id: '3', data: () => ({ title: 'New Issue' }) }] });
    await IssueService.getAllIssues();
    
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
