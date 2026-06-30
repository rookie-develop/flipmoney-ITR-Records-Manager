import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3 font-sans">
        <RefreshCw id="app-loading-icon" className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-sm text-slate-500 font-medium">Initializing FlipMoney Security...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {user ? (
        <Dashboard user={user} />
      ) : (
        <Login onLoginSuccess={() => {}} />
      )}
    </div>
  );
}
