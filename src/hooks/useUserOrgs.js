import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth.js';

/**
 * Read the signed-in user's organization memberships from the live ID
 * token claims (`request.auth.token.orgs`, mirrored by the
 * syncMembershipClaims Cloud Function).
 *
 * Returns:
 *   {
 *     orgs:    { [orgId]: role } | null,  // null while loading
 *     loading: boolean,
 *     refresh: () => Promise<void>        // forces a token refresh
 *   }
 *
 * Custom claims propagate on the next ID token refresh, which is up to
 * an hour by default. Call `refresh()` right after creating a new org
 * or accepting an invite to pick up changes immediately.
 */
export function useUserOrgs() {
  const { user, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState(null);

  const read = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setOrgs({});
      return;
    }
    try {
      const result = await user.getIdTokenResult(forceRefresh);
      setOrgs(result?.claims?.orgs || {});
    } catch {
      setOrgs({});
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    read(false);
  }, [authLoading, read]);

  return {
    orgs,
    loading: orgs === null,
    refresh: () => read(true)
  };
}
