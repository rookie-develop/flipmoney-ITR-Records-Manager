import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, UserPlus, Key, Mail, Landmark, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAuthHelp, setShowAuthHelp] = useState(false);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowAuthHelp(false);

    // Basic Validation
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error('Auth Error:', err);
      // User-friendly error mapping
      switch (err.code) {
        case 'auth/invalid-email':
          setError('The email address is badly formatted.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password. Please try again.');
          break;
        case 'auth/email-already-in-use':
          setError('This email address is already in use.');
          break;
        case 'auth/weak-password':
          setError('The password is too weak.');
          break;
        case 'auth/network-request-failed':
          setError('Network failure. Please check your internet connection and try again.');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/Password sign-in is disabled in your Firebase console.');
          setShowAuthHelp(true);
          break;
        default:
          setError(err.message || 'Authentication failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@flipmoney.in');
    setPassword('demo123');
    setError(null);
    setShowAuthHelp(false);
    setLoading(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, 'demo@flipmoney.in', 'demo123');
      } catch (err: any) {
        // If demo account doesn't exist, create it on the fly! That's incredibly bulletproof!
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, 'demo@flipmoney.in', 'demo123');
        } else {
          throw err;
        }
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error('Demo Auth Error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is disabled in your Firebase console.');
        setShowAuthHelp(true);
      } else {
        setError('Could not initialize demo login. Feel free to register a new account!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-2 text-blue-600">
          <Landmark id="login-logo-icon" className="h-9 w-9" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-950">
            Flip<span className="text-blue-500">Money</span>
          </span>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          ITR Records Manager
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-500">
          Secure, high-density client filing and ledger engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 border-l-4 border-red-500 p-3.5 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 font-bold">
                {error}
              </div>
            </motion.div>
          )}

          {showAuthHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 bg-blue-50 border border-blue-200/80 p-3.5 rounded-lg text-xs text-blue-900 space-y-2"
            >
              <p className="font-bold">How to enable Email/Password Authentication:</p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-800">
                <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-blue-950">Firebase Console</a></li>
                <li>Select the project: <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-[10px]">itr-filing-512ed</span></li>
                <li>Go to <span className="font-semibold">Build &gt; Authentication</span> in the left sidebar</li>
                <li>Click the <span className="font-semibold">Sign-in method</span> tab</li>
                <li>Click <span className="font-semibold">Add new provider</span> and select <span className="font-semibold">Email/Password</span></li>
                <li>Enable the <span className="font-semibold">Email/Password</span> option and click <span className="font-semibold">Save</span></li>
              </ol>
              <p className="text-[10px] text-blue-700 font-medium">Once saved, refresh this app and sign in with the Demo account or register a new administrator.</p>
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-600">
                Email Address
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-600">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                ) : isSignUp ? (
                  <UserPlus className="h-4 w-4 mr-1.5" />
                ) : (
                  <LogIn className="h-4 w-4 mr-1.5" />
                )}
                {isSignUp ? 'Create Admin Account' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="bg-white px-2">Quick Testing</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                id="login-demo-btn"
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                Login with Demo Account (demo@flipmoney.in)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              id="login-toggle-mode"
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
