import React, { useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import IssueCard from '../components/IssueCard';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';

export default function SolveScreen() {
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchIssues = async () => {
                try {
                    const allIssues = await IssueService.getAllIssues();
                    const uid = user?.uid;
                    const name = user?.displayName;
                    
                    // Show issues that the current user didn't report and aren't solved/failed
                    const communityIssues = allIssues.filter(i => 
                        (i.authorId !== uid && i.authorName !== name) && 
                        (i.status !== 'Solved') && 
                        (i.status !== 'Failed')
                    );
                    setIssues(communityIssues);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchIssues();
        }, [user])
    );

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0B1120' }}>
            <View style={{ backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Solve Issues</Text>
                <Text style={{ fontSize: 14, color: '#E0E7FF', opacity: 0.9 }}>Earn rewards & impact your community</Text>
            </View>

            <View style={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator animating={true} color="#4F46E5" style={{ marginTop: 40 }} />
                ) : issues.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
                        <Text style={{ fontSize: 64, marginBottom: 16, opacity: 0.8 }}>🏆</Text>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#F8FAFC', textAlign: 'center', marginBottom: 8 }}>All caught up!</Text>
                        <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 }}>
                            The community has no open issues right now. Great job keeping the city clean!
                        </Text>
                    </View>
                ) : (
                    issues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} />
                    ))
                )}
            </View>
        </ScrollView>
    );
}
