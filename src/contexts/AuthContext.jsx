import { createContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { COLLECTIONS, claimEnrollment } from '../utils/firestore.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, COLLECTIONS.users, u.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const register = async ({
    email,
    password,
    fullName,
    phone,
    role = 'farmer',
    claimCode = ''
  }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName: fullName });

    const userDoc = {
      uid: cred.user.uid,
      email,
      fullName,
      phone: phone || '',
      role,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, COLLECTIONS.users, cred.user.uid), userDoc);

    let claimedEnrollmentId = null;
    if (role === 'farmer' && claimCode?.trim()) {
      try {
        claimedEnrollmentId = await claimEnrollment(cred.user.uid, claimCode, {
          farmName: '',
          phone: phone || ''
        });
      } catch {
        // Best-effort — registration succeeds even if claim fails.
        claimedEnrollmentId = null;
      }
    }

    const finalProfile = claimedEnrollmentId
      ? { ...userDoc, claimedEnrollmentId }
      : userDoc;
    setProfile(finalProfile);
    return { user: cred.user, claimedEnrollmentId };
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  const updateUserProfile = async (updates) => {
    if (!user) return;
    await setDoc(doc(db, COLLECTIONS.users, user.uid), updates, { merge: true });
    setProfile((p) => ({ ...(p || {}), ...updates }));
  };

  const value = {
    user,
    profile,
    loading,
    register,
    login,
    logout,
    updateProfile: updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
