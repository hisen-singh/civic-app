import { SyncService } from '../services/SyncService';
import { IssueService } from '../services/IssueService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

jest.mock('../services/IssueService', () => ({
    IssueService: {
        uploadImage: jest.fn(),
        addIssue: jest.fn(),
    }
}));

jest.mock('expo-file-system', () => ({
    documentDirectory: 'file:///mock/doc/dir/',
    copyAsync: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
    fetch: jest.fn(),
}));

describe('SyncService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('enqueues an issue and moves local photo to document directory', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
        
        const issue = { title: 'Pothole', photo: 'file:///tmp/cache/photo.jpg' };
        
        await SyncService.enqueueIssue(issue);
        
        expect(FileSystem.copyAsync).toHaveBeenCalledWith({
            from: 'file:///tmp/cache/photo.jpg',
            to: 'file:///mock/doc/dir/photo.jpg'
        });
        
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            '@civic_offline_queue',
            expect.stringContaining('file:///mock/doc/dir/photo.jpg')
        );
    });

    it('processes queue and uploads local photos when online', async () => {
        NetInfo.fetch.mockResolvedValueOnce({ isConnected: true });
        
        const queuedIssue = {
            title: 'Pothole',
            photo: 'file:///mock/doc/dir/photo.jpg',
            _queuedAt: Date.now()
        };
        
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([queuedIssue]));
        IssueService.uploadImage.mockResolvedValueOnce('https://firebase.storage/photo.jpg');
        IssueService.addIssue.mockResolvedValueOnce({ id: '123' });
        
        await SyncService.processQueue();
        
        expect(IssueService.uploadImage).toHaveBeenCalledWith('file:///mock/doc/dir/photo.jpg');
        expect(IssueService.addIssue).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Pothole',
            photo: 'https://firebase.storage/photo.jpg'
        }));
        
        // Queue should be cleared
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@civic_offline_queue', '[]');
    });
});
