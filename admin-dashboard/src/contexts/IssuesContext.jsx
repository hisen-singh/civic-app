import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const IssuesContext = createContext({ issues: [], loading: true });

export function useIssues() {
  return useContext(IssuesContext);
}

export function IssuesProvider({ children }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(data);
      setLoading(false);
    }, (error) => {
      console.error('[IssuesContext] Firestore subscription error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <IssuesContext.Provider value={{ issues, loading }}>
      {children}
    </IssuesContext.Provider>
  );
}
