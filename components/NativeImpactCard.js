import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NativeImpactCard({ issue }) {
  if (!issue) return null;

  const isResolved = issue.status === 'Solved';
  const accentColor = '#FF4500'; // Electric Orange for Utilitarian branding

  const createdDate = new Date(issue.createdAt);
  const now = new Date();
  const msOpen = now.getTime() - createdDate.getTime();
  const daysOpen = Math.max(1, Math.floor(msOpen / (1000 * 60 * 60 * 24)));

  return (
    <View style={styles.cardContainer}>
      {/* Massive Header Badge */}
      <View style={[styles.statusBadge, { backgroundColor: accentColor }]}>
        <Text style={[styles.statusText, { color: '#FFFFFF' }]}>
          {isResolved ? 'CIVIC HERO RECEIPT' : 'UNRESOLVED ISSUE'}
        </Text>
      </View>

      {/* Title & Category */}
      <View style={styles.contentSection}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{issue.category || 'GENERAL'}</Text>
        </View>
        <Text style={styles.title} numberOfLines={3}>
          {issue.title}
        </Text>
        <Text style={styles.location} numberOfLines={2}>
          {issue.location || 'Unknown Location'}
        </Text>
      </View>

      {/* Impact Metrics / Outrage Counter */}
      <View style={[styles.metricBox, { borderColor: accentColor }]}>
        <Text style={styles.metricLabel}>
          {isResolved ? 'RESOLVED BY COMMUNITY' : 'IGNORED BY CITY FOR'}
        </Text>
        <Text style={[styles.metricValue, { color: accentColor }]}>
          {isResolved ? 'FIXED' : `${daysOpen} DAYS`}
        </Text>
      </View>

      {/* Description Snapshot */}
      <View style={styles.descriptionSection}>
        <Text style={styles.descriptionText} numberOfLines={4}>
          "{issue.description}"
        </Text>
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <View style={styles.footerLogo}>
          <Text style={styles.logoText}>CIVIC</Text>
        </View>
        <Text style={styles.footerTagline}>POWERED BY CITIZENS</Text>
      </View>
    </View>
  );
}

// 9:16 aspect ratio: e.g. 400x711 or 540x960
const CARD_WIDTH = 540;
const CARD_HEIGHT = 960;

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    padding: 32,
    justifyContent: 'space-between',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 0, // Brutalist sharp
  },
  statusBadge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 0,
    // Hard shadow
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contentSection: {
    marginTop: 40,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    color: '#000000',
    fontSize: 48,
    fontWeight: '900',
    textTransform: 'uppercase',
    lineHeight: 52,
    marginBottom: 16,
  },
  location: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
    textTransform: 'uppercase',
    backgroundColor: '#F5F5F7',
    padding: 8,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
  },
  metricBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#000000',
    padding: 24,
    marginTop: 40,
    alignItems: 'center',
    // Hard offset shadow inside card
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  metricLabel: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 72,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  descriptionSection: {
    marginTop: 40,
    borderLeftWidth: 4,
    borderColor: '#000000',
    paddingLeft: 20,
  },
  descriptionText: {
    color: '#000000',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 4,
    borderColor: '#000000',
    paddingTop: 24,
  },
  footerLogo: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  footerTagline: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
