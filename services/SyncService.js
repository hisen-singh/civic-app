import AsyncStorage from '@react-native-async-storage/async-storage';
import { IssueService } from './IssueService';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

const QUEUE_KEY = '@civic_offline_queue';
let isProcessing = false;

export const SyncService = {
    enqueueIssue: async (issueData) => {
        try {
            const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            let finalPhoto = issueData.photo;
            if (finalPhoto && !finalPhoto.startsWith('http') && !finalPhoto.includes(FileSystem.documentDirectory)) {
                const fileName = finalPhoto.split('/').pop();
                const newPath = FileSystem.documentDirectory + fileName;
                await FileSystem.copyAsync({ from: finalPhoto, to: newPath });
                finalPhoto = newPath;
            }
            
            queue.push({
                ...issueData,
                photo: finalPhoto,
                _queuedAt: Date.now()
            });
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            console.log(`[SyncService] Enqueued 1 issue. Total queue: ${queue.length}`);
        } catch (error) {
            console.error('[SyncService] Failed to enqueue issue:', error);
        }
    },

    processQueue: async () => {
        if (isProcessing) return;
        isProcessing = true;
        try {
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) return;

            const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
            let queue = queueStr ? JSON.parse(queueStr) : [];
            
            if (queue.length === 0) return;
            
            console.log(`[SyncService] Processing queue of ${queue.length} items...`);
            
            const newQueue = [];
            
            for (const item of queue) {
                try {
                    const { _queuedAt, ...issueData } = item;
                    
                    // Upload photo if it's a local URI
                    if (issueData.photo && !issueData.photo.startsWith('http')) {
                        issueData.photo = await IssueService.uploadImage(issueData.photo);
                        item.photo = issueData.photo; // Save uploaded URL back to item so it doesn't re-upload if addIssue fails
                    }
                    
                    await IssueService.addIssue(issueData);
                    console.log(`[SyncService] Successfully synced queued issue: ${issueData.title}`);
                } catch (error) {
                    console.error('[SyncService] Failed to sync queued issue, keeping in queue:', error);
                    newQueue.push(item);
                }
            }
            
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
        } catch (error) {
            console.error('[SyncService] Failed to process queue:', error);
        } finally {
            isProcessing = false;
        }
    }
};
