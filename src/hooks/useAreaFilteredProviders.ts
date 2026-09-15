// src/hooks/useAreaFilteredProviders.ts
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listProviders, getHomeownerAreas } from '@/services/roleService';
import { providerCoversAny } from '@/utils/areas';
import { ProviderProfile } from '@/types';

/**
 * Loads service providers, keeping only those whose coverage overlaps the
 * homeowner's registered area(s).
 *
 * Falls back to showing everyone when either side hasn't set areas yet, so
 * accounts created before this feature keep working.
 */
export function useAreaFilteredProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [allProviders, setAllProviders] = useState<ProviderProfile[]>([]);
  const [myAreas, setMyAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, areas] = await Promise.all([
        listProviders(),
        user ? getHomeownerAreas(user.uid) : Promise.resolve([]),
      ]);
      setAllProviders(all);
      setMyAreas(areas);
      setProviders(all.filter((p) => providerCoversAny(p.serviceAreas, areas)));
    } catch (e) {
      console.log('useAreaFilteredProviders failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    /** Providers that cover the homeowner's area. */
    providers,
    /** Every provider, ignoring area — useful for an "show all" escape hatch. */
    allProviders,
    /** The homeowner's own registered areas. */
    myAreas,
    loading,
    reload: load,
  };
}
