export interface User {
  uid: string;
  email: string;
  displayName: string;
  trustScore?: number;
  rank?: string;
  reported?: number;
  solved?: number;
  fcmToken?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'Open' | 'In Progress' | 'Solved' | 'Failed';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  latitude: number | null;
  longitude: number | null;
  authorId: string;
  authorName: string;
  youtubeUrl?: string;
  photo?: string;
  afterPhoto?: string;
  votes: number;
  voters: string[];
  solvers: string[];
  commentsCount: number;
  createdAt: string;
  timestamp: any; // Firebase serverTimestamp
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  timestamp: any;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  timestamp: any;
}
