import { createContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import {
  COLLECTIONS,
  claimEnrollment,
  claimPendingInvitesForCurrentUser
} from '../utils/firestore.js';

export const AuthContext = createContext(null);

/**
 * Dev-preview hook. Local-only: when running `npm run dev`, a
 * `?devUser=<role>` query param injects a mock user + profile so the
 * dashboards render without sign-in. Disabled in production builds
 * via `import.meta.env.DEV`.
 */
function readDevPreviewRole(search) {
  if (!import.meta.env?.DEV) return null;
  try {
    const params = new URLSearchParams(search);
    const v = params.get('devUser');
    if (!v) return null;
    const role = String(v).toLowerCase();
    if (['farmer', 'exporter', 'buyer', 'enroller', 'admin'].includes(role)) {
      return role;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function makeDevUser(role) {
  const isAdmin = role === 'admin';
  return {
    user: {
      uid: `dev-${role}`,
      email: `dev.${role}@kokopass.local`,
      displayName: `Dev ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
      getIdTokenResult: async () => ({ claims: { admin: isAdmin, orgs: {} } }),
      getIdToken: async () => 'dev-token'
    },
    profile: {
      uid: `dev-${role}`,
      email: `dev.${role}@kokopass.local`,
      fullName: `Dev ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
      phone: '',
      role: isAdmin ? 'farmer' : role,
      admin: isAdmin,
      createdAt: new Date()
    }
  };
}

export function AuthProvider({ children }) {
  const location = useLocation();
  const devRole = readDevPreviewRole(location.search);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev-preview: skip the real Firebase listener and serve a mock
    // user. Re-runs when ?devUser= changes so a /dev nav between
    // roles works without a full reload.
    if (devRole) {
      const mock = makeDevUser(devRole);
      setUser(mock.user);
      setProfile(mock.profile);
      setLoading(false);
      return;
    }
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
  }, [devRole]);

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

    // Pick up any pendingInvites that match this email — added by org
    // admins via inviteOrgMember when no auth account existed yet.
    // Best-effort: if the callable isn't deployed or returns 0, no
    // harm done.
    let claimedInvites = { claimed: 0, orgs: [] };
    try {
      claimedInvites = await claimPendingInvitesForCurrentUser();
    } catch {
      claimedInvites = { claimed: 0, orgs: [] };
    }

    const finalProfile = claimedEnrollmentId
      ? { ...userDoc, claimedEnrollmentId }
      : userDoc;
    setProfile(finalProfile);
    return { user: cred.user, claimedEnrollmentId, claimedInvites };
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const updateUserProfile = async (updates) => {
    if (!user) return;
    await setDoc(doc(db, COLLECTIONS.users, user.uid), updates, { merge: true });
    // Keep the auth-side displayName in sync so it shows up in the
    // Firebase console + future SDKs that read user.displayName.
    if (typeof updates.fullName === 'string' && updates.fullName.trim()) {
      try {
        await fbUpdateProfile(auth.currentUser, { displayName: updates.fullName.trim() });
      } catch {
        /* non-fatal */
      }
    }
    setProfile((p) => ({ ...(p || {}), ...updates }));
  };

  const value = {
    user,
    profile,
    loading,
    register,
    login,
    logout,
    resetPassword,
    updateProfile: updateUserProfile,
    devPreviewRole: devRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
