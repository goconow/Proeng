import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, auth, signInWithPopup, googleProvider, signOut, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setAuthError(null);
        // Ensure user exists in Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              streak: 0,
              isPro: false,
              createdAt: serverTimestamp(),
              lastActive: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error("Error ensuring user document:", e);
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    if (isSigningIn) return;
    
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Handle the specific errors reported by the user
      if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("Sign-in process was interrupted.");
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("The sign-in window was closed before completion.");
      } else if (error.code === 'auth/invalid-api-key') {
        setAuthError("Invalid Firebase API Key. Please check your configuration.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError("This domain is not authorized for sign-in. Please add 'localhost' and 'capacitor://localhost' to Authorized Domains in Firebase.");
      } else if (error.message?.includes('missing initial stage') || error.message?.includes('missing initial state')) {
        setAuthError("Authentication state mismatch. This often happens in Android apps if the Authorized Domains aren't set correctly. Please ensure 'localhost' is added to Authorized Domains in Firebase Console.");
      } else {
        // Log the full error for the user to see in their developer tools/logs
        const errorMessage = error.message || "Unknown error";
        const errorCode = error.code || "unknown";
        setAuthError(`Sign-in error (${errorCode}): ${errorMessage}`);
        console.error("Sign in error:", error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const clearError = () => setAuthError(null);

  const logOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSigningIn, isSigningOut, authError, clearError, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
